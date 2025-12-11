# 📨 Pub/Sub Backend Configuration

MSight supports pluggable pub/sub backends to handle internal message distribution. The system provides three interchangeable options:

- **Redis**
- **NATS**
- **Kafka**

This allows you to select the most appropriate messaging backend based on your deployment environment and application needs.

---

## 🔧 Choosing the Backend

Set the backend using the environment variable:

```bash
export MSIGHT_PUBSUB_BACKEND=redis  # Options: redis, nats, kafka
```

If `MSIGHT_PUBSUB_BACKEND` is unset, the system defaults to:

```text
redis
```

---

## 🧪 Usage

### NATS
To use nats backend, specify the following environment variables:
```bash
export MSIGHT_PUBSUB_BACKEND=nats
export MSIGHT_NATS_SERVERS="['nats://localhost:4222']"
```

If you want to use queue to group subscriber, in your node configs, pass in a `group_id`:
```python
configs = NodeConfig(group_id=queue_id_you_want)
```

### Kafka
To use Kafka backend, specify the following environment variables:
```bash
export MSIGHT_PUBSUB_BACKEND=kafka
export MSIGHT_KAFKA_SERVERS="['localhost:9092']"
```

> ⚠️ Redis requires no additional configuration if it's running on the default port locally.

---

## 📊 Comparison of Pub/Sub Backends

| Feature                        | Redis             | NATS                  | Kafka                      |
|-------------------------------|-------------------|------------------------|----------------------------|
| **Persistence**               | ❌ No              | ❌ No                | ✅ Yes                     |
| **Delivery Guarantee**        | ❌ Best-effort     | ❌ Best-effort         | ✅ At-least-once           |
| **Message Routing**           | Broadcast          | Broadcast or Queue Group | Queue Group (`group.id`)   |
| **Supports Load Balancing**   | ❌ No              | ✅ with specified group_id in node configs       | ✅        |
| **Subscribers Get All Messages** | ✅ Always       | ✅ (unless grouped)    | ❌ Only one per group      |
| **Latency**                   | ⚡ Very low        | ⚡ Very low            | 🐢 Higher (but scalable)   |
| **Setup Complexity**          | 🟢 Easiest         | 🟡 Moderate            | 🔴 Most complex            |
| **Recommended Use Case**      | Dev/test, simple messaging | Real-time sensor streaming | Durable, high-throughput pipelines |

---

## ✅ Recommendations

### Use **Redis** when:
- You want a quick, minimal setup.
- You are handling few sensors and the volume of messages, number of subscribers is not large
- Or you are working in a **local dev/test** environment.

### Use **NATS** when:
- You need **low-latency**, high-performance message delivery.
- You want optional **load balancing** via **queue groups**.
- You don't need message persistence or replay.

### Use **Kafka** when:
- You need **durable**, **replayable** messaging.
- You have multiple services consuming from the same stream with coordination.
- You're running a **high-volume production pipeline**.

---
