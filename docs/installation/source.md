# Local Installation (From Source)

This section describes how to install **MSight** locally from source for development or advanced usage. This installation mode is recommended if you plan to modify MSight code, develop new modules, or contribute to the project.

---

## 🧰 Prerequisites

Before installing, ensure the following dependencies are available on your system:

* **Python 3.10 or later**
* **[Git](https://git-scm.com/)** – required for cloning the source repository
* **[Conda](https://docs.conda.io/en/latest/)** (optional but recommended) – for creating isolated Python environments

---

## 💻 Installation Steps

### 1. Clone the Repository

Clone the MSight source repositories from GitHub:

```bash
git clone https://github.com/michigan-traffic-lab/MSight_base.git
git clone https://github.com/michigan-traffic-lab/MSight_Core.git
```

---

### 2. (Optional) Create a Conda Environment

Using a dedicated environment is strongly recommended, especially for development and debugging:

```bash
conda create --name msight python=3.10
conda activate msight
```

---

### 3. Install MSight

MSight can be installed in **two different modes**, depending on whether you intend to *use* the system or *actively develop* it.

#### Option A: Standard Installation (Usage-Oriented)

Use this option if you want to run MSight locally without modifying its source code:

```bash
cd MSight_base
pip install .
cd ../MSight_Core
pip install .
```

This installs MSight as a regular Python package into the active environment.

---

#### Option B: Editable Installation (Development-Oriented)

Use this option if you plan to:

* Modify MSight source code
* Develop new modules or algorithms
* Debug internal components

```bash
cd MSight_base
pip install -e .
cd ../MSight_Core
pip install -e .
```

Editable mode ensures that any local code changes take effect immediately without reinstalling.

---

### 4. Set Your Edge Device Name (Mandatory)

MSight is designed to run on a **field-deployed edge machine**. Each running MSight instance must be assigned a **unique edge device name**, which is used as the identifier for the edge node in logging, messaging, and distributed coordination.

Set the device name using the following environment variable:

```bash
export MSIGHT_EDGE_DEVICE_NAME=msight_test
```

Replace `msight_test` with a meaningful identifier for your deployment (for example, an intersection name, site ID, or node label). For local testing or experimentation, a dummy name such as `msight_test` or `testing` is sufficient.

By default, this command sets the environment variable **only for the current terminal session**. If you open a new terminal or reboot the machine, the variable must be set again unless it is persisted.

#### Persisting the Configuration (Recommended)

To ensure MSight works consistently across terminal sessions and system reboots, persist the environment variable in your shell configuration.

**Bash / Zsh (Linux, macOS)**

```bash
echo 'export MSIGHT_EDGE_DEVICE_NAME=msight_test' >> ~/.bashrc
source ~/.bashrc
```

> If you are using **zsh**, replace `~/.bashrc` with `~/.zshrc`.

---

### 5. Verify Installation

Verify that MSight is installed correctly:

```bash
python -c "import msight_core; print(msight_core.__version__)"
```

If no errors occur, the installation was successful.
