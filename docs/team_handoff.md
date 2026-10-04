# Team handoff draft

Delta T's starter contains the agreed folder structure, pinned Python dependencies, an ESP32 DS18B20 serial sender, a Pi logger, log validation, real cluster trace samples, and a draft CSV schema.

Please review `docs/csv_schema.md` and confirm the complete sensor/actuator inventory and names. Only `temp_probe_1_c` is wired in v0; the logger now accepts eight node channels, humidity, surface temperatures, component power and cooling set-points. It computes dew point and surface margin when measurements are available. Unimplemented channels stay blank.

Everyone should create a virtual environment and install `requirements.txt`. See `README.md` for commands and `docs/hardware_run.md` for the required physical one-hour acceptance run.

The share instruction ended at “P and”; recipient identities and a delivery channel are still needed. This note has been prepared but has not been sent.
