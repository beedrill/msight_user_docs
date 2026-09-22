# 🚀 MSight Cloud (Recommended)

**[MSight Cloud](https://github.com/michigan-traffic-lab/msight-cloud)** is the official, open-source cloud platform for MSight. It is the **recommended way to integrate MSight roadside devices with the cloud**: instead of assembling Kinesis streams, Firehose delivery streams, Lambdas, topics and queues by hand, you deploy one AWS CDK stack into your own AWS account and get the whole edge-to-cloud path — ingestion, storage, real-time distribution, client APIs and a management console — already wired together.

!!! tip "Why start here"
    The other integration methods in this section (Kinesis + Firehose + S3, SNS fan-out) are still fully supported and documented. They describe how to build a **minimum** cloud pipeline yourself. MSight Cloud gives you that pipeline plus everything around it, deployed with one command, so unless you have a specific reason to keep your cloud footprint minimal, start here.

* **Source:** [github.com/michigan-traffic-lab/msight-cloud](https://github.com/michigan-traffic-lab/msight-cloud)
* **License:** BSD 3-Clause
* **Runs in:** your own AWS account — there is no hosted service to sign up for, and no data leaves your account.

---

## 🧭 What MSight Cloud Gives You

| Capability | What it means in practice |
|---|---|
| **Sensor ingestion** | Each roadside data stream is registered as a logical **sensor**. Registering one provisions its own ordered queue and a dedicated always-warm consumer. |
| **Real-time distribution** | Sensor and SPaT messages are pushed to connected clients over **WebSocket** with low latency, filtered by the client's reported location. |
| **Data archiving** | Aggregated sensor data uploads to S3 buckets that the platform registers, tags and monitors for you. |
| **SAE J2735 / J3224 support** | Online **SDSM decoding**, a dedicated **SPaT** streaming path, and **MAP** (intersection geometry) lookup by location. |
| **Client APIs** | APIs providing rich features for mobile integration, including location reporting, radius-based warning delivery, real-time sensor event streaming, intersection map search, latency probes — documented by a live OpenAPI spec the deployment serves itself. |
| **Admin console** | A web console for sensors, storage, apps, connected clients, logs, metrics, alarms, cost breakdown and user management. |
| **Microservice hosting** | Deploy your own containers from a GitHub repository, with builds triggered by push. |
| **MCP server** | Operate the whole deployment from an AI assistant (Claude Code, Claude Desktop, Cursor, Windsurf, Gemini CLI) over the Model Context Protocol. |

---

## 🏗️ Architecture at a Glance

MSight Cloud separates data by **how urgently it is needed**, and gives you both paths at once.

```text
                     ┌───────────────── MSight Cloud (your AWS account) ──────────────────┐
                     │                                                                    │
 MSight Edge         │  SNS FIFO          SQS FIFO          ECS Fargate                   │
 (roadside device)   │  sensor topic      one per sensor    one task per sensor           │
                     │                                                                    │
 AWSSNSPusher ───────┼──►  (o) ─filter on─►  [=]  ────────►  <*> ─► Valkey ─► WebSocket ──┼─► clients
 (real-time path)    │      sensor_name                       │                           │
                     │                                        └─► Aurora PostgreSQL       │
 AWSSequencePusher ──┼───────────────────────────────────────► S3 (registered bucket)     │
 (archive path)      │                                             │                      │
                     │                                             └─► SNS control topic  │
 RSU / signal ───────┼──►  SPaT topic ─► SPaT consumers ─► WebSocket ─────────────────────┼─► clients
                     │                                                                    │
                     └────────────────────────────────────────────────────────────────────┘
```

Two design decisions are worth knowing before you deploy:

* **One SNS FIFO topic fans out to every sensor.** Routing is done entirely by an SNS subscription filter on the `sensor_name` message attribute — each sensor's queue accepts only its own messages. This is why the edge only ever needs one topic ARN, no matter how many sensors it runs.
* **Each sensor gets a long-running ECS Fargate task, not a shared Lambda pool.** That keeps warm connections to Valkey and Aurora, caches per-sensor configuration in memory, and guarantees ordered processing within the sensor's stream. Sensor infrastructure is created and torn down **at runtime** as you register sensors — not by CloudFormation.

Core data stores:

* **Aurora PostgreSQL + PostGIS** — intersection maps, sensor and app registries, MCP tokens, and anything that must survive a restart.
* **Valkey (ElastiCache)** — live client locations (geo-indexed, TTL'd), WebSocket connection lookups, per-sensor config caches.
* **S3** — aggregated sensor data uploads and the admin console's static build.

---

## ✅ Prerequisites

* An AWS account, with credentials configured locally (`aws configure`).
* **Node.js 20+** and npm.
* **[Docker Desktop](https://www.docker.com/products/docker-desktop/), running** — CDK builds the sensor consumer container image at deploy time.
* The AWS CDK CLI — installed as a project dependency, so `npx cdk` works without a global install.

!!! note
    You do **not** need to create any of the AWS services by hand. The stack provisions the VPC, database, cache, topics, cluster, APIs, Cognito user pool and console distribution for you.

---

## 📦 Step 1 — Clone and Install

```bash
git clone https://github.com/michigan-traffic-lab/msight-cloud.git
cd msight-cloud
npm install
npm install --prefix admin-console
```

Two installs, because the admin console is a separate package rather than a workspace. Skipping the second one gets you all the way through the deploy before the console build fails.

---

## ⚙️ Step 2 — Configure

```bash
cp deploy.config.example.yaml deploy.config.yaml
```

`deploy.config.yaml` is gitignored and is **the only file you fill in** — everything else is derived from it or from the stack's own outputs. Every option is documented inline in the example file; the ones you must set are:

```yaml
account: "123456789012"     # your 12-digit AWS account ID
region: us-east-2

adminConsole:
  masterUsername: admin
  masterEmail: you@example.com
  masterPassword: "ChangeMe!2026"   # >=12 chars, upper + lower + digit + symbol
```

Other settings worth reviewing before the first deploy:

| Setting | Why you might change it |
|---|---|
| `deploymentName` | Names every resource and tags them for teardown. Change it to run **two** MSight Cloud stacks in one AWS account. |
| `preferredAz` | Pins single-AZ resources (ElastiCache, ECS tasks) to one availability zone for lowest latency. |
| `spatBroadcastRadiusM` | Radius, in metres, used when fanning SPaT out to nearby clients. |
| `clientAppIds` | Which app IDs' connected-client fleets the console may inspect. |
| `logRetentionDays` | Caps CloudWatch log **storage**. Left unset, CloudWatch keeps events forever and bills for them. |
| `configCacheTtlSeconds` | How long the SPaT consumers cache configuration lookups. Higher saves Aurora cost; lower makes edits take effect sooner. |
| `tags` / `costAllocationTagKey` | What lets Cost Explorer separate this stack's spend from the rest of the account. Cost attribution is not retroactive — tag from the first deploy. |

!!! warning "Settings that replace live resources"
    `deploymentName` and the `resourceNames` block name resources whose rename **replaces** them. Renaming the sensor topic changes its ARN, and every field sensor publishing to the old ARN goes silent with no error raised.

    On a brand-new deployment, omit the `resourceNames` block entirely and let the defaults apply — that is what lets two MSight stacks coexist in one account. Only pin names when you are adopting resources that already exist. Run `npx cdk diff` before re-deploying a stack that already carries data.

---

## 🚀 Step 3 — Deploy

```bash
npm run deploy
```

That is the whole deployment. It runs `cdk deploy`, then builds the admin console against the deployment's own API URLs and Cognito pool, uploads it to S3, and invalidates CloudFront.

No separate build step is needed first: CDK runs the TypeScript directly through `ts-node`, so `npm run build` is a type-check rather than a prerequisite.

The first deploy takes a while — an Aurora cluster and a CloudFront distribution are not fast. Subsequent deploys are much shorter.

---

## 🔍 Step 4 — Verify

The deploy prints a set of CloudFormation outputs. Two of them matter immediately:

* **`HttpApiUrl`** — the public API base URL.
* The **admin console's CloudFront URL**.

Check the API first:

```bash
curl {HttpApiUrl}/system/version
```

```json
{
  "service": "system-api",
  "api_version": "v1",
  "build_id": "<hash>",
  "server_timestamp": "<iso timestamp>"
}
```

A response with a `build_id` confirms you are hitting the code you just deployed. Then open the console URL and sign in with the `masterUsername` / `masterPassword` from `deploy.config.yaml`.

!!! tip "Change the master password"
    `masterPassword` is passed to a CloudFormation custom resource, so it is visible in the synthesized template to anyone with stack read access. Change it from the console's **Users** page after your first sign-in.

---

## 📡 Step 5 — Register a Sensor

A sensor is the unit MSight Cloud manages everything by. Registering one from the console's **Sensors** page (or via MCP) writes a registry row and immediately reconciles the AWS side — creating its SQS FIFO queue, its SNS subscription with the right filter, and its ECS service.

Each sensor has two independent ingest paths, and you choose either or both:

| Setting | Effect |
|---|---|
| `stream_enabled` | Provisions the real-time path: queue, subscription, and dedicated Fargate consumer. |
| `archive_enabled` + `storage_bucket` / `storage_prefix` | Routes aggregated uploads to S3. No queue or consumer is created. |

!!! note "Archive-only sensors cost less on purpose"
    An archive-only sensor deliberately gets **no** queue, subscription or consumer — building them would bill you for exactly the infrastructure that choosing S3 was meant to avoid. Likewise, turning streaming **off** on a sensor tears its queue down on the next reconcile.

The Sensors page also shows **drift**: whether each sensor's queue and service actually exist, its current queue depth, and any orphaned queues left behind by a partially-failed change. **Reconcile** converges everything back to the registry.

---

## 🔌 Step 6 — Point MSight Edge at the Cloud

### The real-time path

MSight Core ships the **[`AWSSNSPusherSinkNode`](../architecture/nodes.md#awssnspushersinknode)**, which publishes each message it receives to the MSight Cloud sensor topic with exactly the message attributes the cloud routes on.

Take the `SensorTopicArn` from the deploy output, then launch the node against any pipeline topic:

```bash
msight_launch_aws_sns_pusher \
  -n sns_pusher \
  -st detections \
  --topic-arn arn:aws:sns:us-east-2:123456789012:msight-cloud-sensor-topic.fifo \
  --use-dualstack-endpoint
```

| Flag | Meaning |
|---|---|
| `-n` | Node name, unique across the system |
| `-st` | Pipeline topic this node subscribes to |
| `--topic-arn` | `SensorTopicArn` from the deploy output |
| `--use-dualstack-endpoint` | Use the dual-stack SNS endpoint — needed on IPv6-only roadside networks |
| `--wait` | Seconds to sleep before starting, for ordering node startup |

The node attaches these SNS message attributes:

| Attribute | Type | Source |
|---|---|---|
| `sensor_name` | String | The message's `sensor_name` — **this is what routes it to the right queue** |
| `device_name` | String | The `MSIGHT_EDGE_DEVICE_NAME` environment variable |
| `capture_timestamp` | Number | When the reading was captured, when present |
| `creation_timestamp` | Number | When the payload was created, when present |

The `sensor_name` must match the name you registered in Step 5 exactly. A message whose `sensor_name` matches no registered sensor matches no subscription filter and is **silently discarded** — SNS does not buffer for subscribers that do not exist.

!!! warning "FIFO topics require a MessageGroupId"
    The MSight Cloud sensor topic is an **SNS FIFO** topic (`...-sensor-topic.fifo`), and AWS requires every publish to a FIFO topic to carry a `MessageGroupId`. Deduplication is content-based, so no `MessageDeduplicationId` is needed.

    Check the version of `AWSSNSPusherSinkNode` you have: if its `publish(...)` call does not pass `MessageGroupId`, publishing to the FIFO topic fails with `InvalidParameterException`. Either upgrade MSight Core, or subclass the node in your own pipeline:

    ```python
    from msight_core.nodes import AWSSNSPusherSinkNode


    class FifoSNSPusherSinkNode(AWSSNSPusherSinkNode):
        """Publishes with the sensor name as the FIFO message group."""

        def on_message(self, data):
            self.sns_client.publish(
                TopicArn=self.topic_arn,
                Message=data.to_json(),
                MessageGroupId=str(data.sensor_name),   # required for FIFO
                MessageAttributes={
                    "sensor_name": {
                        "DataType": "String",
                        "StringValue": str(data.sensor_name),
                    },
                },
            )
    ```

    Using the sensor name as the message group is the right choice: the per-sensor queues are created with `FifoThroughputLimit: perMessageGroupId`, so grouping by sensor preserves ordering within a sensor without capping throughput across sensors.

### The archive path

For data that does not need to arrive in real time, buffer and aggregate it at the roadside with MSight Core's processing nodes, then upload with **[`AWSSequencePusherSinkNode`](../architecture/nodes.md#awssequencepushersinknode)**:

```bash
msight_launch_aws_sequence_pusher \
  -n s3_pusher \
  -st aggregated \
  --bucket-name msight-data-yourcity \
  --prefix archive \
  --aws-region us-east-2 \
  --use-dualstack-endpoint
```

Objects land at `prefix/device/sensor/date/hour/start_end.json`, which partitions cleanly for Athena.

Register that bucket on the console's **Storage** page — either creating a new one or adopting an existing one — and MSight Cloud applies the cost allocation tag and wires up the S3 upload event notifications for you. Buckets with nothing archiving into them get their listener removed on the next reconcile.

### IAM for the edge device

The roadside device needs credentials that can publish to the sensor topic and, if it archives, write to the bucket. Keep the policy tight:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-2:123456789012:msight-cloud-sensor-topic.fifo"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::msight-data-yourcity/archive/*"
    }
  ]
}
```

---

## 📱 Step 7 — Connect Client Applications

Client applications — in-vehicle apps, roadside displays, integrators — talk to the **public client API**, which is unauthenticated and CORS-open.

!!! tip "Building a mobile or in-vehicle app? Do not write this by hand"
    The **[MSight App Client Library](../mobile/index.md)** implements everything below — WebSocket connection and reconnection, location reporting, SDSM and SPaT parsing, and derived signal state — as a Kotlin Multiplatform library for Android, IVI head units and desktop. Use it instead of calling these routes directly.

### Register the app

Add an app on the console's **Apps** page. Its flags decide what the app's clients receive:

| Flag | Delivers |
|---|---|
| `receive_sdsm` | Decoded SDSM object data from nearby sensors |
| `receive_spat` | Routine SPaT updates, rate-limited to 2 Hz |
| `receive_critical_spat` | Lower-latency delivery of safety-significant signal changes |

!!! warning
    These flags are read on the SDSM and SPaT hot paths. Flipping one changes what real vehicles are told, and the failure mode is silence rather than an error.

### Report location and open a WebSocket

A client reports where it is, then connects:

```bash
curl -X POST {HttpApiUrl}/v1/clients/location/update \
  -H 'content-type: application/json' \
  -d '{"app_id": "app_demo", "client_id": "vehicle-001", "lat": 42.3001, "lon": -83.6989}'
```

```bash
curl {HttpApiUrl}/system/websocket-url
```

```javascript
const ws = new WebSocket(`${wsUrl}?app_id=app_demo&client_id=vehicle-001`);
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

Both `app_id` and `client_id` are required query parameters. Everything on the socket is **server-pushed** — there is no client-initiated message type. Connecting again with the same identity closes the older connection.

Locations are stored geo-indexed with a short TTL, which is what lets the radius broadcast find the client. A client that stops reporting stops receiving.

### Useful public endpoints

| Route | Purpose |
|---|---|
| `POST /v1/clients/location/update` | Report current location |
| `POST /v1/clients/notify/radius` | Broadcast a message to every connected client within a radius |
| `GET /v1/maps/search` | Find intersection maps near a lat/lon |
| `GET /v1/maps/{name}` | Fetch one intersection map (SAE J2735 MAP geometry) |
| `GET /v1/client/latency` | Round-trip probe, also reporting server-side cache and database latency |
| `GET /system/websocket-url` | Which WebSocket endpoint to connect to |
| `GET /system/docs` | Interactive Swagger UI for all of the above |

!!! tip "The API docs are never stale"
    Every deployment serves its own OpenAPI 3.0 document at `{HttpApiUrl}/system/openapi.json`, generated live from the same schemas that validate requests — there is no separate build step that can drift from the deployed code. Browse it at `{HttpApiUrl}/system/docs`, also linked from the console's **API Docs** page.

---

## 🖥️ Operating the Deployment

The admin console (Vue 3 + Quasar, served from CloudFront, authenticated against the stack's Cognito pool) is the day-to-day interface. It has no self-registration — the master account is the only way in initially, and creates further accounts from its Users page.

| Area | What you can do |
|---|---|
| **Sensors** | Register, enable/disable, switch ingest paths, inspect queue depth and drift, reconcile |
| **Storage** | Create or adopt buckets, browse objects, register them as sensor upload targets |
| **Apps & Live Clients** | Manage app registrations, count and inspect connected clients, search by radius |
| **Maps** | Load and query intersection MAP geometry |
| **Clusters & Microservices** | Deploy your own containers from GitHub, build, restart, roll back, read logs and metrics |
| **Aurora & Valkey** | Query the database, read and edit rows, inspect and repair cache keys |
| **Logs, Network, Cost** | CloudWatch Insights queries and alarms, network topology, per-tag cost breakdown |
| **Users** | Create further console accounts |
| **MCP** | Issue and revoke MCP tokens, with copy-paste setup for each supported client |

### Operating it from an AI assistant

`POST /mcp` implements JSON-RPC 2.0 over the MCP 2024-11-05 Streamable HTTP transport, exposing the same capabilities as the admin API, gated by the role attached to the token you connect with. The console's **MCP** page generates ready-to-paste setup for Claude Desktop, Claude Code, Cursor, Windsurf and the Gemini CLI, pre-filled with a token you create there.

MCP tokens are long-lived and revocable rather than Cognito sessions, because an assistant reads its configuration once at startup with nowhere to put an hourly refresh. They are stored hashed — the plaintext is shown exactly once, at creation.

---

## 🔒 Security Notes

* The admin API and console are Cognito-authenticated; there is no anonymous access to any administrative capability.
* The VPC runs with **`natGateways: 0`**. Lambdas that need internet access (for example, to call GitHub's API) are deliberately split into their own out-of-VPC functions rather than given a NAT path, so a compromise of one cannot reach both the internet and Aurora.
* Secrets — database credentials, the GitHub App private key — live in AWS Secrets Manager, never in environment variables or logs.
* The GitHub webhook validates an HMAC signature over the raw request body before anything is parsed, and holds no database access of its own.
* The debug-only Valkey inspector (`debugMode: true`) reads the cache directly from inside the VPC. Do not enable it in a deployment reachable by anyone you would not trust with direct cache access.

See also the edge-side [Security guide](../security/index.md).

---

## 🛠️ Useful Commands

None of these are needed to deploy — they are what to run when you are changing things.

```bash
npx cdk diff MsightCloudStack --no-change-set   # what a deploy would change
npm run build                                   # type-check only; not a deploy prerequisite
npm test                                        # Jest suite (TypeScript)
npm run test:python                             # unittest suite (Python Lambda/ECS code)
npx cdk synth MsightCloudStack                  # render the CloudFormation template
```

`cdk diff` before a deploy is worth the thirty seconds on anything already carrying data: it names the resources that would be **replaced** rather than updated, which for a database or a user pool means a new empty one.

**Deploying only the infrastructure.** `npx cdk deploy MsightCloudStack --require-approval never` skips the admin console, which then keeps serving the previously uploaded build. Useful when you changed nothing under `admin-console/`, and a trap when you did.

!!! note "Windows PowerShell"
    If script execution is restricted, run CDK commands through `npx.cmd` (for example `npx.cmd cdk synth`).

---

## 🧭 Where to Go Next

* **[MSight Cloud on GitHub](https://github.com/michigan-traffic-lab/msight-cloud)** — source, issues, and the full README.
* **[MSight App Client Library](../mobile/index.md)** — the client SDK for mobile and in-vehicle devices.
* **[Node reference](../architecture/nodes.md)** — the edge-side sink nodes that feed the cloud.
* **[Deployment guide](../deployment/index.md)** — running MSight Core on the roadside device.
* **[Kinesis + Firehose + S3](min-setup-kinesis.md)** — the minimal alternative, if all you need is raw ingestion and storage.
