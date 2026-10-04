# ESP32 + Raspberry Pi acceptance run

1. Use an ESP32 DevKit compatible with PlatformIO's `esp32dev` target. If yours differs, change the board ID. Connect powered DS18B20 VDD to 3.3 V, GND to GND, and data to GPIO4. Put a 4.7 kΩ pull-up between data and 3.3 V. Check the sensor's pinout; probe wire colors vary.
2. Install PlatformIO separately: `python -m pip install platformio==6.1.18`.
3. Build and flash from the repository root:
   ```sh
   pio run -d firmware
   pio run -d firmware -t upload
   ```
4. Connect ESP32 USB to Pi. Find the port:
   ```sh
   python -m serial.tools.list_ports
   ```
   Use its actual name below. Close any serial monitor before starting the logger. If required on Raspberry Pi OS, add your account to `dialout` and log in again.
5. Install requirements in a virtual environment, synchronize the Pi clock, then run:
   ```sh
   python logging/run_acceptance.py --port /dev/ttyUSB0
   ```
6. Expect approximately 3600 samples. The report passes only for a single logger session spanning >=3598 s, >=3598 records, no missing/duplicate/out-of-order samples, no restarts, no failed sensors, no device intervals outside 900–1100 ms, and no arrival intervals >1.5 s. USB buffering can fail arrival timing even when device timing is clean; inspect both metrics.
7. Gently warm the probe to confirm temperature changes. Disconnect it to confirm failure becomes null rather than an invented temperature. Run a fresh uninterrupted hour after these checks.

No physical ESP32 or Pi is attached to the authoring environment. A software test or JSON replay is not a one-hour hardware acceptance run. Firmware compilation and physical acceptance status are recorded separately in `docs/status.md`.

The command creates a unique CSV and JSON report, rejects a capture with malformed packets, and exits with a failure code if acceptance fails. It does not flash firmware; complete the upload step first.
