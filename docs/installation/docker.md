# Docker Installation

The **local installation** method can vary depending on the operating system and development environment, sometimes introducing compatibility or dependency issues.  
For streamlined, reproducible, and platform-independent deployment, it is recommended to use the **Docker installation** method.

---

## 🧱 Overview

**MSight-Edge** provides pre-built Docker images published under  
`michigantrafficlab/msight-edge` on Docker Hub.  
Different image tags are available to accommodate various deployment needs.

| Tag | Description |
|-----|--------------|
| `latest` | Full-featured image including all perception algorithms and GPU support. Ideal for full MSight deployment on edge hardware with GPU. |
| `latest-compact` | Minimal image without perception modules or GPU dependencies. Designed for data collection, sensor streaming, and cloud integration where heavy computation is not required. |

> 💡 **Tip:** Use the `latest-compact` version if your edge device is primarily used for data streaming or you want to minimize resource usage.

---

## 🐳 Pulling Pre-built Images

To pull the full version of the MSight-Edge image:

```bash
docker pull michigantrafficlab/msight-edge:latest
```

For the compact version:

```bash
docker pull michigantrafficlab/msight-edge:latest-compact
```

Once downloaded, you can start a container based on the image:

```bash
docker run -it --rm michigantrafficlab/msight-edge:latest
```

This command launches an interactive session inside the container.

---

## 🏗️ Building the Docker Image from Source

In some cases, you may need to build the Docker image directly from the **MSight source repository** (for example, when customizing code or modifying dependencies).

1. Clone the repository (if not already done):

   ```bash
   git clone https://github.com/your-org/msight.git
   cd msight
   ```

2. Build the Docker image:

   ```bash
   docker build        -f docker/DOCKERFILE        -t msight-img        --build-arg USER_ID=$(id -u)        --build-arg GROUP_ID=$(id -g) .
   ```

   - `-f docker/DOCKERFILE`: specifies the Dockerfile path  
   - `--build-arg USER_ID` / `GROUP_ID`: ensures proper user permissions inside the container  

3. Once built, you can run MSight within the image:

   ```bash
   docker run -it --rm msight-img <your MSight command>
   ```

   Replace `<your MSight command>` with the actual Python script or command you wish to execute.

---

## ⚙️ Example Usage

To start the MSight Edge process inside the container:

```bash
docker run --gpus all -it --rm     -v $(pwd)/config:/app/config     michigantrafficlab/msight-edge:latest     python msight_edge/main.py --config config/edge_config.yaml
```

> ⚠️ Make sure your system has **Docker** (and **NVIDIA Container Toolkit** if GPU support is needed) installed before running GPU-enabled containers.

---

## 📚 Next Steps

- [Installation Overview](index.md)
- [System Architecture](../architecture/index.md)
