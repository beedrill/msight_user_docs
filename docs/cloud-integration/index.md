# ☁️ MSight Cloud Integration Overview

MSight can integrate with the cloud in multiple ways depending on your application needs, data volume, real-time requirements, and your preferred cloud architecture.

!!! success "Recommended: deploy MSight Cloud"
    **[MSight Cloud](msight-cloud.md)** is the official open-source cloud platform for MSight, and the **recommended integration path for almost every deployment**. One `npm run deploy` into your own AWS account gives you sensor ingestion, real-time WebSocket distribution, S3 archiving, SAE J2735 decoding, client APIs and a management console — already wired together.

    ➡️ **[Get started with MSight Cloud](msight-cloud.md)**

    The other options on this page remain fully supported. Reach for them when you deliberately want a **minimal** cloud footprint, or when your environment rules out the managed services MSight Cloud builds on.

!!! tip
    MSight is theoretically compatible with AWS, GCP, Azure, Alibaba Cloud, Tencent Cloud, and others, but **AWS is the recommended and most fully supported option**. Other cloud environments will work as well, but users might manually implement or adapt certain pipeline components described in this documentation.

This page provides a clear overview of the **supported integration methods**, their **trade-offs**, and guidance on **when to choose what**.

---

## 🚀 Why Multiple Integration Methods?

Roadside perception workloads vary widely:

* Some deployments need **the full platform** — real-time distribution to vehicles, archiving, APIs and operations tooling
* Some only need **simple data archiving**
* Others require **high-throughput, real-time streaming** and nothing else
* Some teams prefer **AWS-native microservices**, while others want **cloud-agnostic Kafka-based infrastructure**

To support all deployment styles, MSight provides five integration paths:

1. **MSight Cloud** — the complete platform ⭐ *recommended*
2. **AWS Kinesis + Firehose + S3** (minimum AWS-native real-time pipeline)
3. **Direct S3 Uploads** (simple archiving)
4. **HTTP Endpoint** (flexible ingest method)
5. **Kafka / AWS MSK** (cloud-agnostic, portable streaming)

Below, we explain each option — choose the one which is right for you.

---

## ⭐ 1. MSight Cloud (Recommended)

**Best for:**

* Any deployment that wants the **full edge-to-cloud path** without building it
* Real-time delivery of warnings, SDSM and SPaT to vehicles and mobile clients
* Teams that want archiving **and** streaming managed together
* Deployments that need operations tooling — logs, metrics, alarms, cost breakdown
* Anyone who would otherwise assemble options 2–5 by hand

MSight Cloud is a single AWS CDK stack you deploy into **your own AWS account**. Each roadside data stream is registered as a logical **sensor**, and the platform provisions its ingestion path automatically: an ordered SNS FIFO topic fans out to a per-sensor SQS FIFO queue and a dedicated ECS Fargate consumer, which decodes, caches and broadcasts each message to nearby WebSocket clients. Data that does not need to be real-time is aggregated at the roadside and uploaded to S3 buckets the platform registers and monitors.

### ✔ Pros

* **One command to deploy** — the whole stack, including the management console
* Real-time **and** archival paths, per sensor, independently switchable
* Built-in **SAE J2735 / J3224** support: SDSM decoding, SPaT streaming, MAP lookup
* Location-aware **client APIs** with a live, always-current OpenAPI document
* **Admin console** for sensors, storage, apps, clients, logs, metrics, alarms and cost
* **MCP server** — operate the deployment from an AI assistant
* Runs entirely in your account; no data leaves it

### ✖ Cons

* More AWS resources than a minimum pipeline, so a higher floor on cost
* AWS-specific (CDK, Aurora, ElastiCache, ECS, SNS/SQS)
* More to understand up front than a single Kinesis stream

### Documentation

➡️ **[MSight Cloud Setup Guide](msight-cloud.md)**
➡️ [Source on GitHub](https://github.com/michigan-traffic-lab/msight-cloud)

---

## 🔥 2. AWS Kinesis + Firehose + S3 (minimum AWS-native pipeline)

**Best for:**

* Real-time ingestion with **minimum** AWS surface area
* Simple but scalable streaming from MSight Edge
* Users who want an "AWS-native" architecture they assemble themselves
* Users planning to plug in more AWS services over time
* Easy and integrated monitoring

How it fits together:

* **Kinesis Data Streams** receives live data from MSight Edge
* **Firehose** batches, transforms, and partitions
* **S3** stores data in efficient, queryable formats

!!! tip "Consider MSight Cloud first"
    This is the **minimum real-time streaming pipeline** for MSight — raw ingestion and storage, and nothing else. It is a good fit if that is genuinely all you need.

    If you want real-time delivery to vehicles, SAE J2735 decoding, client APIs, or operations tooling, you would end up building those on top of this pipeline yourself — which is exactly what **[MSight Cloud](msight-cloud.md)** already is.

### ✔ Pros

* Real-time
* Fully managed
* High throughput and strong durability
* Best integration with AWS ecosystem
* Easy to connect downstream ETL, Glue, Athena, or Lakes
* Small, easy-to-reason-about footprint

### ✖ Cons

* Ingestion and storage only — everything above that is yours to build
* Slightly more setup than HTTP → Lambda
* Not as portable as Kafka (AWS-specific)

### When to choose this?

* You want **real-time ingestion** and will build your own consumers
* You plan to use AWS-native analytics
* You want a clean, minimal ingestion path
* You prefer managed services instead of running servers

### Documentation

➡️ **[Kinesis + Firehose + S3 Setup](min-setup-kinesis.md)**
➡️ **[Extending it with SNS pub/sub fan-out](sns-integration.md)**

---

## 📁 3. Direct Upload to AWS S3

**Best for:**

* Simple deployments
* Archival and batch processing
* Low-frequency data uploads
* Offline or non-real-time use cases

This is the **simplest** way to integrate MSight with the cloud.
The edge device aggregates and compresses sensor data (images, LiDAR frames, metadata) and **uploads directly to an S3 bucket**.

!!! note
    MSight Cloud offers this same path as a per-sensor setting (`archive_enabled`), with the bucket registered, tagged and monitored for you — and no streaming infrastructure provisioned for archive-only sensors. See [MSight Cloud → The archive path](msight-cloud.md#the-archive-path).

### ✔ Pros

* Easiest setup
* No streaming infrastructure required
* Cheapest option
* Works offline with periodic uploads

### ✖ Cons

* **Not real-time**
* Can't integrate with real-time cloud services
* Not suitable for streaming data
* No cloud-based processing until after upload

### Documentation

➡️ *Direct S3 Upload (simple archiving)* — *coming soon*

---

## 🌐 4. HTTP Endpoint

**Best for:**

* Simple streaming ingestion
* Users who want full control of backend logic
* Teams familiar with REST/Web APIs
* Lightweight or custom deployments
* Environments with **special networking constraints**

In this model, MSight sends data to an **HTTP endpoint**.
A user-managed HTTP server running in the cloud (or on-prem) receives the request, processes or repackages the data, and forwards it to any downstream service — S3, SNS, SQS, Kinesis, Kafka, or your own storage pipeline.

This approach offers full flexibility at the ingestion layer.

### ✔ Pros

* **Easy to understand** — REST is widely used and well supported
* **Users can host their own HTTP server** in any cloud or on-prem
* **Highly flexible** — forward data to *any* downstream service
* **No persistent connections** from the edge device
* **Ideal for specialized networking environments**, such as:
    * Roadside deployments restricted to **IPv6-only networks**
    * Networks requiring **custom security policies**, proxies, or controlled routing
    * Cases where managed services like Kinesis are blocked or unreachable
* Works even when the infrastructure cannot support Kinesis/Kafka protocols

### ✖ Cons

* Still requires a **downstream pipeline**
  (Kinesis / SNS / SQS / Kafka / S3)
* HTTP overhead is higher than Kinesis or Kafka
* Harder to guarantee ordering and throughput

### When to choose this?

* You want maximum flexibility
* You already have an API-oriented backend
* You prefer to process data in Lambda instead of Firehose
* Your data rate is moderate

!!! note "IPv6-only roadside networks"
    An IPv6-only network is not by itself a reason to avoid MSight Cloud. The MSight Core AWS sink nodes support AWS dual-stack endpoints via `--use-dualstack-endpoint`, which is how edge devices on IPv6-only roadside networks publish to MSight Cloud.

### Documentation

➡️ *HTTP Endpoint + Lambda Integration* — *coming soon*

---

## 🔄 5. Kafka or AWS MSK

**Best for:**

* Multi-cloud or cloud-agnostic deployments
* Teams already using Kafka
* Large-scale streaming systems
* High fan-out scenarios
* Companies requiring portable infrastructure

Kafka (and AWS MSK, its managed equivalent) provides a **vendor-neutral** streaming backbone.

### ✔ Pros

* Cloud-agnostic
* Extremely high throughput
* Strong ordering guarantees
* Excellent for large distributed systems

### ✖ Cons

* More operational complexity
* Requires keeping brokers healthy (unless using MSK)
* More work to integrate into AWS downstream (compared to Kinesis)

### When to choose this?

* You want a pipeline that can run on AWS, Azure, GCP, or on-prem
* Your organization already uses Kafka
* You need advanced streaming features (schemas, replay, partitioning)
* You want independence from AWS-specific services

### Documentation

➡️ *Kafka / AWS MSK Integration* — *coming soon*

---

## 🧭 Which Integration Should I Use?

Here is a decision summary:

| Use Case / Requirement                          | Recommended Option          |
| ----------------------------------------------- | --------------------------- |
| **The full edge-to-cloud platform**             | **[MSight Cloud](msight-cloud.md)** ⭐ |
| Real-time delivery to vehicles / mobile clients | **[MSight Cloud](msight-cloud.md)** |
| Minimum AWS-native real-time ingestion only     | **[Kinesis + Firehose + S3](min-setup-kinesis.md)** |
| Simple upload + archival                        | **Direct S3 Upload**        |
| Low/moderate-rate streaming, easy setup         | **HTTP + Lambda**           |
| Cloud-agnostic or existing Kafka infrastructure | **Kafka / MSK**             |

### TL;DR

* **If you are not sure → [MSight Cloud](msight-cloud.md)**
* **If you want the smallest possible AWS footprint → Kinesis + Firehose + S3**
* **If you want the easiest option → S3 Upload**
* **If you want flexible ingestion → HTTP + Lambda**
* **If you want portability → Kafka / MSK**

---

## 📘 Continue to Setup Guides

* **[MSight Cloud](msight-cloud.md)** ⭐ *recommended*
* **[AWS Kinesis + Firehose + S3](min-setup-kinesis.md)**
* **[Advanced: SNS pub/sub fan-out from Kinesis](sns-integration.md)**
* *HTTP Endpoint* — *coming soon*
* *Direct S3 Upload* — *coming soon*
* *Kafka / MSK Integration* — *coming soon*
