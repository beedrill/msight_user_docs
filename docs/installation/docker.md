# Docker Installation

The **local installation** method can vary depending on the operating system and development environment, sometimes introducing compatibility or dependency issues.  
For streamlined, reproducible, and platform-independent deployment, it is recommended to use the **Docker installation** method.

---

## 🧱 Overview

**MSight-Core** provides pre-built Docker images published under  
`michigantrafficlab/msight-core` on Docker Hub.  

**MSight-Vision** provides pre-built Docker images published under  
`michigantrafficlab/msight-vision` on Docker Hub, this comes with two version, the full version has the gpu support and the compact version is for CPU-only environments.

> 💡 **Tip:** Use the `cpu` version for CPU tasks such as the tracking and state estimation node if you want to minimize resource usage.

---

## 🐳 Pulling Pre-built Images

To pull the full version of the MSight-Core image:

```bash
docker pull michigantrafficlab/msight-core:latest
```


Once downloaded, you can start a container based on the image:

```bash
docker run -it --rm michigantrafficlab/msight-core:latest
```

This command launches an interactive session inside the container.

---

