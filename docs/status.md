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
| ESP32 firmware v0 | Written and compiled | PlatformIO esp32dev build succeeded; 21,536 B RAM, 274,933 B flash; physical sensor test pending |
| Pi logger v0 | Software verified | UTC timestamps, append-only CSV, packet validation, sequence/boot IDs; Original 7 unit tests plus 3 hybrid-schema tests passed; earlier pseudo-terminal integration passed |
| One-hour physical run | Not run | Must connect ESP32 to Pi and follow docs/hardware_run.md |
| CSV schema | Draft complete | Expanded for eight nodes, humidity/dew point, coolant surfaces, separate component power and all planned set-points; map physical channels before integration |
| Share with P and … | Not sent | Instruction is truncated; recipients/channel needed; docs/team_handoff.md prepared |

The starter ZIP contains curated trace samples, not the two large source archives. Reproduction commands fetch the originals. Software tests used simulated records and do not establish physical sensor correctness or a successful one-hour run.

Validation environment: Linux x86_64, Python 3.12. Dependency installation verified here; Python 3.11 is recommended for team deployment. Raspberry Pi package installation has not been tested on a physical Pi.
