#!/usr/bin/env bash
# Run on your authenticated computer from the extracted starter.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v gh >/dev/null; then
  echo 'Install GitHub CLI, then run gh auth login before publishing.' >&2
  exit 1
fi
gh auth status
if git remote get-url origin >/dev/null 2>&1; then
  echo 'An origin remote already exists. Review it before pushing.' >&2
  exit 1
fi
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  git init -b main
fi
# Curated samples are deliberately included; large raw archives stay ignored.
git add .
git add -f data/processed/*.csv data/raw/google_2019_10000_records.jsonl.gz
if ! git diff --cached --quiet; then
  git commit -m 'Initialize Delta T trace and sensor pipeline'
fi
# gh refuses to create an already-existing repository. Private by default.
gh repo create delta-t --private --source=. --remote=origin --push
