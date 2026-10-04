"""Stream Alibaba archive; retain 5 preselected machines, first trace day.
Extract a bounded Google instance-level sample; do not mistake it for machine utilization.
"""
import argparse, gzip, hashlib, io, json, tarfile
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]

def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(8*1024*1024),b''):h.update(b)
    return h.hexdigest()

def alibaba():
    path=ROOT/'data/raw/alibaba_machine_usage.tar.gz'
    sha=digest(path)
    expected='3e6ee87fd204bb85b9e234c5c75a5096580fdabc8f085b224033080090753a7a'
    if sha!=expected:raise ValueError('Alibaba SHA256 mismatch')
    ids=None;parts=[];total=0
    with tarfile.open(path,'r:gz') as tar:
        for member in tar:
            if not member.isfile() or not member.name.endswith('machine_usage.csv'):continue
            for c in pd.read_csv(tar.extractfile(member),header=None,usecols=[0,1,2],names=['machine_id','timestamp_s','cpu_util_pct'],chunksize=1_000_000):
                if ids is None:ids=list(c.machine_id.drop_duplicates().iloc[:5]);print('Selected without inspecting CPU values:',ids,flush=True)
                total+=len(c)
                parts.append(c[c.machine_id.isin(ids)&c.timestamp_s.between(0,86400,inclusive='left')])
                if total%20_000_000==0:print('Scanned',total,flush=True)
    data=pd.concat(parts).sort_values(['machine_id','timestamp_s'])
    duplicates=int(data.duplicated(['machine_id','timestamp_s']).sum())
    data=data.drop_duplicates(['machine_id','timestamp_s'],keep='first')
    invalid=int((~data.cpu_util_pct.between(0,100)).sum())
    data=data[data.cpu_util_pct.between(0,100)]
    data.to_csv(ROOT/'data/processed/alibaba_5machines_24h.csv',index=False)
    stats=[]
    for machine,g in data.groupby('machine_id'):
        d=g.timestamp_s.diff().dropna();positive=d[d>0]
        stats.append(dict(machine_id=machine,rows=len(g),first_s=float(g.timestamp_s.min()),last_s=float(g.timestamp_s.max()),mode_interval_s=float(positive.mode().iloc[0]),median_interval_s=float(positive.median()),p95_interval_s=float(positive.quantile(.95)),max_interval_s=float(positive.max()),mean_cpu_pct=float(g.cpu_util_pct.mean()),max_cpu_pct=float(g.cpu_util_pct.max()),max_10s_jump_percentage_points=float(g.cpu_util_pct.diff().abs()[g.timestamp_s.diff()==10].max())))
    return dict(url='https://aliopentrace.oss-cn-beijing.aliyuncs.com/v2018Traces/machine_usage.tar.gz',sha256=sha,checksum_verified=True,archive_rows_scanned=total,selection='first five unique machine IDs in first chunk; 0 <= trace seconds < 86400',duplicate_machine_timestamps_removed=duplicates,invalid_cpu_values_removed=invalid,machines=stats)

def google(limit):
    path=ROOT/'data/raw/google_instance_usage_sample.json.gz'
    out=ROOT/'data/raw/google_2019_10000_records.jsonl.gz'
    flat=[];intervals=[]
    with gzip.open(path,'rt') as source,gzip.open(out,'wt') as dest:
        for i,line in enumerate(source):
            if i>=limit:break
            p=json.loads(line);dest.write(line)
            start=int(p['start_time']);end=int(p['end_time']);intervals.append((end-start)/1e6)
            flat.append(dict(machine_id=p.get('machine_id'),collection_id=p['collection_id'],instance_index=p['instance_index'],start_time_us=start,end_time_us=end,window_s=(end-start)/1e6,average_cpu_normalized=p['average_usage']['cpus']))
    pd.DataFrame(flat).to_csv(ROOT/'data/processed/google_2019_instance_usage_sample.csv',index=False)
    return dict(url='https://storage.googleapis.com/clusterdata_2019_a/instance_usage-000000000000.json.gz',sha256=digest(path),download_bytes=path.stat().st_size,records_extracted=len(flat),window_s_counts=pd.Series(intervals).value_counts().to_dict(),window_summary=dict(nominal_s=300,exact_300_s_records=intervals.count(300),shorter_window_records=sum(x<300 for x in intervals),minimum_observed_s=min(intervals),maximum_observed_s=max(intervals)),note='Instance-level normalized CPU usage. Shard incomplete for machine aggregation; no machine CPU percentages inferred.')

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--source',choices=['alibaba','google','both'],default='both');a.add_argument('--google-records',type=int,default=10000);args=a.parse_args()
    report={}
    if args.source in ('google','both'):report['google_2019']=google(args.google_records)
    if args.source in ('alibaba','both'):report['alibaba_2018']=alibaba()
    dest=ROOT/'analysis/trace_manifest.json'
    if dest.exists():report={**json.loads(dest.read_text()),**report}
    dest.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
