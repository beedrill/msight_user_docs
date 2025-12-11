# ☁️ MSight Cloud Integration Overview

MSight can integrate with the cloud in multiple ways depending on your application needs, data volume, real-time requirements, and your preferred cloud architecture.
!!! tip
    MSight is theoretically compatible with AWS, GCP, Azure, Alibaba Cloud, Tencent Cloud, and others, but **AWS is the recommended and most fully supported option**. Other cloud environments will work as well, but users might manually implement or adapt certain pipeline components described in this documentation.

This page provides a clear overview of the **supported integration methods**, their **trade-offs**, and guidance on **when to choose what**.

---

## 🚀 Why Multiple Integration Methods?

Roadside perception workloads vary widely:

* Some deployments only need **simple data archiving**
* Others require **high-throughput, real-time streaming**
* Some teams prefer **AWS-native microservices**, while others want **cloud-agnostic Kafka-based infrastructure**

To support all deployment styles, MSight provides four integration paths:

1. **Direct S3 Uploads** (simple archiving)
2. **HTTP Endpoint** (flexible ingest method)
3. **AWS Kinesis + Firehose + S3 (AWS-native pipeline)**
4. **Kafka / AWS MSK** (cloud-agnostic, portable streaming)

Below, we explain each option,choose the one which is right for you.

---

## 📁 1. Direct Upload to AWS S3

**Best for:**

* Simple deployments
* Archival and batch processing
* Low-frequency data uploads
* Offline or non-real-time use cases

This is the **simplest** way to integrate MSight with the cloud.
The edge device aggregates and compress sensor data (images, LiDAR frames, metadata) and **uploads directly to an S3 bucket**.

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

## 🌐 2. HTTP Endpoint

**Best for:**

* Simple streaming ingestion
* Users who want full control of backend logic
* Teams familiar with REST/Web APIs
* Lightweight or custom deployments
* Environments with **special networking constraints**

In this model, MSight sends data to an **HTTP endpoint**.
A user-managed HTTP server running in the cloud (or on-prem) receives the request, processes or repackages the data, and forwards it to any downstream service — S3, SNS, SQS, Kinesis, Kafka, or your own storage pipeline.

This approach offers full flexibility at the ingestion layer.

---

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

### Documentation

➡️ *HTTP Endpoint + Lambda Integration* — *coming soon*

---

## 🔥 3. AWS Kinesis + Firehose + S3 (AWS-native pipeline)

**Best for:**

* Real-time ingestion with minimum AWS support
* Simple but scalable streaming from MSight Edge
* Large deployments with multiple sensors
* Users who want an “AWS-native” architecture
* Users planning to plug in more AWS services over time
* Easy and integrated monitoring

* **Kinesis Data Streams** receives live data from MSight Edge
* **Firehose** batches, transforms, and partitions
* **S3** stores data in efficient, queryable formats

!!! tip
    This represents the **minimum real-time streaming pipeline** for MSight.  
    If you want to extend this pipeline to support **real-time eventing, notifications, or downstream applications**, see  
    ➡️ **[Integrating with SNS](sns-integration.md)**.

    
### ✔ Pros

* Real-time
* Fully managed
* High throughput and strong durability
* Best integration with AWS ecosystem
* Easy to connect downstream ETL, Glue, Athena, or Lakes

### ✖ Cons

* Slightly more setup than HTTP → Lambda
* Not as portable as Kafka (AWS-specific)

### When to choose this?

* You want **real-time processing**
* You plan to use AWS-native analytics
* You want a clean, scalable ingestion path
* You prefer managed services instead of running servers

### Documentation

➡️ **[Kinesis + Firehose + S3 Setup](min-setup-kinesis.md)**

---

# 🔄 4. Kafka or AWS MSK

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

# 🧭 Which Integration Should I Use?

Here is a decision summary:

| Use Case / Requirement                          | Recommended Option          |
| ----------------------------------------------- | --------------------------- |
| Simple upload + archival                        | **Direct S3 Upload**        |
| Low/moderate-rate streaming, easy setup         | **HTTP + Lambda**           |
| AWS-native, scalable real-time streaming        | **Kinesis + Firehose + S3** |
| Cloud-agnostic or existing Kafka infrastructure | **Kafka / MSK**             |

### TL;DR

* **If you want the easiest option → S3 Upload**
* **If you want flexible ingestion → HTTP + Lambda**
* **If you want the best AWS-native experience → Kinesis + Firehose + S3**
* **If you want portability → Kafka / MSK**

---

# 📘 Continue to Setup Guides

* **[AWS Kinesis + Firehose + S3](aws-kinesis-firehose-s3.md)**
* *HTTP Endpoint*
* *Direct S3 Upload*
* *Kafka / MSK Integration*

