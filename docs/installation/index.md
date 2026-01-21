# Installation Overview

Welcome to the **MSight installation guide**.

MSight supports **three installation methods**, covering both local (native) setups and containerized deployments.

---

## 🧰 Installation Methods

### 1. Install with `pip` (Local, Recommended for Users)

Use this method if you want to:

* Quickly run MSight on a local machine
* Use MSight as a library or executable without modifying the source code
* Deploy MSight on a resource‑constrained or storage‑compact system
* Integrate MSight into an existing Python workflow

This is the **simplest and fastest** way to get started. The package is installed directly from PyPI and managed by your Python environment.

➡️ See: [Pip Installation](pip.md)

---

### 2. Install from Source (Local, Recommended for Developers)

Use this method if you want to:

* Develop new MSight modules or algorithms
* Modify core system logic or configuration schemas
* Debug internal components
* Contribute to MSight development

In this setup, you clone the MSight repository and install it in editable (development) mode. This provides full access to the source code and enables rapid iteration.

➡️ See: [Source Installation](source.md)

---

### 3. Docker-based Installation (Recommended for Deployment)

Use this method if you prefer:

* A **containerized, reproducible environment**
* Consistent behavior across Linux, macOS, and Windows
* Simplified dependency management
* Deployment on servers, edge devices, or cloud infrastructure in **standard, most recommended way**

This setup is recommended for **production deployments**, demonstrations, and environments where system consistency and isolation are critical.

➡️ See: [Docker Installation](docker.md)

---

Next: [Pip Installation →](pip.md)
