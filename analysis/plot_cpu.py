import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
df=pd.read_csv(ROOT/'data/processed/alibaba_5machines_24h.csv')
ids=list(df.machine_id.unique())
if len(ids)!=5:raise ValueError('Need exactly five measured machines')
fig,axes=plt.subplots(5,1,figsize=(12,10),sharex=True,sharey=True)
colors=['#007d9c','#395fbc','#ac5500','#7151a9','#167c58']
for ax,machine,color in zip(axes,ids,colors):
    g=df[df.machine_id==machine].sort_values('timestamp_s')
    # Break lines across gaps >30 seconds; do not fill missing measurements.
    x=g.timestamp_s.to_numpy()/3600;y=g.cpu_util_pct.to_numpy(dtype=float)
    breaks=np.where(np.diff(g.timestamp_s.to_numpy())>30)[0]+1
    x=np.insert(x,breaks,np.nan);y=np.insert(y,breaks,np.nan)
    ax.plot(x,y,color=color,lw=.65)
    ax.set_ylim(0,100);ax.set_ylabel(f'{machine}\nCPU (%)');ax.grid(alpha=.18)
axes[-1].set_xlim(0,24);axes[-1].set_xticks(np.arange(0,25,2));axes[-1].set_xlabel('Hours since Alibaba trace start')
fig.suptitle('Alibaba 2018: measured CPU utilization for five machines over 24 hours',fontsize=14)
fig.text(.08,.015,'First five machine IDs encountered; no selection by spikiness. Gaps >30 s are left blank. No smoothing or synthetic data.',fontsize=9)
fig.tight_layout(rect=(0,.04,1,.96))
fig.savefig(ROOT/'analysis/cpu_5machines_24h.png',dpi=180)
fig.savefig(ROOT/'analysis/cpu_5machines_24h.pdf')
print('Saved plot and PDF')
