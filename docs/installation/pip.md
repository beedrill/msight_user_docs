# 📦 Installation via pip

This guide describes how to install **MSight** using Python packages. This method is ideal for compact edge boxes and rapid prototyping.

---

## 🧱 Core Installation (Minimum Setup)

To get started with MSight, install the foundational packages:

```bash
pip install msight-base msight-core
```

This provides the **minimum required setup** for MSight:

* 🧱 **msight-base**

  * Defines fundamental data structures and abstractions
  * Includes road users, points, trajectories, frames
  * Provides core utilities such as trajectory management and visualization

* ⚙️ **msight-core**

  * Provides the core roadside infrastructure
  * Sensor data receiving and streaming
  * Pub/Sub communication system
  * Data serialization and pipeline orchestration
  * Cloud integration capabilities
  * V2X communication support

👉 This setup is sufficient for running basic MSight pipelines and infrastructure.

---

## 🎥 2D Vision Support (Camera-based Perception)

If your deployment requires **camera-based perception** (RGB, fisheye, infrared), install:

```bash
pip install msight-base msight-core msight-vision
```

This adds:

* 🎥 **msight-vision**

  * Image-based object detection
  * Localization
  * Multi-object tracking
  * State estimation

👉 Required for all **2D sensor processing pipelines**.

---

## 🛰️ LiDAR Support (3D Perception)

If your deployment includes **LiDAR sensors**, install:

```bash
pip install msight-base msight-core msight-lidar
```

This adds:

* 🛰️ **msight-lidar**

  * 3D perception
  * Point cloud processing
  * BEV-based understanding (planned)

> ⚠️ Note: `msight-lidar` is currently under development and may not yet be publicly available.

---

## 🧠 Installation Philosophy

MSight follows a **modular installation strategy**:

* Install only what you need
* Keep edge deployments lightweight
* Enable flexible combinations of sensing modalities

| Use Case            | Installation                |
| ------------------- | --------------------------- |
| Core infrastructure | `msight-base + msight-core` |
| Camera perception   | `+ msight-vision`           |
| LiDAR perception    | `+ msight-lidar`            |

---

## ✅ Verification

After installation, verify your setup:

```python
import msight_base
import msight_core
```

Optional modules:

```python
import msight_vision
import msight_lidar
```


