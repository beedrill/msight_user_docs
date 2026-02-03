## Deployment Strategies

MSight is designed around **modular, independent nodes** that can be composed flexibly to form a complete roadside perception and intelligence pipeline. In production environments, how these nodes are launched, managed, and monitored is critical for system robustness and maintainability.

This section outlines **recommended deployment strategies**, their trade-offs, and practical guidance for choosing the right approach.

---

## Containerized Deployment (Recommended)

**Run each MSight node in its own Docker container**, orchestrated using `docker compose`.

This is the **recommended deployment strategy** for most production and field deployments.

### Why containerized deployment works well

* **Simple installation & upgrades**
  All dependencies are packaged inside container images. Updating a node is as simple as pulling a new image and restarting the service.

* **Strong isolation**
  Each node runs in its own environment, avoiding Python package conflicts, CUDA mismatches, or system-level dependency issues.

* **Built-in robustness**
  Docker automatically handles process restarts, crash recovery, and lifecycle management through restart policies.

* **Operational visibility**
  Logs can be streamed directly to stdout and forwarded to cloud logging systems (e.g., AWS CloudWatch, ELK stack) without additional tooling.

* **Deployment consistency**
  The same `docker-compose.yml` can be reused across laptops, edge devices, and cloud instances, ensuring reproducibility.

### Typical setup

* One container per node (camera input, detector, localizer, tracker, publisher, etc.)
* A shared message bus (Redis / NATS / Kafka) running as a service
* A single `docker-compose.yml` file defining all services and volumes

### Considerations

* **Disk usage** is higher due to container images and layered filesystems
* **Slight runtime overhead** from containerization (usually negligible for perception workloads)

For modern edge devices and servers, these costs are generally acceptable and outweighed by operational simplicity.

---

## Local (Native) Deployment

**Run MSight nodes directly on the host system** using custom launch scripts or a process manager such as `supervisor` or `systemd`.

This approach may be suitable for constrained environments or advanced users who need fine-grained control.

### Benefits

* **Lower disk footprint**
  No container images or layered filesystems are required.

* **Slightly better performance**
  Nodes run directly on the host OS with no container abstraction.

* **Direct access to system resources**
  Useful in tightly controlled environments or when integrating with legacy systems.

### Drawbacks

* **Higher configuration complexity**
  Users must manually manage Python environments, CUDA versions, system libraries, and environment variables.

* **Weaker isolation**
  Dependency conflicts between nodes are more likely.

* **Manual robustness management**
  Restart policies, crash handling, and health monitoring must be configured explicitly.

Local deployment is best suited for **advanced users**, research prototypes, or environments where containerization is not feasible.

---

## Deployment Strategy Comparison

| Aspect                          | Containerized (Docker)                        | Local (Supervisor / Scripts)          |
| ------------------------------- | --------------------------------------------- | ------------------------------------- |
| **Ease of deployment**          | ⭐⭐⭐⭐☆ – minimal setup with `docker compose`   | ⭐⭐☆☆☆ – requires custom scripts       |
| **Operational robustness**      | ⭐⭐⭐⭐☆ – restart & lifecycle handled by Docker | ⭐⭐☆☆☆ – depends on user configuration |
| **Isolation & reproducibility** | ⭐⭐⭐⭐☆ – strong environment isolation          | ⭐⭐☆☆☆ – shared host environment       |
| **Disk usage**                  | Higher                                        | Lower                                 |
| **Runtime performance**         | Slightly lower                                | Slightly higher                       |
| **Scalability**                 | ⭐⭐⭐⭐☆ – easy to add/remove nodes              | ⭐⭐☆☆☆ – manual scaling                |

---

## Recommended Best Practices

* **Production & field deployments**
  Use **containerized deployment** with Docker Compose. This provides the best balance of stability, maintainability, and operational clarity.

* **Edge devices with limited storage**
  Consider local deployment, but only if you are comfortable managing dependencies and process lifecycles.

* **Development & testing**
  Both approaches are valid. Docker is recommended when testing deployment parity with production systems.

MSight intentionally avoids enforcing a single deployment mechanism. Instead, it provides **clean, modular node interfaces** so users can integrate MSight into existing infrastructure while choosing the deployment strategy that best fits their operational constraints.
