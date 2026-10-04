"""Append valid device records, timestamped on receipt. Never overwrite logs."""
import argparse, csv, json, sys, time, uuid
from datetime import datetime, timezone
from pathlib import Path
from schema import FIELDS, validate_packet, derive_fields

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--port")
    ap.add_argument("--input", type=Path, help="JSONL replay only; not hardware validation")
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--seconds", type=float, default=3600)
    ap.add_argument("--baud", type=int, default=115200)
    a=ap.parse_args()
    if bool(a.port)==bool(a.input): ap.error("choose --port or --input")
    if a.seconds <= 0: ap.error("seconds must be positive")
    if a.input: source=a.input.open("rb")
    else:
        import serial
        source=serial.Serial(a.port,a.baud,timeout=1)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    existing=a.output.exists() and a.output.stat().st_size>0
    if existing:
        with a.output.open(newline="") as f:
            if next(csv.reader(f)) != FIELDS: raise ValueError("existing CSV header differs")
    session=str(uuid.uuid4()); start=time.monotonic(); rows=bad=0
    try:
        with source, a.output.open("a",newline="") as f:
            writer=csv.DictWriter(f,fieldnames=FIELDS)
            if not existing: writer.writeheader(); f.flush()
            while time.monotonic()-start < a.seconds:
                line=source.readline(16384)
                if not line:
                    if a.input: break
                    continue
                stamp=datetime.now(timezone.utc).isoformat(timespec="milliseconds")
                mono=time.monotonic_ns()
                try: p=derive_fields(validate_packet(json.loads(line)))
                except (ValueError, UnicodeDecodeError) as e:
                    bad+=1; print(f"Rejected record: {e}",file=sys.stderr); continue
                row={k:p.get(k) for k in FIELDS}
                row.update(timestamp_utc=stamp,host_monotonic_ns=mono,session_id=session)
                writer.writerow(row); f.flush(); rows+=1
    except KeyboardInterrupt: pass
    print(json.dumps({"rows":rows,"rejected_records":bad,"mode":"replay" if a.input else "serial", "elapsed_s":round(time.monotonic()-start,3)}))
if __name__=="__main__": main()
