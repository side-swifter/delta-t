"""Build the 45-minute Delta T standard workload trace from measured 1 s server CPU recordings.

Input: CSVs written by data/record_cpu_1s.py (unix_ts, cpu_util_pct, rapl_energy_uj).
Output: data/workload_trace_standard.csv (t_s, cpu_util_pct, heater_w), a JSON sidecar, and a plot.

The window is chosen from measured samples only: no smoothing, resampling, or synthetic spikes.
heater_w = idle_w + (max_w - idle_w) * cpu_util_pct / 100. If RAPL energy was recorded, idle/max come
from a least-squares fit of package power against CPU; otherwise the 5 W / 25 W per-chip placeholders
are used and flagged as awaiting P's confirmation.
"""
import argparse, json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
WINDOW_S = 2700
SPIKE_RISE_PP, SPIKE_WITHIN_S = 30.0, 5  # sharp spike: CPU rises >= 30 pp within 5 s
PLACEHOLDER_IDLE_W, PLACEHOLDER_MAX_W = 5.0, 25.0


def load(path):
    df = pd.read_csv(path)
    df['t'] = np.round(df.unix_ts - df.unix_ts.iloc[0]).astype(int)
    if df.t.duplicated().any() or (np.diff(df.t) != 1).any():
        raise ValueError(f'{path}: recording is not a gap-free 1 s series')
    return df


def max_rise(cpu):
    return max((cpu[k:] - cpu[:-k]).max() for k in range(1, SPIKE_WITHIN_S + 1))


def best_window(cpu):
    """Highest-variance 45 min window that contains at least one sharp spike."""
    best = None
    for s in range(0, len(cpu) - WINDOW_S + 1, 10):
        w = cpu[s:s + WINDOW_S]
        rise = max_rise(w)
        if rise < SPIKE_RISE_PP:
            continue
        if best is None or w.std() > best[1]:
            best = (s, w.std(), rise)
    return best


def rapl_fit(df):
    e = pd.to_numeric(df.rapl_energy_uj, errors='coerce').to_numpy()
    p = np.diff(e) / 1e6  # J over 1 s -> W; first sample has no previous reading
    cpu = df.cpu_util_pct.to_numpy()[1:]
    ok = np.isfinite(p) & (p >= 0)  # drops unreadable samples and counter wraparound
    if ok.sum() < 600:
        return None
    slope, idle = np.polyfit(cpu[ok], p[ok], 1)
    return {'idle_w': round(float(idle), 2), 'max_w': round(float(idle + 100 * slope), 2),
            'fit_samples': int(ok.sum()), 'cpu_range_pct': [float(cpu[ok].min()), float(cpu[ok].max())]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('recordings', nargs='+', type=Path)
    ap.add_argument('--out', type=Path, default=ROOT / 'data/workload_trace_standard.csv')
    args = ap.parse_args()

    candidates = []
    for path in args.recordings:
        df = load(path)
        w = best_window(df.cpu_util_pct.to_numpy())
        print(f'{path.name}: {len(df)} s recorded; best window', w)
        if w:
            candidates.append((w[1], path, df, w))
    if not candidates:
        raise SystemExit(f'No 45 min window with a >= {SPIKE_RISE_PP:.0f} pp spike; record during real work and rerun')
    _, path, df, (start, std, rise) = max(candidates, key=lambda c: c[0])

    power = rapl_fit(df)
    if power:
        idle_w, max_w, source = power['idle_w'], power['max_w'], 'measured RAPL package power, linear fit vs CPU'
    else:
        idle_w, max_w, source = PLACEHOLDER_IDLE_W, PLACEHOLDER_MAX_W, 'PLACEHOLDER per chip, awaiting P confirmation'

    cpu = df.cpu_util_pct.to_numpy()[start:start + WINDOW_S]
    out = pd.DataFrame({'t_s': np.arange(WINDOW_S), 'cpu_util_pct': cpu,
                        'heater_w': np.round(idle_w + (max_w - idle_w) * cpu / 100, 3)})
    out.to_csv(args.out, index=False)

    meta = {'source_recording': path.name, 'window_start_unix_ts': float(df.unix_ts.iloc[start]),
            'window_start_offset_s': int(start), 'duration_s': WINDOW_S, 'sample_interval_s': 1,
            'cpu_mean_pct': round(float(cpu.mean()), 2), 'cpu_std_pct': round(float(std), 2),
            'cpu_max_pct': float(cpu.max()), f'max_rise_within_{SPIKE_WITHIN_S}s_pp': round(float(rise), 2),
            'heater_mapping': 'heater_w = idle_w + (max_w - idle_w) * cpu_util_pct / 100',
            'idle_w': idle_w, 'max_w': max_w, 'power_source': source, 'rapl_fit': power}
    args.out.with_suffix('.json').write_text(json.dumps(meta, indent=2) + '\n')

    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.plot(out.t_s / 60, out.cpu_util_pct, color='#007d9c', lw=.7)
    ax.set_ylim(0, 100); ax.set_xlim(0, WINDOW_S / 60); ax.grid(alpha=.18)
    ax.set_xlabel('Minutes'); ax.set_ylabel('CPU utilization (%)', color='#007d9c')
    ax2 = ax.twinx(); ax2.set_ylim(idle_w, max_w); ax2.set_ylabel('Heater power (W)', color='#ac5500')
    tag = '' if power else '  [placeholder 5/25 W, awaiting P]'
    ax.set_title(f'Delta T standard workload trace: 45 min at 1 s, measured on {path.stem}{tag}')
    fig.tight_layout()
    fig.savefig(ROOT / 'analysis/workload_trace_standard.png', dpi=180)
    print(json.dumps(meta, indent=2))


if __name__ == '__main__':
    main()
