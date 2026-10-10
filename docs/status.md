# Delta T starter status

| Checklist item | Status | Evidence / next action |
|---|---|---|
| Repository folders | Published | All nine requested directories exist; empty directories have .gitkeep |
| GitHub repository | Published privately | https://github.com/side-swifter/delta-t |
| Pinned requirements | Verified | All seven requested packages installed at pinned versions in a fresh environment; pip check passed |
| Alibaba 2018 machine usage | Downloaded and verified | Full official archive fetched; publisher SHA256 verified; all 246,934,820 rows scanned |
| Google 2019 sample | Downloaded and extracted | Full 498,371,634-byte shard fetched; 10,000 raw records packaged with normalized CSV |
| Sampling intervals | Documented | Alibaba measured mode/median 10 s with gaps; Google nominal 300 s, shorter actual windows retained |
| Five-machine 24-hour plot | Complete | PNG and PDF in analysis; 25,787 genuine measurements; missing coverage shown as gaps |
| ESP32 firmware v0 | Written, compiled, running on hardware | Board is ESP32-S3 (`board = esp32-s3-devkitc-1`; PlatformIO env still named esp32dev); original esp32dev build was 21,536 B RAM, 274,933 B flash; passed the one-hour physical run |
| Pi logger v0 | Software verified | UTC timestamps, append-only CSV, packet validation, sequence/boot IDs; Original 7 unit tests plus 3 hybrid-schema tests passed; earlier pseudo-terminal integration passed |
| One-hour physical run | Passed | 2026-10-10 01:08:53 to 02:08:53 UTC over /dev/ttyACM0: 3,601 rows, 0 missing/duplicate/out-of-order/rejected, 0 sensor failures, 0 restarts, logger exit 0; Pi `throttled=0x0`. DS18B20 read 27.06 to 28.13 °C (mean 27.43, SD 0.28, max 1 s step 0.0625 °C). Data: data/raw/sensor_1h_20261010T010852134157Z.csv; report: analysis/sensor_1h_20261010T010852134157Z_report.json |
| CSV schema | Draft complete | Expanded for eight nodes, humidity/dew point, coolant surfaces, separate component power and all planned set-points; map physical channels before integration |
| Share with P and … | Not sent | Instruction is truncated; recipients/channel needed; docs/team_handoff.md prepared |

The starter ZIP contains curated trace samples, not the two large source archives. Reproduction commands fetch the originals. Software tests used simulated records and do not establish physical sensor correctness or a successful one-hour run.

Validation environment: Linux x86_64, Python 3.12. Dependency installation verified here; Python 3.11 is recommended for team deployment. Raspberry Pi package installation has not been tested on a physical Pi.
