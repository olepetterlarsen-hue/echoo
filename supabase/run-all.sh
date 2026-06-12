#!/usr/bin/env bash
# Konsoliderer alle migrasjonene til én SQL-stream for one-shot Supabase-setup.
# Kjør: bash supabase/run-all.sh > all-migrations.sql
# Lim deretter inn i Supabase SQL Editor.
set -euo pipefail
cd "$(dirname "$0")/migrations"
for f in $(ls *.sql | sort); do
  echo "-- ============================================================"
  echo "-- File: $f"
  echo "-- ============================================================"
  cat "$f"
  echo
done
