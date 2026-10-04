import argparse,csv,json
from collections import Counter
from datetime import datetime
from pathlib import Path

def check(path, expected_seconds=3600):
    with Path(path).open(newline="") as f: rows=list(csv.DictReader(f))
    if not rows: return {"rows":0,"pass":False,"reason":"empty log"}
    keys=[(r["device_id"],r["boot_id"],r["seq"]) for r in rows]
    dup=sum(n-1 for n in Counter(keys).values())
    missing=0; irregular=0; arrival_gaps=0; out_of_order=0; resets=0
    for prev,cur in zip(rows,rows[1:]):
        same=prev["device_id"]==cur["device_id"] and prev["boot_id"]==cur["boot_id"]
        if not same: resets+=1; continue
        delta=int(cur["seq"])-int(prev["seq"])
        if delta>1: missing+=delta-1
        if delta<0: out_of_order+=1
        ms=(int(cur["uptime_ms"])-int(prev["uptime_ms"])) % (2**32)
        if not 900 <= ms <= 1100: irregular+=1
        if cur["session_id"]==prev["session_id"]:
            dt=(int(cur["host_monotonic_ns"])-int(prev["host_monotonic_ns"]))/1e9
            if dt>1.5: arrival_gaps+=1
    duration=(datetime.fromisoformat(rows[-1]["timestamp_utc"])-datetime.fromisoformat(rows[0]["timestamp_utc"])).total_seconds()
    bad=sum(r["sensor_ok"]!="True" for r in rows)
    sessions=len({r["session_id"] for r in rows})
    required=max(1,int(expected_seconds)-2)
    result=dict(rows=len(rows),duration_s=duration,duplicate_samples=dup,missing_samples=missing,irregular_device_intervals=irregular,arrival_gaps_over_1_5s=arrival_gaps,out_of_order_samples=out_of_order,device_restarts_or_changes=resets,sensor_failures=bad,sessions=sessions)
    result["pass"]=duration>=expected_seconds-2 and len(rows)>=required and sessions==1 and not any((dup,missing,irregular,arrival_gaps,out_of_order,resets,bad))
    return result
if __name__=="__main__":
    ap=argparse.ArgumentParser();ap.add_argument("csv");ap.add_argument("--expected-seconds",type=float,default=3600);ap.add_argument("--report",type=Path)
    a=ap.parse_args();r=check(a.csv,a.expected_seconds);s=json.dumps(r,indent=2);print(s)
    if a.report: a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(s+"\n")
    raise SystemExit(0 if r["pass"] else 1)
