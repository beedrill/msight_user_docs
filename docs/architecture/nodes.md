# MSight Core — Nodes

Nodes are the building blocks of an MSight pipeline. Each node does one focused job — reading from a sensor, transforming data, or writing somewhere — and hands its output off to the next node through a pub/sub topic. You build a pipeline by connecting nodes together; the framework handles the messaging, heartbeats, and process lifecycle automatically.

This document introduces the four categories of nodes, explains the base classes you extend when writing your own, and describes what each built-in node does and when you would reach for it.

---

## How nodes work

Every node, regardless of type, does a few things by default when it starts up:

- It **registers itself in Redis** so the system knows it is running.
- It **starts a background heartbeat** to signal that it is still alive.
- It **connects to the pub/sub backend** you have configured via the `MSIGHT_PUBSUB_BACKEND` environment variable. The supported backends are `redis`, `nats`, and `kafka`.

Beyond that, behavior depends on whether the node is a source, a processor, or a sink.

---

## Base classes

You will not instantiate these classes directly, but understanding them helps you know which one to subclass when you want to write a custom node.

### `Node`

The root of the hierarchy. Every node in MSight extends this class, whether or not it is a source, processor, or sink. It owns the registration, heartbeat, and backend-connection logic. When you write a custom node, you never subclass `Node` directly — you pick one of the more specific bases below.

---

### `SourceNode`

A source node introduces new data into the pipeline. It runs a loop that calls `get_data()` repeatedly and publishes whatever is returned to its configured topic. If you are connecting a new sensor or data feed to MSight, this is the base class to use. Implement `get_data()` to return a `Data` object on each call.

---

### `AsyncSourceNode`

An async variant of `SourceNode` for situations where your data source is inherently non-blocking — for example, a WebSocket connection or any other `asyncio`-based I/O. It runs inside an `asyncio` event loop so you can `await` network operations without blocking. You implement `_recv_once()` as an async method that returns the next message, and optionally `_async_setup()` to open connections before the loop starts.

---

### `ServerSourceNode`

An abstract base for source nodes that act as servers — they bind to a port and wait for incoming connections or datagrams rather than actively polling. Subclasses implement `initialize()` to set up the server socket and bind a message handler, and `serve()` to run the server loop. The built-in UDP server node uses this as its foundation.

---

### `DataProcessingNode`

A processing node sits in the middle of a pipeline. It subscribes to an input topic, receives each message, and publishes a transformed result to an output topic. Implement `process(data)` to define the transformation. If `process()` returns `None`, nothing is published for that message, which is useful for filtering or buffering logic.

---

### `SinkNode`

A sink node is the terminal end of a pipeline. It subscribes to a topic and consumes each message — writing it to disk, sending it somewhere, or displaying it — but never publishes anything onward. Implement `on_message(data)` to define what happens with each received message.

---

## Source nodes

Source nodes are where data enters the pipeline. Each one wraps a different kind of sensor or data feed.

### `RTSPSourceNode`

This node connects to a camera over RTSP and continuously publishes frames as `ImageData`. It uses PyAV under the hood for robust stream handling, including automatic reconnection when the stream drops.

If you are working with IP cameras — traffic cameras, road-side units, or any camera that exposes an RTSP URL — this is your starting point. TCP transport is the default and works well in most network environments; switch to UDP if your network setup requires it. You can also pass a `resize_ratio` to scale down frames before they enter the pipeline, which is useful when downstream processing is compute-constrained.

| Parameter | Description |
|---|---|
| `url` | RTSP stream URL |
| `rtsp_transport` | `"tcp"` (default) or `"udp"` |
| `resize_ratio` | Optional scale factor applied to each frame before publishing |

---

### `LocalImageSourceNode`

A lightweight source that publishes images from a local file or directory, designed for testing pipelines without a live sensor. Point it at a directory of `.jpg` or `.png` files and it will cycle through them in order at your chosen frame rate, publishing each one as `ImageData`. You can also point it at a single image if you want to repeatedly test a fixed frame.

| Parameter | Description |
|---|---|
| `image_path` | Path to an image file or directory of images |
| `fps` | Publish rate in frames per second (default: `10`) |

---

### `DownloadedImagePlayerSourceNode`

When you want to replay a previously recorded MSight dataset rather than pulling from a live sensor, this node handles the playback. It reads data downloaded with the `msight_download_data` CLI tool, preserves the original capture timestamps, and supports multi-sensor datasets by synchronizing all sensors to the timeline of the primary sensor you designate.

| Parameter | Description |
|---|---|
| `root` | Root directory of the downloaded dataset, with per-sensor subdirectories |
| `fps` | Playback rate (default: `10`) |
| `primary_sensor` | The sensor whose timestamps drive synchronization across all others |
| `time_mode` | `"local"` for wall-clock playback, or timestamp-driven replay |

---

### `UdpServerSourceNode`

A general-purpose UDP server that binds to a port, receives datagrams, and publishes each one as `BytesData`. It is the right choice when you have a device that pushes binary data over UDP but you have not yet written a dedicated decoder for it — the raw bytes land in the pipeline and you can process them downstream. It supports both IPv4 and IPv6.

| Parameter | Description |
|---|---|
| `host` | Address to bind to (default: `"0.0.0.0"`) |
| `port` | UDP port to listen on |
| `ipv6` | Set to `True` to use an IPv6 socket (default: `False`) |

---

### `VelodyneLidarSourceNode`

A specialization of `UdpServerSourceNode` that decodes Velodyne LiDAR packets on the fly and publishes full point clouds as `PointCloudData`. Each UDP packet coming from the sensor contains a partial sweep; this node accumulates packets until a full 360° rotation is assembled, then publishes the resulting structured NumPy array to the pipeline.

It supports the full range of Velodyne models through the `velodyne_decoder` library — from the 16-beam VLP-16 up to the 128-beam VLS-128.

| Parameter | Description |
|---|---|
| `host` | Address to bind to |
| `port` | Velodyne data port (typically `2368`) |
| `model_id` | Velodyne model string, e.g., `"VLP32C"`, `"VLP16"`, `"HDL64E_S3"` |
| `telemetry_port` | Optional port for telemetry packets |
| `ipv6` | Enable IPv6 (default: `False`) |

---

### `WebSocketClientSourceNode`

Connects to a WebSocket server and publishes every received message as `BytesData`. It is built on `AsyncSourceNode` so it handles the event loop and connection management automatically. Both text frames (encoded as UTF-8) and binary frames are supported. If the connection drops, the node logs a warning and shuts down cleanly.

This node is useful when integrating with web-based data sources or any system that exposes a WebSocket feed.

| Parameter | Description |
|---|---|
| `server_url` | WebSocket server URL, e.g., `"ws://host:port/path"` |

---

## Data processing nodes

Processing nodes transform data as it flows through the pipeline — aggregating, reordering, or re-encoding it before it reaches a sink.

### `AggregatorNode`

This node collects individual sensor messages into fixed-size batches. As messages arrive, it fills a per-sensor rolling buffer. Once the buffer reaches `buffer_size`, it packs the accumulated messages into a `SensorDataSequence` and emits it downstream, then slides the window forward by `buffer_size - overlap_size` items.

The overlap mechanism means consecutive batches share some frames at their boundaries, which matters for applications like video encoding or temporal analysis where context across window boundaries is important.

| Parameter | Description |
|---|---|
| `buffer_size` | How many messages to collect before emitting a batch |
| `overlap_size` | How many messages from the end of one batch are carried into the next |

---

### `BufferingSortNode`

Network jitter and multi-sensor synchronization can cause messages to arrive slightly out of order. This node smooths that out. It maintains a priority queue sorted by `event_timestamp` and only releases messages once the queue reaches capacity, always outputting the oldest one first.

If you are running a multi-camera or multi-lidar setup and notice that frames occasionally arrive out of sequence downstream, placing a `BufferingSortNode` early in the pipeline is an easy fix.

| Parameter | Description |
|---|---|
| `max_buffer_size` | How many messages to hold before releasing the oldest (default: `10`) |

---

### `ImageToVideoAggregatorNode`

Builds on `AggregatorNode` to turn a stream of individual image frames into encoded MP4 video clips. Once enough frames accumulate, it launches a background thread that encodes them using `imageio` and FFmpeg and publishes the resulting `VideoData` — without stalling the main pipeline while encoding is in progress.

This is the node to use when you want to archive camera footage to cloud storage efficiently, since sending one video file per 30 or 60 frames is far cheaper than uploading individual JPEGs.

| Parameter | Description |
|---|---|
| `buffer_size` | Number of frames per video clip |
| `overlap_size` | Frames shared between consecutive clips |
| `fps` | Output video frame rate (default: `30`) |
| `codec` | FFmpeg codec to use (default: `"libx265"`) |

---

### `SDSMEncoderNode`

Takes a list of tracked road users and encodes it into a **Sensor Data Sharing Message (SDSM)** — the V2X message format defined by SAE J3224 for sharing perception data between infrastructure and vehicles. The node maps MSight's internal object classes (vehicle, VRU, unknown) to the corresponding DSRC/C-V2X type codes, and computes geo-referenced offsets from a fixed reference point (the RSU location) for each road user.

The output is a `BytesData` containing the encoded SDSM binary, ready to be forwarded by an `IFMSinkNode` or `HttpSinkNode`.

| Parameter | Description |
|---|---|
| `reference_lat` | Latitude of the reference point used for geo-offset computation |
| `reference_lon` | Longitude of the reference point |
| `equipment_type` | RSU equipment type identifier included in the SDSM header |

---

## Sink nodes

Sink nodes are where data leaves the MSight pipeline — written to disk, pushed to the cloud, forwarded over the network, or displayed on screen.

### `AWSSequencePusherSinkNode`

Uploads each `SensorDataSequence` it receives to an AWS S3 bucket as a JSON file. The S3 key is automatically structured as `prefix/device/sensor/date/hour/start_end.json`, which makes it easy to navigate and partition archived data by time in Athena or similar tools.

| Parameter | Description |
|---|---|
| `bucket_name` | Target S3 bucket |
| `s3_prefix` | Optional prefix prepended to all S3 keys |
| `aws_region` | AWS region (default: `"us-east-1"`) |
| `use_dualstack_endpoint` | Enable the S3 dual-stack endpoint for IPv4/IPv6 access |

---

### `AWSVideoPusherSinkNode`

Uploads encoded video to S3 alongside a companion metadata JSON file. For each `VideoData` message it receives, it writes two objects: a `.mp4` file with the raw video bytes and a `_metadata.json` with all other fields (timestamps, frame IDs, sensor name) so the video can be precisely located in time without decoding the file.

| Parameter | Description |
|---|---|
| `bucket_name` | Target S3 bucket |
| `s3_prefix` | Optional key prefix |
| `aws_region` | AWS region (default: `"us-east-1"`) |
| `use_dualstack_endpoint` | Enable dual-stack endpoint |

---

### `BytesViewerSinkNode`

A simple diagnostic sink for inspecting raw `BytesData` messages. Every message it receives gets logged with its end-to-end latency, sensor name, and raw payload content. This is most useful when you are connecting a new UDP or WebSocket source and want to confirm that data is actually arriving and check its format before writing a decoder.

| Parameter | Description |
|---|---|
| `filter_sensor_name` | If set, only messages from this sensor are logged; others are silently discarded |

---

### `DetectionResultsSinkNode`

A diagnostic sink for detection pipelines. It logs the sensor name, timestamp, frame ID, and full object list for every `DetectionResultsData` message it receives. Useful during development when you want to quickly verify that a detector is producing reasonable outputs without setting up a visualizer.

---

### `HttpSinkNode`

Forwards messages as HTTP POST requests with a JSON body to any HTTP endpoint. This makes it straightforward to push MSight data into external systems — dashboards, analytics platforms, custom APIs — without any special integration work on either side.

For high-throughput deployments it supports sharding across multiple endpoint replicas using either random or sensor-name-based partition keys.

| Parameter | Description |
|---|---|
| `url` | Destination endpoint |
| `headers` | Optional extra HTTP headers (merged with `Content-Type: application/json`) |
| `partition_key_mode` | `"random"` (timestamp-based) or `"sensor_name"` |
| `shards` | Number of endpoint replicas for round-robin load distribution |

---

### `IFMSinkNode`

Sends **Infrastructure-to-Field Messages (IFM)** to a Roadside Unit over UDP. It prepends a fixed header (loaded from a file) to each incoming payload, then sends the combined message as a UDP datagram to the configured RSU address and port. IPv4 and IPv6 are both supported, and the correct socket family is auto-detected from the address you provide.

This is typically the last node in a V2X broadcast pipeline, receiving encoded SDSM bytes from `SDSMEncoderNode` and forwarding them to the RSU hardware.

| Parameter | Description |
|---|---|
| `header_file` | Path to a text file containing the IFM header string to prepend |
| `rsu_addr` | IP address of the RSU |
| `rsu_port` | UDP port on the RSU |
| `use_ipv6` | Override IPv6 detection (normally auto-detected from `rsu_addr`) |

---

### `ImageLocalDumperSinkNode`

Saves camera frames to disk in a time-organized directory structure: `output_folder/YYYY-MM-DD/HH/sensor_name/timestamp.jpg`. Each write happens in a background thread so disk I/O never stalls the pipeline. Both pre-encoded JPEG bytes and raw NumPy arrays are handled correctly.

| Parameter | Description |
|---|---|
| `output_folder_path` | Root directory under which all images are saved |

---

### `ImageViewerSinkNode`

Displays incoming camera frames in a live OpenCV window, one window per node instance. If the `ImageData` carries attached detection results, bounding boxes and object center points are drawn on the frame before it is shown — making this a convenient one-stop debug view for camera-plus-detector pipelines. You can filter to a single sensor if multiple cameras are flowing through the same topic.

| Parameter | Description |
|---|---|
| `filter_sensor_name` | If set, only frames from this sensor are displayed |

---

### `KinesisPusherSinkNode`

Publishes messages to an **AWS Kinesis Data Stream** as JSON records. Each `put_record` call runs in a background thread so it does not block the main processing loop. Supports round-robin sharding across multiple Kinesis shards using either random or sensor-name-based partition keys, which matters for throughput when you have multiple sensors feeding a high-volume stream.

| Parameter | Description |
|---|---|
| `stream_name` | Target Kinesis stream name |
| `partition_key_mode` | `"random"` or `"sensor_name"` |
| `shards` | Number of shards for sensor-name-based partitioning |

---

### `PointCloudLocalDumperSinkNode`

Saves LiDAR point clouds to disk in binary **PCD v0.7** format, preserving all Velodyne fields (`x`, `y`, `z`, `intensity`, `time`, `column`, `ring`, `return_type`). The PCD format is widely supported by tools like CloudCompare, PCL, and Open3D, so files saved here can be opened directly for offline analysis. Each write is offloaded to a background thread.

| Parameter | Description |
|---|---|
| `output_folder_path` | Root directory for saved `.pcd` files |

---

### `PointCloudViewerSinkNode`

Renders incoming LiDAR point clouds in a real-time **Open3D** window. You can colour the points either by ring index (useful for understanding scan geometry) or by intensity (useful for reflectivity analysis). An optional voxel downsampling step reduces the point count before rendering, which helps keep the frame rate smooth for dense sensors.

| Parameter | Description |
|---|---|
| `filter_sensor_name` | If set, only point clouds from this sensor are rendered |
| `voxel_downsample` | Voxel size in metres for downsampling, e.g. `0.1`; `None` disables |
| `color_mode` | `"ring"` for ring-index colormap, or `"intensity"` for grayscale |

---

### `VideoLocalDumperSinkNode`

Saves encoded video clips to disk alongside a companion metadata JSON file. For each `VideoData` it receives, it writes a `.mp4` under `save_dir/sensor_name/` and a `_metadata.json` with all non-video fields. This mirrors the structure used by `AWSVideoPusherSinkNode`, so you can develop and test archiving pipelines locally before switching to cloud storage.

| Parameter | Description |
|---|---|
| `save_dir` | Root directory under which video files and metadata are saved |
