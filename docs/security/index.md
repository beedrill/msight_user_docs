# Security Best Practices for MSight

## Overview

MSight is developed and deployed on **widely adopted software stacks** (Linux, Docker/Supervisor, Redis, NATS, Kafka, and AWS managed services). The core security mechanisms—authentication, authorization, encryption, and auditing—are therefore primarily provided by these underlying technologies.

MSight itself does not introduce custom security protocols. Instead, it **follows a secure-by-design philosophy** and provides **clear best‑practice guidance** to help operators deploy MSight safely and avoid common security misconfigurations. When deployed following these recommendations, MSight can operate within a robust and defensible security posture suitable for both research and production environments.

---

## 1. Operating System (OS) and Host Access

MSight nodes typically run on Linux hosts (bare metal or virtual machines). Securing host access is the first and most important line of defense.

### Recommended Practices

* **Use SSH for remote access**

  * Disable password-based SSH login
  * Use key-based authentication only
  * Protect private keys with passphrases

* **Restrict SSH exposure**

  * Allow SSH access only from trusted IP ranges or VPNs
  * Avoid exposing SSH directly to the public internet when possible

* **Principle of least privilege**

  * Avoid logging in as `root`
  * Use a regular user account with `sudo` privileges

* **Basic host hygiene**

  * Keep the OS and critical packages up to date
  * Remove unused services and close unused ports

*Reference:* [Guide to SSH Hardening](https://dev.to/khurammurad/the-ultimate-guide-to-ssh-hardening-secure-your-remote-access-40gj)

> These measures significantly reduce the risk of unauthorized access to MSight nodes, regardless of whether they run Docker containers or Supervisor-managed processes.

---

## 2. Networking and Firewall Configuration

MSight is designed to operate **within a private or trusted network environment**. Most MSight components do not require public exposure.

### Network Deployment Guidance

* **Private network by default**

  * Deploy MSight nodes on a private LAN, VLAN, or VPC subnet
  * Avoid assigning public IP addresses to nodes unless strictly necessary

  *Reference:* [VLAN vs Subnet Networking Guide](https://www.router-switch.com/faq/vlan-vs-subnet-guide.html) — explains how VLANs and subnets support private network segmentation and isolation.

* **Minimal external exposure**

  * Only expose ports required for:

    * Sensor input (if applicable)
    * Outbound cloud communication using HTTPS (e.g., HTTP APIs or AWS Kinesis)
  * Internal services such as Redis, NATS, and Kafka should remain internal and must not be directly exposed to the public internet

* **Firewall configuration**

  * Use host-based firewalls (e.g., `ufw`, `iptables`, or cloud security groups)
  * Deny all other inbound traffic by default

  *Host-level firewall reference:* [Firewall Rules Configuration Best Practices](https://docs.rackspace.com/docs/best-practices-for-firewall-rules-configuration) — practical guidance on structuring firewall rules and default-deny policies.

  *Network / gateway firewall reference:* [Firewall Best Practices Guide](https://www.paloaltonetworks.com/cyberpedia/firewall-best-practices) — high-level best practices for perimeter firewalls and network segmentation.

* **Segmentation**

  * Treat MSight nodes and services as internal components

> A private-network-first approach dramatically reduces the attack surface and is sufficient for most MSight deployments. This is a **standard and widely adopted infrastructure security practice**, and in most cases is already enforced by an infrastructure owner’s IT or network security policies rather than being specific to MSight.

---

## 3. Pub/Sub and Redis Security Configuration

MSight relies on **pub/sub systems** for inter-node communication and **Redis** for maintaining shared state. These components must be configured with basic authentication and access control.

### 3.1 Redis (State Store)

Redis should **never be exposed to the public internet**.

**Recommended configuration:**

* Bind Redis to private interfaces only
* Enable authentication (`requirepass` or Redis ACLs)
* Use strong, non-default passwords
* Restrict network access via firewall rules

**Best practices:**

* Use a dedicated Redis instance for MSight
* Do not reuse Redis credentials across environments
* Rotate credentials if compromise is suspected

> Redis security relies primarily on network isolation plus authentication. This combination is sufficient and widely adopted.

---

### 3.2 NATS (Pub/Sub)

When using NATS for MSight node communication:

**Recommended configuration:**

* Enable user authentication (username/password or token-based)
* Define per-user or per-account permissions

  * Limit which subjects (topics) a node can publish or subscribe to

**Best practices:**

* Assign each MSight node its own credentials
* Avoid using a single shared global account
* Run NATS on a private network and restrict access via firewall

> NATS provides lightweight but effective access control when authentication and subject permissions are enabled.

---

### 3.3 Kafka (Pub/Sub)

Kafka is suitable for larger-scale or higher-throughput MSight deployments.

**Recommended configuration:**

* Enable authentication (e.g., SASL)
* Enable authorization using Kafka ACLs
* Define topic-level permissions:

  * Which nodes can produce
  * Which nodes can consume

**Best practices:**

* Separate administrative access from runtime access
* Use different credentials for different MSight components
* Keep Kafka brokers on a private network

> Kafka provides strong, enterprise-grade security controls when authentication and ACLs are enabled.

---

## 4. Edge-to-Cloud Communication and Cloud Security

MSight supports uploading data from edge deployments to cloud infrastructure using **standard, well-secured cloud services** (e.g., HTTPS endpoints or AWS Kinesis). Security for edge-to-cloud communication is largely handled by the underlying cloud platforms and standard protocols.

### Edge to Cloud Communication

* Secure by default transport

  * Edge-to-cloud communication typically uses HTTPS (TLS)
  * Encryption in transit is handled by standard TLS implementations

* **Outbound-only connectivity**

  * Edge nodes initiate outbound connections to cloud services
  * No inbound cloud-initiated connections to edge nodes are required

* **Credential-based access**

  * Cloud access is controlled using credentials or roles (e.g., AWS IAM)
  * Network-level controls are secondary to identity and access control

> This model is widely used in modern edge–cloud systems and does not require custom security mechanisms from MSight.

### Cloud-Side Security Considerations

* **Encryption at rest**

  * Cloud storage services typically support encryption at rest by default
  * Operators should ensure encryption is enabled according to organizational policy

* **Access control**

  * Limit cloud-side access to uploaded data using role-based permissions
  * Avoid sharing credentials across environments or projects

* **Data scope and retention**

  * Upload only data necessary for the intended application
  * Apply appropriate retention policies on cloud storage

*References:*

* [AWS Kinesis Data Streams – Data Protection](https://docs.aws.amazon.com/streams/latest/dev/server-side-encryption.html) — describes encryption in transit and at rest for Kinesis Data Streams.
* [Amazon S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html) — covers encryption at rest, access control, and secure data management for S3.

> These practices are standard for cloud deployments and are generally managed by an organization’s existing cloud security and IT governance processes.

---

## 5. V2X and RSU Security Considerations

MSight may integrate with **V2X infrastructure**, including Roadside Units (RSUs), through standard interfaces such as the Immediate Forwarding Message (IFM) protocol to broadcast or consume safety-related messages. As a result, the **security of V2X messages (e.g., signing, certificate management, and trust establishment)** is handled by the underlying V2X and RSU ecosystem and is **outside the direct security boundary of MSight**. This section is included for the sake of completeness, to clarify how MSight fits into existing RSU and V2X security practices and expectations.

### RSU Deployment

* RSUs are typically managed as part of transportation or infrastructure IT systems
* Physical access to RSUs should be restricted and monitored
* Network connectivity for RSUs should follow the same private-network and firewall principles described earlier

### Message Signing and Trust

* V2X messages are typically **digitally signed** using a Public Key Infrastructure (PKI)

* Message signing ensures:

  * Authenticity of the sender
  * Integrity of the message contents

* Certificate management (issuance, rotation, revocation) is handled by:

  * National or regional V2X security credential management systems
  * Existing transportation authority processes

> MSight relies on these established V2X security frameworks for message trust and does not replace or modify standard RSU or V2X security models.

---
