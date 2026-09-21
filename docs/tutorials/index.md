# Tutorial
We offer a rich set of tutorial to manage many practical tasks for various of tasks in roadside digital infrastructure. For all the tutorials, we offer step-by-step instructions, including prerequisite setup, configuration, and execution. The code examples are open-sourced in our [tutorials repository](https://github.com/michigan-traffic-lab/MSight_tutorials).
                                                              
## Basic Usage
- [RTSP Streaming Tutorial](tutorials/RTSPClient/README.md): A simple tutorial showing how to retrieve data using MSight from image sensors
- [UDP Server Tutorial](tutorials/UDPServer/README.md): A simple tutorial on setting up a UDP server node to receive bytes from UDP socket
- [Websocket Client Tutorial](tutorials/WebsocketClient/README.md): A simple websocket tutorial to receive messages from a websocket server into MSight system.
- [Retrieving Velodyne Pointcloud](velodyne-pointcloud.md): A simple example on obtaining real time pointcloud from velodyne lidar.
- [Aggregating Images to Videos](tutorials/aggregate_images/README.md): A simple example of aggregating image data in the MSight system into video data.
<!-- - [Receive Traffic Signal TSCBM](tscbm.md): Introduction on the TSCBM node that receives traffic signal information. -->

## Advanced Usage
- [Bring Your Own Node](tutorials/bring_your_own_node/README.md): A simple example on how to write your own node.
- [Bring Your Own Node: Server](tutorials/bring_your_own_server_node/README.md): An example on how to create your own server.
- [Bring Your Own Node: Custom Data](tutorials/bring_your_own_node_custom_data/README.md): This tutorial focuses on creating custom data type.
- [Encoding Detection Results and Forward with RSU](../coming-soon.md): This tutorial teaches the user how to setup MSight nodes to encode detection results and encode them into SAE3224 SDSM messages, and forward with V2X communications via RSU.

## Roadside Perception
- [Camera Roadside Object Detection Pipeline](./tutorials/2d_perception_pipeline/README.md): A full roadside object detection pipeline with cameras, including image retrieving, object detection, localization, sensor fusion, tracking and estimation.
- [Lidar Roadside Object Detection Pipeline](../coming-soon.md): A full roadside object detection pipeline with lidars, including pointcloud retrieval, merge, and object detection.
- [Multi-Sensor Data Collection](multi-sensor-data-collection.md): A tutorial on collecting real-time data from multiple sensors in a field experiment for further analysis.

## Cloud

!!! tip "These are minimum, build-it-yourself examples"
    The cloud tutorials below are **minimum examples** for users who want to handle the data themselves and build their cloud from the bottom up. They each set up one piece of the pipeline — an HTTP upload endpoint, a Kinesis stream, an S3 uploader — and leave everything above it to you.

    If you instead want a cloud that already provides in-depth integration with roadside and mobile devices, use **[MSight Cloud](../cloud-integration/msight-cloud.md)**. It deploys the whole edge-to-cloud path into your own AWS account with a single command: sensor ingestion, real-time WebSocket delivery to vehicles and mobile clients, SAE J2735 decoding, S3 archiving, location-aware client APIs and a management console.

    See the [Cloud Integration overview](../cloud-integration/index.md) for how the options compare.

- [Deploy MSight Cloud](../cloud-integration/msight-cloud.md): The recommended path — deploy the full MSight cloud platform, register your sensors, and point MSight Edge at it.
- [HTTP Uploader](tutorials/HTTPUpload/README.md): A tutorial on receiving images from RTSP server, subsample and upload to an HTTP server. This is a simplest sensor data streaming model that can be used to deploy digital infrastructure that stream roadside sensors to the cloud.
- [Streaming Data with AWS Kinesis Stream](tutorials/streaming_data_with_kinesis/README.md): A tutorial on setting up full real-time streaming data to cloud storage with AWS Kinesis, Firehose and S3.
- [Upload Aggregated Data to AWS S3](tutorials/s3_video_uploader/README.md): A tutorial on uploading data to the AWS S3 (storage service).

## Security
- [Setup MSight with Recommended Security Practice](tutorials/security_setup/README.md)

## Deployment
- [Roadside Deployment with Docker](../coming-soon.md): Deploy with Docker.
- [Roadside Deployment with Supervisor](../coming-soon.md): Deploy with Supervisor.
 