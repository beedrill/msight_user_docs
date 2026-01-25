# Tutorial: Real-Time Fan-Out from Kinesis Using SNS Pub/Sub

This tutorial describes a practical pattern for delivering **near–real-time** Kinesis Data Streams records to **multiple independent consumers** in a true **pub/sub** manner using **Amazon SNS**. The core idea is:

1. **MSight pushes sensor data to Kinesis Data Streams** (as in the Kinesis tutorial).
2. A lightweight **Lambda “fan-out” function** consumes records from Kinesis and **publishes** them to an **SNS topic**.
3. Each downstream application subscribes to the SNS topic—typically via its own **SQS queue** (recommended), enabling **independent scaling, retries, and back-pressure** per subscriber.

This design is especially useful when you want multiple services (e.g., storage, online analytics, alerting, visualization) to receive the same stream data **in parallel** without coupling their consumption rates.

> Important terminology note:
>
> * **Kinesis “Enhanced fan-out”** is a Kinesis-native feature that gives each registered consumer dedicated per-shard throughput (up to 2 MiB/sec/shard per consumer) and reduces consumer contention. ([docs.aws.amazon.com](https://docs.aws.amazon.com/streams/latest/dev/building-enhanced-consumers-api.html?utm_source=chatgpt.com))
> * **SNS fan-out** is a messaging pattern that broadcasts a message to multiple subscriptions (often SNS → SQS), which is the pub/sub layer used in this tutorial. ([docs.aws.amazon.com](https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html?utm_source=chatgpt.com))

## Recommended Architecture

**MSight → Kinesis Data Streams → Lambda fan-out → SNS Topic → (SQS queue per subscriber) → Consumer apps**

Why SNS + SQS for subscribers:

* SNS provides broadcast distribution.
* SQS provides durability, per-consumer buffering, and independent scaling, avoiding slow consumers impacting fast consumers. ([docs.aws.amazon.com](https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html?utm_source=chatgpt.com))

## Kinesis Fan-Out Configuration Options

### Option A (Recommended with SNS): Standard Kinesis consumer (Lambda event source mapping)

Use a Lambda event source mapping from Kinesis to trigger your fan-out Lambda. This is the simplest operationally.

Key controls:

* **BatchSize** and **MaximumBatchingWindowInSeconds** to trade latency vs efficiency.
* **ParallelizationFactor** to increase concurrent processing per shard when needed. ([docs.aws.amazon.com](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html?utm_source=chatgpt.com))

### Option B (Kinesis-native fan-out): Enhanced fan-out consumers

If you also have non-Lambda consumers (custom services) that must read the stream with dedicated throughput, register them as **enhanced fan-out consumers**.

Operational notes:

* You must **register a stream consumer** (CLI/API) before using SubscribeToShard.
* Streams have limits on the number of registered enhanced consumers (varies by stream mode). ([docs.aws.amazon.com](https://docs.aws.amazon.com/cli/latest/reference/kinesis/register-stream-consumer.html?utm_source=chatgpt.com))

In this tutorial, SNS-based pub/sub is implemented via Lambda (Option A). Enhanced fan-out (Option B) is optional and can coexist.

## Step 1: Create SNS Topic and Subscriber Queues

1. **Create an SNS topic** (example name: `msight-fanout-topic`).

2. For each subscriber application, **create an SQS queue** (example: `msight-subscriber-a`, `msight-subscriber-b`).

3. **Subscribe each SQS queue to the SNS topic**.

AWS documentation for SNS → SQS subscriptions and required permissions is here:

* Fanout SNS notifications to SQS queues ([docs.aws.amazon.com](https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html?utm_source=chatgpt.com))

> Optional: add **SNS subscription filter policies** (e.g., filter by `device`, `sensor_name`) so each subscriber receives only what it needs. ([serverlessland.com](https://serverlessland.com/patterns/sns-sqs-fanout?utm_source=chatgpt.com))

## Step 2: Create the Lambda Fan-Out Function (Kinesis → SNS)

Create a Lambda function (example name: `msight-kinesis-to-sns`) with permissions to:

* Read from the Kinesis stream (via event source mapping)
* Publish to the SNS topic

Attach a Kinesis event source mapping to the Lambda function. Lambda reads batches from the stream and invokes your handler. ([docs.aws.amazon.com](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html?utm_source=chatgpt.com))

### Example Lambda handler (Python)

This example republishes each Kinesis record to SNS. It also forwards a few message attributes (e.g., `device`, `sensor_name`) if your payload is JSON and includes these fields.

```python
import base64
import json
import os

import boto3

sns = boto3.client("sns")
TOPIC_ARN = os.environ["SNS_TOPIC_ARN"]


def handler(event, context):
    # Kinesis event format: event['Records'][i]['kinesis']['data'] is base64-encoded.
    for record in event.get("Records", []):
        payload_b64 = record["kinesis"]["data"]
        raw_bytes = base64.b64decode(payload_b64)

        message_attributes = {}

        # If your MSight payload is JSON, you can parse it and populate SNS attributes.
        # If it is binary (e.g., msgpack), keep it opaque and skip parsing.
        try:
            obj = json.loads(raw_bytes.decode("utf-8"))
            device = obj.get("device")
            sensor_name = obj.get("sensor_name")
            if device:
                message_attributes["device"] = {"DataType": "String", "StringValue": str(device)}
            if sensor_name:
                message_attributes["sensor_name"] = {"DataType": "String", "StringValue": str(sensor_name)}

            message_body = json.dumps(obj)
        except Exception:
            # Opaque binary passthrough: encode bytes as base64 so SNS carries text safely.
            message_body = base64.b64encode(raw_bytes).decode("ascii")
            message_attributes["encoding"] = {"DataType": "String", "StringValue": "base64"}

        sns.publish(
            TopicArn=TOPIC_ARN,
            Message=message_body,
            MessageAttributes=message_attributes,
        )

    return {"status": "ok", "records": len(event.get("Records", []))}
```

Notes:

* Kinesis delivers data to Lambda as base64; the handler decodes it first.
* Use SNS message attributes + subscription filter policies if you want per-subscriber routing.

## Step 3: Simple Subscriber Consumption Code (SQS)

For most applications, subscribe via **SQS** and run a small consumer that long-polls the queue.

### Python SQS consumer

```python
import argparse
import base64
import json
import sys
import time

import boto3


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--queue-url", required=True)
    p.add_argument("--region", default=None)
    args = p.parse_args()

    sqs = boto3.client("sqs", region_name=args.region)

    print(f"Consuming SQS queue: {args.queue_url}")

    while True:
        resp = sqs.receive_message(
            QueueUrl=args.queue_url,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=20,  # long polling
            MessageAttributeNames=["All"],
        )

        msgs = resp.get("Messages", [])
        if not msgs:
            continue

        for m in msgs:
            body = m["Body"]

            # When SNS delivers to SQS, the SQS message body is a JSON envelope.
            # The actual SNS payload is in envelope['Message'].
            try:
                envelope = json.loads(body)
                message = envelope.get("Message", "")
                attrs = envelope.get("MessageAttributes", {})

                encoding = attrs.get("encoding", {}).get("Value")
                if encoding == "base64":
                    raw = base64.b64decode(message)
                    print(f"[SNS->SQS] bytes={len(raw)} (base64)")
                else:
                    # Often JSON text
                    print(f"[SNS->SQS] {message[:200]}")

            except Exception:
                # Not an SNS envelope; print raw.
                print(body[:200])

            # Delete after processing
            sqs.delete_message(QueueUrl=args.queue_url, ReceiptHandle=m["ReceiptHandle"])

        time.sleep(0.01)


if __name__ == "__main__":
    main()
```

Run:

```bash
pip install boto3
python consume_sns_sqs.py --queue-url YOUR_QUEUE_URL --region YOUR_AWS_REGION
```

## Practical Guidance

* If you need **true stream semantics** (ordering per shard, replay, checkpoints), keep consuming from Kinesis directly.
* If you need **pub/sub broadcast** to multiple independent systems with different speeds and failure domains, SNS → SQS is a good fit.
* You can combine both: one or more enhanced fan-out consumers + a Lambda fan-out to SNS for “side-channel” subscribers.
