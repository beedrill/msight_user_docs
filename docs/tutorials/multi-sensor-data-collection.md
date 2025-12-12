# 📡 Multi‑Sensor Data Collection (Setup Field Experiment)

This tutorial shows how to run a multi‑sensor data collection experiment using MSight. We use two Velodyne LiDARs and two RTSP image sensors as an example. Follow the steps to launch receivers, visualize live data, and save pointclouds and images for offline processing.

## 🧰 Prerequisites

- Docker (to run Redis and NATS for local pub/sub testing)
- MSight installed
- Network connectivity to the sensors

Start Redis and NATS (example using Docker):

```bash
# start redis
docker run -d --name redis-server -p 6379:6379 redis:latest

# start nats (adjust mount path for your nats.conf)
docker run -d --name nats-server -p 4222:4222 -p 8222:8222 -v $(pwd)/nats.conf:/etc/nats/nats.conf nats:latest -c /etc/nats/nats.conf
```

Set the MSight pub/sub backend to NATS. In bash:

```bash
export MSIGHT_PUBSUB_BACKEND=nats
export MSIGHT_NATS_SERVERS="['nats://localhost:4222']"
```

If you are on Windows (cmd.exe), use:

```cmd
set MSIGHT_PUBSUB_BACKEND=nats
set MSIGHT_NATS_SERVERS=["nats://localhost:4222"]
```

## 🔌 Hardware mapping (this example)
This part depends on your specific setup. In this example, we have:
- Velodyne 1 (control): forward to — port 2369, telemetry 8309 `(sensor name: mcity_velodyne_1)`
- Velodyne 2 (control): forward to — port 2368, telemetry 8308 `(sensor name: mcity_velodyne_2)`
- RTSP camera 1: rtsp://rtsp/url/1 `(sensor name: gs_mcity_1)`
- RTSP camera 2: rtsp://rtsp/url/2 `(sensor name: gs_mcity_2)`

Adjust IPs, ports and sensor names to match your setup.

## 🚀 Step 1 — Launch Velodyne LiDAR receiver nodes

Run one receiver per LiDAR. Example commands for the two VLP32C units:

```bash
msight_launch_velodyne_lidar \
  --port 2369 --telemetry-port 8309 \
  -pt lidar-topic -n msight-lidar-1 \
  --sensor-name mcity_velodyne_1 --model-id VLP32C

msight_launch_velodyne_lidar \
  --port 2368 --telemetry-port 8308 \
  -pt lidar-topic -n msight-lidar-2 \
  --sensor-name mcity_velodyne_2 --model-id VLP32C
```

What the important flags mean:

- --port / --telemetry-port: UDP ports used by the Velodyne data and telemetry channels
- -pt / --publish-topic: topic to publish pointcloud messages to (e.g. `lidar-topic`)
- -n / --name: node name in MSight
- --sensor-name: logical sensor name included in messages
- --model-id: Velodyne sensor model identifier used by MSight parsers, use `-h` to see full list

Each node will publish pointcloud messages to the specified topic. Verify the nodes are running and publishing by checking MSight logs or the NATS monitoring UI (if available).

## 👀 Step 2 — Live Visualize pointclouds (optional)

You don't have to do visualization, but if you want to see if your sensor is working, use the MSight pointcloud viewer to inspect each lidar in real time. You can filter by sensor name:

```bash
msight_launch_pointcloud_viewer --name pc_viewer -st lidar-topic --filter-sensor-name mcity_velodyne_1
msight_launch_pointcloud_viewer --name pc_viewer2 -st lidar-topic --filter-sensor-name mcity_velodyne_2
```

Open both viewers (on separate machines or windows) to compare the two LiDAR perspectives.

## 💾 Step 3 — Save pointclouds to disk

To record pointclouds for later processing, run the local dumper and point it at the same topic. Example:

```bash
msight_launch_pointcloud_local_dumper \
  -st lidar-topic \
  --output-folder-path ~/your/output/folder/path \
  --name pc_dumper
```

Notes:
- The dumper will write files under the specified folder. The actual data path of each pointcloud file (`.pcd`) will be `output-folder-path/date/hour/sensor_name/timestring.pcd`.

## 📷 Step 4 — Launch RTSP image capture nodes

Start one RTSP node per camera. Example:

```bash
msight_launch_rtsp --url rtsp://rtsp/url/1 --sensor-name gs_mcity_1 --publish-topic rtsp_topic --name rtsp1
msight_launch_rtsp --url rtsp://rtsp/url/2 --sensor-name gs_mcity_2 --publish-topic rtsp_topic --name rtsp2
```

Each RTSP node publishes image frames to `rtsp_topic`. Adjust URLs and sensor names to match your cameras.

## 🔍 Step 5 — Live View images (optional)

View incoming images and filter by sensor name:

```bash
msight_launch_image_viewer -n image_viewer_1 --subscribe-topic rtsp_topic --filter-sensor-name gs_mcity_1
msight_launch_image_viewer -n image_viewer_2 --subscribe-topic rtsp_topic --filter-sensor-name gs_mcity_2
```

Run one viewer per camera to see live feeds.

## 💾 Step 6 — Save images to disk

Record images to disk using the image dumper:

```bash
msight_launch_image_local_dumper --name image_dumper --subscribe-topic rtsp_topic --output-folder-path ~/your/output/folder/path
```

This command will save images from all sensors publishing to `rtsp_topic`.

## 🛠️ Troubleshooting & tips

- If you see no data on a topic, confirm the topic name you subscribe matches the published topic name.
- For large-scale captures, ensure your disk IO and network have enough capacity to avoid dropped frames/packets.

## 🧠 Summary

This guide demonstrated launching two Velodyne LiDAR receiver nodes and two RTSP image capture nodes, how to visualize their live streams, and how to save data to disk for later analysis. Adjust ports, URLs, topics and folder paths to fit your experiment and always run each sensor node in its own terminal so you can monitor logs.

✨ Happy data collecting!
