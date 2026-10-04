# Delta T

Starter repository for trace-driven predictive thermal control experiments.

## Layout

`firmware/` ESP32 acquisition; `logging/` Pi serial logger and checks; `data/raw/` original inputs; `data/processed/` extracted samples; `models/` predictors; `control/` controllers; `analysis/` plots and reports; `docs/` schema and instructions; `cad/` mechanical designs.

## Install (everyone uses this file)

Python 3.11 recommended. On a Pi, use 64-bit Raspberry Pi OS and a Python version with compatible package wheels.

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
```

Top-level versions are pinned; this is not a complete transitive lockfile. Platform-specific wheels, especially XGBoost on the Pi, may require additional build setup.

## Trace workflow

The downloadable starter includes five Alibaba machines over the first 24 trace hours and 10,000 genuine Google instance-usage records. Full archives are excluded from Git and the starter ZIP. They were downloaded during preparation; re-fetch them only to regenerate samples. Allow about 2.3 GB for compressed inputs and additional space for outputs. Alibaba is read in chunks without extracting its 9 GB CSV.

```sh
python data/download_traces.py
python analysis/prepare_traces.py
python analysis/plot_cpu.py
```

See `analysis/trace_manifest.json` for provenance/checksums and `docs/traces.md` for sampling intervals and limitations. Do not treat Google instance usage as whole-machine CPU utilization.

## Hardware run

Follow `docs/hardware_run.md`. The logging schema is `docs/csv_schema.md`.

```sh
python -m unittest discover -s tests -v
```

## Repository

Private project repository: https://github.com/side-swifter/delta-t

Clone this repository on your computer, or download it from GitHub. Curated trace samples are included; the full source archives remain excluded. All nine requested directories are present.

## One-hour hardware acceptance

After wiring, flashing, and installing dependencies on the Pi:

```sh
python logging/run_acceptance.py --port /dev/ttyUSB0
```

Use the actual serial port. This runs for one hour, creates a fresh log, and saves an acceptance report. A passing software test is not hardware acceptance.

The CSV schema now reserves all planned eight-node hybrid-cooling measurements and set-points, including humidity, derived dew point, coldest surface, and separate cooling-component power. See `docs/csv_schema.md`; added hardware channels remain blank until connected. The logger performs acquisition and analysis only; the thermal model, workload predictor, and optimizer are subsequent project phases outside this original checklist.
