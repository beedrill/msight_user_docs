# Buiding Docker container

MSight Edge offers a compact version and a full version of the container. The main difference between the two is that the compact version does not contain perception algorithms, and it works with a machine with only CPU (no GPU). The major purpose of this container is to collect and manage the data flow within the edge device.

## Building locally
### Building Compact version
Run the following command in the root of this project
```bash
docker build -t msight_edge2 -f docker/Dockerfile-compact .
```
