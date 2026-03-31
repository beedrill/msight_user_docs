# Data Model

Every piece of information that flows through an MSight pipeline — a camera frame, a LiDAR scan, a list of detected road users, an encoded video clip — is wrapped in a **data object**. This document explains what those objects are, how they fit together, and how you would use them when building or extending an MSight pipeline.

---

## The core idea: everything is a `Data`

At the heart of the data model is a single base class, `Data`. Any value that a node publishes or receives is a `Data` subclass. The main things `Data` gives you are:

- **A type tag.** Every object carries a `data_type` string that uniquely identifies its class. This means a subscriber can always reconstruct the right Python object from a raw message, even without knowing in advance what was sent.
- **Automatic serialization.** Every `Data` object can be converted to a Python dict, a JSON string, or compact MessagePack bytes with a single method call (`to_dict()`, `to_json()`, `serialize()`). The reverse direction — `from_dict()`, `from_json()`, `deserialize()` — works equally well.
- **Custom per-field codecs.** Some fields (e.g. NumPy arrays, nested objects) can't be trivially serialized. `Data` lets you attach a `FieldCodec` to any field to control exactly how it is encoded and decoded, without changing the rest of the serialization pipeline.

You will rarely interact with `Data` directly. Instead, almost everything extends its sensor-aware subclass, `SensorData`.

---

## `SensorData` — the common language of all sensor messages

`SensorData` extends `Data` with the metadata fields that are relevant for any measurement coming from a physical sensor:

| Field | Type | What it means |
|---|---|---|
| `sensor_name` | `str` | Which sensor produced this message (e.g. `"front_cam"`, `"lidar_top"`) |
| `capture_timestamp` | `float` | When the sensor captured the measurement (POSIX seconds) |
| `creation_timestamp` | `float` | When the data object was created in software |
| `frame_id` | `int` | A globally unique, monotonically increasing ID for this frame, generated using a Snowflake-like algorithm |
| `device_name` | `str` | The name of the edge device running the pipeline, read from the `MSIGHT_EDGE_DEVICE_NAME` environment variable |

Every concrete sensor type described below inherits these fields. When two nodes in a pipeline need to match an image to its detection result, or order frames chronologically, they use these shared fields.

---

## Concrete data types

### `BytesData` — raw binary payloads

The simplest form of sensor data. It wraps an opaque `bytes` value alongside the standard sensor metadata and nothing more. This is what you get when a UDP server node receives a datagram it does not know how to interpret yet, or when a WebSocket client receives a raw binary frame. It is also a useful intermediate representation when building custom protocol adapters.

```python
from msight_core.data import BytesData

msg = BytesData(data=b"\x00\x01\x02", sensor_name="my_sensor")
```

---

### `ImageData` — camera frames

`ImageData` carries a single image from a camera sensor. The image is stored as encoded bytes (JPEG by default) so it is compact for transport, but you can also store it as raw bytes if you prefer to avoid re-encoding.

The most convenient way to create an `ImageData` is from a NumPy array using `from_ndarray()`. The constructor lets you control JPEG quality and whether encoding should happen at all:

```python
from msight_core.data import ImageData

frame = ImageData.from_ndarray(
    image=my_numpy_frame,
    sensor_name="front_cam",
    jpeg_quality=75,
)
```

To get the image back as a NumPy array for display or further processing, call `to_ndarray()`. If the image happens to also carry detection bounding boxes (via an attached `DetectionResultsData`), many sink nodes will automatically overlay those boxes on the raw frame.

Key fields:

| Field | What it holds |
|---|---|
| `image` | Encoded (JPEG or similar) or raw image bytes |
| `is_encoded` | `True` when bytes are a compressed image format; `False` for raw |
| `size` | Original `(height, width, channels)` — needed to reconstruct raw numpy bytes |
| `detection_results` | Optional bounding-box results attached to this frame |

---

### `DetectionResultsData` — bounding boxes and object detections

When an object detector runs on an image, the output is wrapped in `DetectionResultsData`. It links a structured detection result (bounding boxes, class labels, confidence scores, from the `msight_base` library) back to the source frame via the `sensor_frame_id` and optionally keeps a reference to the original `raw_sensor_data` (e.g., the source `ImageData`).

This design means downstream consumers — a tracker, a V2X encoder, a visualizer — only need to subscribe to this one type and they have everything they need: what was detected, and which frame it came from.

Key fields:

| Field | What it holds |
|---|---|
| `detection_result` | The structured detection output (`DetectionResultBase` from `msight_base`) |
| `raw_sensor_data` | Optional reference to the originating sensor message |
| `sensor_frame_id` | Frame ID linking this result back to its source image |

---

### `RoadUserListData` — tracked road users

Once detections have been localized and tracked, they become `RoadUserListData`. Each item in `road_user_list` is a `RoadUserPoint` from the `msight_base` library — a geo-referenced object with position, velocity, class, and other attributes.

This is the data type that feeds into downstream V2X encoding (e.g., SDSM messages) and map visualization. If you are building anything that reasons about where road users are in the world, this is the type you will be consuming.

Key fields:

| Field | What it holds |
|---|---|
| `road_user_list` | A list of `RoadUserPoint` objects, each representing one tracked road user |

---

### `PointCloudData` — LiDAR scans

`PointCloudData` holds a single LiDAR sweep as a structured NumPy array. Each point carries fields like `x`, `y`, `z`, `intensity`, `ring`, `time`, and `return_type`, matching the output of Velodyne-family sensors.

Because point clouds can be large — a full VLP-32C sweep is roughly 700,000 bytes of raw structured data — the data object uses **Zstandard compression** transparently during serialization. The NumPy dtype description is also serialized as a small JSON header alongside the data, so the exact field layout is always preserved through the wire and back into a properly typed NumPy array without any manual bookkeeping.

```python
from msight_core.data import PointCloudData

pc = PointCloudData.from_ndarray(
    points=structured_numpy_array,
    sensor_name="lidar_top",
    capture_timestamp=1711900800.0,
)
```

Key fields:

| Field | What it holds |
|---|---|
| `points` | Structured NumPy array with named per-point fields |
| `dtype` | Serialized dtype descriptor (managed automatically) |
| `compress_level` | Zstandard compression level used during serialization |

---

### `VideoData` — encoded video clips

`VideoData` holds an encoded video segment (typically MP4) produced by aggregating multiple image frames. It keeps the list of original `frame_ids` and `capture_timestamps` so that the video can always be mapped back to the individual frames it was assembled from — important for archiving and post-processing.

Video encoding itself happens in nodes like `ImageToVideoAggregatorNode`; `VideoData` is purely the container that holds the result.

Key fields:

| Field | What it holds |
|---|---|
| `video` | Encoded video bytes (e.g. MP4 / H.265) |
| `frame_ids` | Ordered list of frame IDs included in this clip |
| `capture_timestamps` | Ordered list of per-frame capture timestamps |
| `detection_results` | Optional detection data associated with the video |

---

### `SensorDataSequence` — a batch of sensor messages

Sometimes you want to package multiple sensor messages together — for example, a window of detections to be uploaded to S3 as a single JSON file. `SensorDataSequence` is a simple wrapper around a list of `Data` objects. The list may be heterogeneous, so you can mix different message types in a single sequence if needed.

```python
from msight_core.data import SensorDataSequence

seq = SensorDataSequence(
    sensor_name="front_cam",
    obj_list=[frame1, frame2, frame3],
)
```

---

## How the pieces fit together

In a typical camera-based pipeline the data objects flow like this:

```
RTSPSourceNode
    └─ publishes ImageData

YoloDetectorNode (Vision module)
    └─ subscribes ImageData
    └─ publishes DetectionResultsData

SortTrackerNode (Vision module)
    └─ subscribes DetectionResultsData
    └─ publishes RoadUserListData

SDSMEncoderNode
    └─ subscribes RoadUserListData
    └─ publishes BytesData (encoded SDSM message)

IFMSinkNode
    └─ subscribes BytesData
    └─ forwards to RSU over UDP
```

Each arrow in that chain is a pub/sub message carrying one of the types described in this document. Because they all share the `Data` serialization contract, any node can also be replaced with a recording sink, a debug viewer, or a cloud uploader without touching the rest of the pipeline.

---

## Serialization quick reference

All `Data` objects support the same serialization API:

```python
# To bytes (compact, MessagePack)
raw = obj.serialize()
obj2 = Data.deserialize(raw)

# To/from JSON string
json_str = obj.to_json()
obj3 = Data.from_json(json_str)

# To/from Python dict
d = obj.to_dict()
obj4 = Data.from_dict(d)
```

The `data_type` tag embedded in every dict/JSON/bytes payload means you always get back the correct concrete class, even when calling `Data.from_dict()` on the base class.
