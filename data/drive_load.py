#!/usr/bin/env python3
"""Bursty real-process load (gzip compression of system libraries) so an idle box produces a varied CPU trace.
Each burst starts 1-4 compression workers for 5-120 s, separated by 15-240 s of quiet. Seeded for repeatability.
Usage: python3 drive_load.py [duration_s=4500] [seed=45]"""
import random, subprocess, sys, time
END = time.time() + (int(sys.argv[1]) if len(sys.argv) > 1 else 4500)
rng = random.Random(int(sys.argv[2]) if len(sys.argv) > 2 else 45)
CMD = "while :; do cat /usr/lib/x86_64-linux-gnu/*.so* 2>/dev/null | gzip -9 > /dev/null; done"
while time.time() < END:
    time.sleep(rng.uniform(15, 240))
    n, dur = rng.randint(1, 4), rng.uniform(5, 120)
    print(f'{time.time():.0f} burst {n} workers {dur:.0f} s', flush=True)
    ps = [subprocess.Popen(['timeout', f'{dur:.0f}', 'sh', '-c', CMD]) for _ in range(n)]
    for p in ps:
        p.wait()
