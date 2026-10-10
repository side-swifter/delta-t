#!/usr/bin/env python3
"""1 s CPU-utilisation (+ RAPL energy if readable) recorder. No deps."""
import os, sys, time
DUR = int(sys.argv[1]) if len(sys.argv) > 1 else 5400
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/deltat_trace/cpu_1s.csv")
RAPL = "/sys/class/powercap/intel-rapl:0/energy_uj"
def stat():
    with open("/proc/stat") as f:
        v = list(map(int, f.readline().split()[1:]))
    idle = v[3] + v[4]
    return sum(v[:8]), idle
def energy():
    try:
        with open(RAPL) as f: return f.read().strip()
    except OSError: return ""
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "a", buffering=1) as out:
    if out.tell() == 0: out.write("unix_ts,cpu_util_pct,rapl_energy_uj\n")
    t0 = time.monotonic(); prev = stat(); n = 0
    while n < DUR:
        n += 1
        time.sleep(max(0, t0 + n - time.monotonic()))
        cur = stat(); e = energy()
        dt, di = cur[0] - prev[0], cur[1] - prev[1]; prev = cur
        u = 100.0 * (dt - di) / dt if dt > 0 else 0.0
        out.write(f"{time.time():.3f},{u:.2f},{e}\n")
