# 📱 MSight App Client Library

**[MSight App Client Library](https://github.com/michigan-traffic-lab/MSight_APP_Client_Library)** is the client-side half of MSight — a **Kotlin Multiplatform** library that puts live roadside intelligence on the devices road users actually carry: a phone in a cup holder, an in-vehicle infotainment (IVI) head unit, a tablet on a bus dashboard, a low-power roadside display.

It holds the connection to [MSight Cloud](../cloud-integration/msight-cloud.md), reports where the device is, and turns what the cloud pushes back into typed events your application can render — without you ever writing a WebSocket handler, a SAE J2735 parser, or a reconnection loop.

!!! abstract "The design goal"
    **A mobile application should not have to understand transportation infrastructure to display it.**

    Ask for the signal facing you and you get **red, yellow or green** — not a set of J2735 signal groups you must first match against lane geometry.

* **Source:** [github.com/michigan-traffic-lab/MSight_APP_Client_Library](https://github.com/michigan-traffic-lab/MSight_APP_Client_Library)
* **License:** BSD 3-Clause
* **Requires:** a reachable [MSight Cloud](../cloud-integration/msight-cloud.md) deployment

---

## 🧭 Where It Fits

```text
      roadside                    MSight Cloud                  this library
 ┌──────────────────┐        ┌──────────────────────┐     ┌─────────────────────┐
 │ cameras · LiDAR  │  SDSM  │ decode · reassemble  │ WSS │  MSightClient       │
 │ radar · signals  │───────►│ geo-match · warn     │────►│        │            │
 │  (MSight Core)   │  SPaT  │ radius-scoped push   │◄────│  events: SharedFlow │
 └──────────────────┘        └──────────────────────┘ loc └─────────────────────┘
                                                                    │
                                                  Android · iOS · IVI · desktop
```

The library talks **only** to MSight Cloud. It does not connect to roadside devices, run perception, or implement V2X radio protocols — everything it receives has already been decoded, filtered and scoped to the device's location by the cloud. That is deliberate: a client then needs nothing but an HTTPS connection, which is what makes an ordinary phone a viable endpoint for infrastructure data.

---

## ✨ What the Library Does

**Keeps the device connected and located.** A single `MSightClient` discovers the deployment's WebSocket endpoint, connects, and reconnects with exponential backoff for as long as it lives — a vehicle loses connectivity routinely, so a drop is treated as normal rather than as an error. Meanwhile it reports the device's position at a configurable rate.

!!! warning "Location reporting is not telemetry — it is how you receive anything"
    MSight Cloud scopes every push by radius around live client positions. **A client that does not report a position receives nothing.**

**Delivers roadside perception.** Decoded SAE J2735 SDSM frames from sensors near the device — every vehicle and pedestrian a roadside sensor can see, with position, speed, heading, classification and bounding box. This is the feed behind cooperative perception: a driver's device learns about a vehicle occluded from their own view.

**Delivers signal state — already interpreted.** Raw J2735 SPaT arrives on two streams: a routine one at about 2 Hz, and a low-latency one that fires only on an actual phase change. Both are available, but most applications want the derived `MSightSignalStateEvent`, which answers the question a driver actually has: *what is my light doing?*

Producing that answer is the most substantial thing the library does. It fetches the intersection's J2735 MAP geometry, flattens the relative lane-node deltas into usable coordinates, infers which movements each signal group governs, matches the device's position and heading against individual lane segments to identify the approach it is on, and looks up that approach's signal groups in the latest SPaT — then requires several consecutive matches before displaying anything, holds the match when GNSS heading drops out at a standstill (precisely when a driver waiting at a red light most wants the display), and suppresses stale frames that would otherwise flash the old colour back after a phase change.

**Delivers warnings.** Safety messages broadcast to clients within a radius of a hazard, carrying an `event_id` so a repeated broadcast of one ongoing hazard can extend an existing alert rather than restarting it.

**Stays out of the way.** No UI, no threading requirements imposed on the host, no service lifecycle. One hot `SharedFlow` of one sealed event hierarchy: collect it once, dispatch on type.

---

## 📥 Importing the Library

### What you need from MSight Cloud

Three values, all from your [MSight Cloud deployment](../cloud-integration/msight-cloud.md):

| Value | Where it comes from |
|---|---|
| `cloudUrl` | The `HttpApiUrl` output printed by the CDK deploy |
| `appId` | An app registered in the deployment's admin console |
| `clientId` | Your own choice — unique per device |

### Prerequisites

* **Android Studio** recent enough for Android Gradle Plugin 8.8
* **Android SDK Platform 35** (`compileSdk 35`, `minSdk 24`)
* **JDK 17** for Gradle — Android Studio's bundled JetBrains Runtime satisfies this

### Add it to your project

The library is the `shared` Kotlin Multiplatform module.

!!! warning "There are no published artifacts"
    The `shared` module does not apply `maven-publish`, so there is **no Maven coordinate to depend on**, nothing on Maven Central, and no `publishToMavenLocal` task. You consume it as a Gradle module, using one of the two approaches below.

**Option A — build your app inside the repository** (what the example app does, and the quickest way to start):

```kotlin title="settings.gradle.kts"
include(":shared")
include(":yourapp")
```

```kotlin title="yourapp/build.gradle.kts"
dependencies {
    implementation(project(":shared"))
}
```

**Option B — keep your app in its own repository** and pull the library in as a Gradle [composite build](https://docs.gradle.org/current/userguide/composite_builds.html). Because the module publishes no coordinate, the substitution has to be written out explicitly:

```kotlin title="settings.gradle.kts"
includeBuild("../MSight_APP_Client_Library") {
    dependencySubstitution {
        substitute(module("com.msight:shared")).using(project(":shared"))
    }
}
```

```kotlin title="build.gradle.kts"
dependencies {
    implementation("com.msight:shared")
}
```

!!! tip "Prefer a plain Maven coordinate?"
    Adding publication is a small change to [`shared/build.gradle.kts`](https://github.com/michigan-traffic-lab/MSight_APP_Client_Library/blob/main/shared/build.gradle.kts) — apply the `maven-publish` plugin, set a `group` and `version`, and you can `publishToMavenLocal` (or to an internal repository) and depend on it normally.

### Android manifest permissions

```xml title="AndroidManifest.xml"
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

Location permission must be **granted before you construct the client** — the platform location provider assumes it is already held.

---

## 🚀 Minimal Integration

```kotlin
import com.msight.app.client.*
import kotlinx.coroutines.launch

// 1. Location permission must already be granted before this point.

// 2. Construct the client. This blocks until connected, so keep it off the main thread.
val client = MSightClient(
    context = applicationContext,                 // a PlatformContext; Context on Android
    config = MSightClientConfig(
        cloudUrl = "https://your-deployment.example.com",
        appId = "your-app",                       // registered in the MSight Cloud console
        clientId = "device-a1b2c3d4",             // unique per device
        roadUserType = MSightRoadUserType.VEHICLE,
        roadUserSubType = "passenger_car",
        deviceType = MSightDeviceType.CELLPHONE,
        locationUpdateFrequencyHz = 1.0
    )
)

// 3. Subscribe BEFORE starting — the flow is hot and has no replay buffer.
scope.launch {
    client.events.collect { event ->
        when (event) {
            is MSightLocationEvent    -> updateOwnPosition(event.latitude, event.longitude)
            is MSightSdsmEvent        -> drawDetections(event.refPos, event.objects)
            is MSightSignalStateEvent -> showSignal(event.intersectionName, event.straightColor)
            is MSightSimpleWarning    -> alert(event.message)
            else -> Unit
        }
    }
}

// 4. Start reporting location, and opt into derived signal state.
client.start()
client.setSpatEnabled(true)

// 5. On teardown.
client.close()
```

The lifecycle is always: **construct → subscribe → `start()` → collect → `close()`**.

---

## ⚙️ Configuration

```kotlin
data class MSightClientConfig(
    val cloudUrl: String,
    val appId: String,
    val clientId: String,
    val roadUserType: MSightRoadUserType,
    val roadUserSubType: String,
    val deviceType: MSightDeviceType,
    val locationUpdateFrequencyHz: Double = 1.0
)
```

| Field | Notes |
|---|---|
| `cloudUrl` | The deployment's HTTP API base URL. Trailing slash tolerated. The WebSocket endpoint is discovered from it at runtime, not configured separately. |
| `appId` | Registered application identifier. Scopes what the cloud sends you. |
| `clientId` | Unique per device within `appId`. |
| `roadUserType` | `VEHICLE`, `VRU`, `OTHER`. **Reserved — no effect today.** |
| `roadUserSubType` | Free text, e.g. `passenger_car`, `transit_bus`, `pedestrian`. Reserved. |
| `deviceType` | `CELLPHONE`, `TABLET`, `IVI`, `LOW_POWER_DEVICE`, `OTHER`. Reserved. |
| `locationUpdateFrequencyHz` | Upper bound on upload rate; default `1.0`. `0.0` disables rate limiting. Raising it costs bandwidth and cloud calls but not GNSS power — the platform is asked for fixes as fast as it will supply them and the surplus is dropped in the library. |

!!! note "Why the reserved fields are still required"
    The three road-user and device fields are neither transmitted nor read today, because MSight Cloud's location-update schema has no field to carry them yet. They stay **required** rather than gaining a default on purpose: a default would mean every client that never thought about it silently reporting the same class on the day the cloud starts using them. You are asked once, now, while the answer is in front of you.

---

## 📡 Common Features

### The client API

| Member | Purpose |
|---|---|
| `MSightClient(context, config)` | Constructs **and connects**. Blocks; throws if the cloud is unreachable. |
| `events: SharedFlow<MSightEvent>` | The single stream of everything the client produces. Hot, no replay. |
| `start()` | Begins location reporting. **Required to receive anything.** |
| `stop()` | Ends the session; the instance stays usable via `initialize()`. |
| `close()` | Releases everything. The instance is finished. |
| `initialize()` | Rebuilds the session. Called by the constructor; rarely needed directly. |
| `setSpatEnabled(Boolean)` | Turns derived `MSightSignalStateEvent` production on or off. **Off by default.** |
| `locationHistory` | The device's own track over the last two minutes. |
| `loadMapsByLocation(lat, lon, radiusMeters)` | Fetches intersection maps near a point. |
| `loadMapsByName(name)` | Fetches one intersection map by name. |

Both map calls return an empty list on failure rather than throwing, and are independent of the automatic loading the client does as the device moves — use them to pre-load geometry for somewhere the device is *not*, such as a corridor ahead.

### The events

| Event | Source | Carries |
|---|---|---|
| `MSightLocationEvent` | This device | A rate-limited GNSS fix |
| `MSightSdsmEvent` | Roadside sensor, via cloud | One SDSM frame: reference position + detected objects |
| `MSightSpatEvent` | Signal controller, via cloud | Routine SPaT, ~2 Hz |
| `MSightCriticalSpatEvent` | Signal controller, via cloud | Phase-change SPaT, low latency |
| `MSightSignalStateEvent` | **Derived by this library** | The signal colours facing this device |
| `MSightSimpleWarning` | Cloud microservice | A radius-scoped text warning |
| `MSightTwoVehicleConflictEvent` | Contract only | V2V conflict with trajectories |
| `MSightVehicleVRUConflictEvent` | Contract only | Vehicle–VRU conflict with trajectories |

Every event carries `timestampMillis` (Unix epoch ms — the upstream sensor's own time where available, not the time of receipt) and a nullable `eventId` (the cloud's per-broadcast identifier, for de-duplication and log correlation).

The two conflict events are part of the event contract but are **not emitted by any current cloud microservice**. `MSightFakeWarnings` produces them so warning UI can be built and tested before a producer exists.

### Feature 1 — The device's own position

```kotlin
is MSightLocationEvent -> {
    map.moveCamera(event.latitude, event.longitude)
    speedometer.show(event.speedMps)
}
```

Emitting these is a side effect of the upload the client performs anyway, so you can drive your map view from this flow instead of subscribing to platform location APIs separately. Fields: `latitude`, `longitude`, `altitudeMeters`, `accuracyMeters`, `speedMps`, `bearingDegrees`, `provider`.

### Feature 2 — Roadside perception (SDSM)

```kotlin
is MSightSdsmEvent -> {
    event.objects.forEach { obj ->
        // obj.pos is a METRE OFFSET from event.refPos, not absolute coordinates
        val (lat, lon) = offsetToLatLon(event.refPos, obj.pos)
        markers.upsert(obj.objectID, lat, lon, obj.heading, obj.objectType)
    }
}
```

Each `SdsmDetectedObject` carries `objectType`, `objectID`, `pos`, `speed`, `heading`, `vehicleSize`, `vehicleClass` and per-field confidences.

!!! warning "Two SDSM details that will bite you"
    **Offset axes are reversed from the J2735 norm.** In the SDSM stream `offsetX` is metres **north** and `offsetY` is metres **east** — the opposite of MAP lane geometry, which does follow the standard's east/north convention. The library passes the values through unchanged, so converting them correctly is the consumer's job. Getting this wrong puts detections at right angles to where they are.

    **One logical frame can arrive as several messages.** Merge detections whose timestamp is within ~50 ms of the previous frame's into the existing marker set instead of replacing it — otherwise each fragment erases what the others delivered.

Key markers by `objectID` and update them in place, so a tracked object keeps its marker across frames rather than flashing as it is destroyed and recreated.

### Feature 3 — Signal state facing the driver

This is the feature most driver-facing applications are built around. It is **off by default**:

```kotlin
client.setSpatEnabled(true)

// …
is MSightSignalStateEvent -> {
    if (event.intersectionName == null) {
        signalOverlay.hide()          // the ONLY take-down signal you get
    } else {
        signalOverlay.show(
            straight = event.straightColor,     // GREEN | YELLOW | RED | UNKNOWN
            leftTurn = event.leftTurnColor,
            single   = event.showSingleLight
        )
    }
}
```

| Field | Meaning |
|---|---|
| `intersectionName` | The matched intersection, or **`null`** when the device is not approaching any known intersection |
| `straightColor` / `leftTurnColor` | `SignalColor.GREEN`, `YELLOW`, `RED` or `UNKNOWN` |
| `showSingleLight` | `true` when the arm has exactly one signal group covering all movements |
| `straightSignalGroupIds` / `leftTurnSignalGroupIds` | The underlying J2735 signal groups, for applications that want them |

!!! danger "A null `intersectionName` means *take the display down*"
    It is the only take-down signal you get. Treat it as one rather than filtering it out — otherwise a stale signal colour stays on screen after the driver has left the intersection.

Approach detection needs a **direction of travel**. The library trusts the GNSS bearing only above 2 m/s, falls back to the heading frozen at the last clearly-moving fix, and failing that infers one from position history — but only once two fixes are at least 10 m apart, so GNSS jitter is not mistaken for motion. A device that has been stationary since launch satisfies none of the three, which is why testing means driving the approach rather than starting the app at the stop bar.

### Feature 4 — Raw SPaT, if you want it

Both raw streams remain available alongside the derived event:

```kotlin
is MSightSpatEvent         -> renderRawSpat(event.intersection)      // routine, ~2 Hz
is MSightCriticalSpatEvent -> renderRawSpat(event.intersection)      // on phase change only
```

The critical stream travels a shorter path and lands **before** the rate-limited regular stream reports the same change. If you render both yourself, expect the regular stream to trail it with a few stale frames still carrying the *old* colour. The library's own signal processor already suppresses those — one more reason to prefer `MSightSignalStateEvent`.

### Feature 5 — Warnings

```kotlin
is MSightSimpleWarning -> {
    // event.eventId identifies the hazard, not the broadcast
    banner.showOrExtend(id = event.eventId, text = event.message)
}
```

A repeated broadcast of one ongoing hazard shares an `eventId`, so keying on it lets you **extend** an existing alert rather than restarting it.

For development before a cloud producer exists, `WarningEmitter` is a host-driven warning channel and `MSightFakeWarnings` synthesises the two conflict event shapes.

### Feature 6 — Intersection geometry

```kotlin
val maps = client.loadMapsByLocation(lat, lon, radiusMeters = 300)
maps.forEach { drawLaneGeometry(it) }

// Resolve geometry for an intersection whose SPaT arrived before its map loaded
val map = client.loadMapsByName(spatEvent.intersectionName ?: return).firstOrNull()
```

`MSightApproachDetector` also exposes its two pure functions — `detectActiveApproach` and `extractArmSignals` — for callers that want to run the geometry themselves, for instance to display signal state for an intersection the device is **not** approaching.

---

## ⚠️ Things Worth Knowing Before You Build

* **`start()` is not optional.** Without it the socket is open but the device has no position, so the cloud has nothing to scope its pushes against and sends nothing. A silent client is nearly always one that was never started, or one whose location permission was denied.
* **The constructor blocks and can throw.** It returns a connected client or an exception — never a half-live object. Call it off the main thread and handle the failure.
* **Callbacks arrive on the library's dispatcher.** Hop to your main thread before touching UI.
* **Events are dropped, not queued, under backpressure.** Emission uses `tryEmit` into a 64-slot buffer so a slow collector cannot stall the network reader. Keep collectors cheap; hand heavy work off.
* **Subscribe before `start()`.** The flow is hot with no replay — events emitted before a collector subscribes are gone.
* **`appId` must be registered** in the MSight Cloud admin console. An unregistered one connects successfully and receives nothing.
* **`clientId` must be unique per device.** Two live connections sharing one collide in the cloud's connection registry. Generate and persist one per install.
* **An instance is single-use.** After `close()`, construct a new one.

---

## 🖥️ Platform Support

All protocol handling, MAP geometry and the signal state machine live in `commonMain` and are platform-independent. Every platform needs exactly two `actual` implementations — `createPlatformHttpClient` (a Ktor client with WebSocket support) and `PlatformContext` / `PlatformLocationProvider` (a wrapper over the platform's location API).

| Target | Status | Notes |
|---|---|---|
| **Android** | ✅ Tested | Field-tested. OkHttp engine, Play services fused location. `minSdk 24`, `compileSdk 35`. Also the path for Android-based IVI head units. |
| **JVM / Desktop** | ⚠️ Partial | Builds and runs with a *simulated* location source. Intended as a deployment smoke test, not a desktop application platform. |
| **iOS** | 🚧 Coming soon | Targets and an XCFramework block are present but commented out in `shared/build.gradle.kts`, with step-by-step notes. Needs a Ktor **Darwin** engine and a `CLLocationManager` wrapper. |
| **JavaScript** | 🚧 Coming soon | Needs the Ktor **Js** engine and a Geolocation API wrapper. |
| **macOS / Windows / Linux** (native) | 🚧 Coming soon | Architecture supports them; untested. |
| **Wasm** | ⛔ Not available | Ktor 2.3.x has no `wasmJs` engine. |

"Coming soon" means the architecture supports it and no work has been done, not that a port is scheduled — contributions are welcome.

---

## 🧪 Trying It Without Writing an App

### The Android example app

`androidapp` in the repository is a complete worked example — "MSight Shield". A configuration screen collects the three values, then a live view shows a Google map following the device, SDSM detections as markers, lane geometry tinted by the current phase, a neon signal overlay for the approach the device is on, and full-screen warning banners.

```bash
./gradlew :androidapp:assembleDebug     # build the debug APK
./gradlew :androidapp:installDebug      # install on the current device or emulator
```

It needs a [Google Maps API key](https://console.cloud.google.com/google/maps-apis) in `local.properties` as `MAPS_API_KEY` — the **library itself does not**. Without one the build still succeeds and the app still runs; only the map renders blank.

!!! note "What the example is not set up to do"
    Run in the background. There is no foreground service, so the client stops when Android suspends the activity. A production driver-facing application needs one, plus a ViewModel in place of the activity-held state the example uses for brevity.

The repository's `.kml` files are 1 Hz GNSS tracks approaching the instrumented Huron Parkway / Plymouth Road intersection in Ann Arbor from five directions. Load one into the Android emulator's extended controls (`Location > Routes > Import GPX/KML`) to replay an approach without driving it. Each includes a twenty-second stop with synthetic GNSS noise at the stop bar, which exercises the hardest case in the signal state machine.

### Checking a deployment with no device at all

The JVM target runs the whole client — connection, upload, parsing — against a simulated location, printing every event:

```bash
MSIGHT_CLOUD_URL=https://your-deployment.example.com \
MSIGHT_APP_ID=your-app \
MSIGHT_CLIENT_ID=desktop-test \
./gradlew :shared:runJvmMain
```

This is the fastest way to tell *"the deployment is unreachable"* apart from *"the app is misconfigured"*.

---

## 🔗 Cloud Endpoints Used

The library uses four routes from MSight Cloud's public client API, all unauthenticated:

| Route | Used for |
|---|---|
| `GET /system/websocket-url` | Discovering the WebSocket endpoint, on every connection attempt |
| `POST /v1/clients/location/update` | Reporting position, so the cloud can scope pushes by radius |
| `GET /v1/maps/search?lat&lon&radius` | Loading intersection geometry for the current area |
| `GET /v1/maps/{name}` | Loading one intersection's geometry by name |

The WebSocket carries `app_id` and `client_id` as query parameters and is **push-only** — the client never sends a frame. Unrecognised message types are logged and skipped, so a cloud deployment can add message types without breaking clients already in the field.

!!! warning "These routes are unauthenticated by design"
    Anyone who knows your deployment URL and a registered `app_id` can report locations and receive pushes. Treat the deployment URL as a shared secret, and read [MSight Cloud's security notes](../cloud-integration/msight-cloud.md#security-notes) before exposing a deployment to untrusted clients.

---

## 🧯 Troubleshooting

| Symptom | Most likely cause |
|---|---|
| **Connects but no events arrive** | In order of likelihood: `start()` was never called; location permission denied; `app_id` not registered in the deployment's console; the device is genuinely not near an instrumented intersection. |
| **The constructor throws** | The deployment is unreachable or `cloudUrl` is wrong. Confirm with `curl {cloudUrl}/system/version` — it should return a `build_id`. |
| **No signal overlay at an instrumented intersection** | `setSpatEnabled(true)` was not called, or the device has been stationary since launch so no direction of travel could be established. Drive the approach. |
| **Detections appear at right angles** | The SDSM offset axes are the wrong way round — `offsetX` is **north**, `offsetY` is **east**. |
| **Gradle sync fails** | Android SDK 35 not installed, or Gradle not running on JDK 17. |
| **Blank map in the example app** | Missing or invalid `MAPS_API_KEY`. |

The library logs each stage to stdout (Logcat on Android). `MSightWebSocketConnection connected` confirms the socket; `MSightLocationUploader failed` points at the location path; the approach detector logs its accept/reject decision with distance and angle for every fix.

---

## 🧭 Where to Go Next

* **[MSight App Client Library on GitHub](https://github.com/michigan-traffic-lab/MSight_APP_Client_Library)** — source, issues, and the full README
* **[MSight Cloud](../cloud-integration/msight-cloud.md)** — deploying the cloud this library connects to, and registering the app
* **[Cloud Integration overview](../cloud-integration/index.md)** — how the cloud options compare
