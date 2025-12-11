# 🧠 MSight Algorithms Overview

## 🚀 A Full Stack of Roadside Intelligence

MSight includes a **powerful suite of built-in algorithms** that enable perception, prediction, fusion, and safety analytics directly from roadside sensors.
These algorithms are modular, high-performance, and designed to run efficiently at the **edge**, in the **cloud**, or in **hybrid deployments**.

MSight’s algorithm stack currently includes:

* **2D object detection on fisheye/regular cameras**
* **3D object detection with LiDAR and camera fusion**
* **Multi-sensor fusion for unified world-frame perception**
* **Trajectory prediction using motion forecasting models**
* **Near-miss and crash risk detection**

Together, they provide a **comprehensive, end-to-end perception and safety pipeline** suitable for research, deployment, and production-scale intelligent infrastructure.


---

## 🎥 2D Object Detection

MSight supports **real-time 2D detection** using fisheye and standard cameras, using models such as **YOLOv12** or any custom lightweight camera models optimized for roadside scenes.

⟶ Learn more: **[2D Detection](det2d.md)**

---

## 📡 3D Detection

Using LiDAR, MSight provides detection algorithm that draws **3D bounding boxes** using BEV-based detection networks.

⟶ Learn more: **[3D Detection](det3d.md)**

---

## 🔄 Multi-Sensor Fusion

MSight includes Bayessian fusion strategies that fusion sensor data on **Trajectory-level**. This allow multi-camera + LiDAR deployments to produce a **single world-aligned perception output**.

!!! tip
    Earlier-stage fusion methods (such as point cloud merging) are typically handled *inside the detection pipeline itself*. Because of this design, MSight focuses on providing **late fusion** at the trajectory level, which is more flexible and sensor-agnostic.

⟶ Learn more: [**Advanced Sensor Fusion**](sensor-fusion.md)

---

## 🎯 Multi-Object Tracking

MSight employs **multi-object tracking (MOT)** to maintain **consistent object identities** across frames. We provide Simple Online Realtime Tracking (SORT).

⟶ Learn more: **[Tracking Algorithms](tracking.md)** *(coming soon)*

---

## 🛣️ Trajectory Prediction

MSight integrates **state-of-the-art motion forecasting models** to estimate future trajectories of vehicles and pedestrians.
Features include:

* Multi-modal predictions (multiple possible futures)
* Lane-aware motion prediction
* Gaussian mixture modeling for future distribution

⟶ Learn more: **[Prediction Algorithms](prediction.md)**

---

## ⚠️ Near-Miss Detection

The system provides **real-time safety analytics**, detecting Vehicle–vehicle and vehicle–VRU conflicts.

Algorithms can be seamlessly integrated into the MSight system to form a complete safety pipeline—for example, triggering **V2X warnings** or uploading safety events to the cloud.

⟶ Learn more: **[Near-Miss Detection](near-miss.md)**

---

## 📚 Continue Exploring

* **[2D Detection](det2d.md)**
* **[3D Detection](det3d.md)**
* **[Sensor Fusion](sensor-fusion.md)**
* **[Multi-Object Tracking](tracking.md)** *(coming soon)*
* **[Trajectory Prediction](prediction.md)**
* **[Near-Miss Detection](near-miss.md)**
---
