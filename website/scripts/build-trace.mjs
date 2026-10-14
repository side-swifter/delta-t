// Turns the repo's standard workload trace (real server2 CPU at 1 s) into a compact array for the hero panel.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../data/workload_trace_standard.csv')
const out = resolve(here, '../src/data/trace.json')

const rows = readFileSync(src, 'utf8').trim().split('\n').slice(1)
const cpu = rows.map((line) => Math.round(Number(line.split(',')[1])))
if (cpu.some((v) => !Number.isFinite(v))) throw new Error('trace has non-numeric CPU values')

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ source: 'data/workload_trace_standard.csv', intervalS: 1, cpu }))
console.log(`trace: ${cpu.length} samples -> src/data/trace.json`)
