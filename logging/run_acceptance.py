"""Run a real serial capture and persist its one-hour acceptance report."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
from check_log import check


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--port', required=True, help='Actual ESP32 serial port')
    ap.add_argument('--baud', type=int, default=115200)
    ap.add_argument('--seconds', type=int, default=3600)
    args = ap.parse_args()
    if args.seconds < 3600:
        ap.error('hardware acceptance requires at least 3600 seconds')
    root = Path(__file__).resolve().parents[1]
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    output = root / 'data/raw' / f'sensor_1h_{stamp}.csv'
    report_path = root / 'analysis' / f'sensor_1h_{stamp}_report.json'
    command = [sys.executable, str(root / 'logging/serial_logger.py'), '--port', args.port,
               '--baud', str(args.baud), '--seconds', str(args.seconds), '--output', str(output)]
    print(f'Capturing from {args.port} for {args.seconds} seconds to {output}', flush=True)
    # Stderr remains visible; capture only the logger summary.
    try:
        run = subprocess.run(command, stdout=subprocess.PIPE, text=True)
    except KeyboardInterrupt:
        print('Interrupted: acceptance is incomplete.', file=sys.stderr)
        return 1
    summary = None
    if run.returncode == 0:
        try:
            summary = json.loads(run.stdout.strip())
        except ValueError:
            pass
    report = check(output, args.seconds) if output.exists() else {'pass': False, 'reason': 'capture failed'}
    report.update(mode='physical_serial', port=args.port, logger_exit_code=run.returncode,
                  capture_summary=summary, requested_duration_s=args.seconds)
    report['pass'] = bool(report['pass'] and summary and summary.get('mode') == 'serial'
                          and summary.get('rejected_records') == 0
                          and summary.get('elapsed_s', 0) >= args.seconds)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    print(f'Report: {report_path}')
    return 0 if report['pass'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
