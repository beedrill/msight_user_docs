# Tutorial
We offer a rich set of tutorial to manage many practical tasks for various of tasks in roadside digital infrastructure:

## Basic Usage
- [RTSP Streaming Tutorial](rtsp-streaming.md): A simple tutorial showing how to retrieve data using MSight from image sensors
- [UDP Server Tutorial](udp-server.md): A simple tutorial on setting up a UDP server node to receive bytes from UDP socket
- [Websocket Client Tutorial](websocket-client.md): A simple websocket tutorial to receive messages from a websocket server into MSight system.
- [Retrieving Velodyne Pointcloud](velodyne-pointcloud.md): A simple example on obtaining real time pointcloud from velodyne lidar.
- [Aggregating Images to Videos](aggregating-images.md): A simple example of aggregating image data in the MSight system into video data.
- [Receive Traffic Signal TSCBM](tscbm.md): Introduction on the TSCBM node that receives traffic signal information.

## Advanced Usage
- [Bring Your Own Node](byon.md): A simple example on how to write your own node.
- [Bring Your Own Node: Server](byon-server.md): An example on how to create your own server.
- [Bring Your Own Node: Custom Data](byon-custom-data.md): This tutorial focuses on creating custom data type.
- [Encoding Detection Results and Forward with RSU](encoding-and-ifm.md): This tutorial teaches the user how to setup MSight nodes to encode detection results and encode them into SAE3224 SDSM messages, and forward with V2X communications via RSU 

## Roadside Perception
- [Camera Roadside Object Detection Pipeline](camera-roadside-object-detection-pipeline.md): A full roadside object detection pipeline with cameras, including image retrieving, object detection, localization, sensor fusioin, tracking and estimation.
- [Lidar Roadside Object Detection Pipeline](lidar-roadside-object-detection-pipeline.md): A full roadside object detection pipeline with lidars, including pointcloud retrieval, merge, and object detection.

## Cloud
- [HTTP Uploader](http-uploader.md): A tutorial on receiving images from RTSP server, subsample and upload to an HTTP server. This is a simplest sensor data streaming model that can be used to deploy digital infrastructure that stream roadside sensors to the cloud.
- [Streaming Data with AWS Kinesis Stream](kinesis-stream.md): A tutorial on real-time streaming data with AWS Kinesis. 
- [Upload Aggregated Data to AWS S3](upload-s3.md): A tutorial on uploading data to the AWS S3 (storage service).

## Deployment
- [Roadside Deployment with Docker](deploy-with-docker.md): Deploy with Docker.
- [Roadside Deployment with Supervisor](deploy-with-supervisor.md): Deploy with Supervisor.
 