# Real trace sources and sampling intervals

Prepared October 4, 2026. Download provenance and hashes are in `analysis/trace_manifest.json`.

## Alibaba 2018 machine usage

Official documentation: https://github.com/alibaba/clusterdata/blob/master/cluster-trace-v2018/trace_2018.md

Official schema: https://github.com/alibaba/clusterdata/blob/master/cluster-trace-v2018/schema.txt

Official fetch script: https://github.com/alibaba/clusterdata/blob/master/cluster-trace-v2018/fetchData.sh

Downloaded `machine_usage.tar.gz` from the URL in the official fetch script (HTTPS). Compressed size: 1,774,523,160 bytes. The archive contains an 8,996,532,344-byte CSV with 246,934,820 records. SHA256 matches the publisher's hash:

`3e6ee87fd204bb85b9e234c5c75a5096580fdabc8f085b224033080090753a7a`

Time is seconds since trace start, not Unix time. CPU is machine utilization in percent, 0–100. The **measured mode and median spacing are 10 seconds** for each of the five selected machines. The data is not a perfectly regular 10-second grid: missing intervals are substantial. The largest observed gap is 11,980 seconds. Do not forward-fill these gaps into training targets.

Selected the first five distinct machine IDs encountered before inspecting their CPU values. Scanned the complete archive and retained valid samples in the common interval `0 <= timestamp_s < 86400`. These five machines have 25,787 samples in that interval. This is a plot over a 24-hour observation window, with missing coverage shown as gaps, not five complete 24-hour recordings.

| Machine | Samples | Mean CPU % | Maximum CPU % | Largest change across an exact 10 s interval (percentage points) |
|---|---:|---:|---:|---:|
| m_1932 | 4,867 | 34.24 | 85 | 37 |
| m_1933 | 5,978 | 5.56 | 10 | 4 |
| m_1934 | 4,922 | 37.31 | 89 | 66 |
| m_1935 | 5,434 | 33.23 | 87 | 40 |
| m_1936 | 4,586 | 33.44 | 91 | 75 |

## Google 2019 instance usage sample

Official introduction: https://github.com/google/cluster-data/blob/master/ClusterData2019.md

Detailed documentation: https://drive.google.com/file/d/10r6cnJ5cJ89fPWCgj7j4LtLBqYN9RiI9/view

Downloaded the first `instance_usage` shard for cell A: https://storage.googleapis.com/clusterdata_2019_a/instance_usage-000000000000.json.gz

Compressed size: 498,371,634 bytes. SHA256: `5f27b14cbbe1cf4f31445859a1d09e3bdccbdec71f39abfa2ee89df0130c8522` (locally computed provenance hash, not checked against a publisher SHA256).

The packaged raw sample is the first 10,000 JSON records, gzip-compressed. It is a bounded, nonrandom shard-prefix sample. Its records contain actual start/end times; **7,290 records span 300 seconds (5 minutes)**, and the remaining 2,710 span shorter windows of 1–299 seconds. Timestamps are microseconds; compute the exact window as `(end_time - start_time) / 1e6`. Do not assign every record a constant interval.

`average_usage.cpus` is normalized instance CPU usage, not machine utilization percent. A single shard omits instances needed for a complete machine total. Whole-machine percentage would require all relevant instance records plus machine capacity and correct time-window alignment. The sample is useful for inspecting schemas and usage dynamics, not for a five-machine utilization comparison with Alibaba.

Google publishes this trace under CC-BY. Credit Google cluster-usage traces v3 / John Wilkes when reusing it. Preserve both publishers' source references and applicable dataset terms; no new license is asserted over their data.

## Interpretation for Delta T

Four selected machines show sharp changes; one stays near low utilization. Spikiness supports evaluating proactive cooling, but **does not demonstrate predictability or prove that predictive control beats reactive control**. A model could fail on abrupt unforecastable spikes. CPU usage is also only a workload proxy; these traces contain no paired Delta T temperatures.

Next: split chronologically, exclude gaps from windows, compare against persistence and moving-average predictors, then compare reactive versus predictive control under the same physical thermal conditions. Measure temperature overshoot, energy, and controller stability. Match workload replay speed to the thermal system; a one-second sensor loop does not increase a trace's information resolution.
