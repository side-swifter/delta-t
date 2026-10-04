"""Download to .part, verify Alibaba checksum, and promote only completed files."""
import hashlib,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FILES=[('alibaba_machine_usage.tar.gz','https://aliopentrace.oss-cn-beijing.aliyuncs.com/v2018Traces/machine_usage.tar.gz','3e6ee87fd204bb85b9e234c5c75a5096580fdabc8f085b224033080090753a7a'),('google_instance_usage_sample.json.gz','https://storage.googleapis.com/clusterdata_2019_a/instance_usage-000000000000.json.gz',None)]
for name,url,expected in FILES:
    dest=ROOT/'data/raw'/name;dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():print('Already present:',dest);continue
    temp=dest.with_suffix(dest.suffix+'.part');h=hashlib.sha256();size=0
    with urllib.request.urlopen(url,timeout=60) as src,temp.open('wb') as out:
        length=src.headers.get('Content-Length')
        while True:
            b=src.read(1024*1024)
            if not b:break
            out.write(b);h.update(b);size+=len(b)
    if length and size!=int(length):raise ValueError('Incomplete download')
    if expected and h.hexdigest()!=expected:raise ValueError('Checksum mismatch')
    temp.replace(dest);print(name,size,h.hexdigest())
