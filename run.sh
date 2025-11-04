#!/usr/bin/env bash
set -euo pipefail

pushd promptplay-backend >/dev/null
python main.py &
backend_pid=$!
popd >/dev/null

pushd promptplay-frontend >/dev/null
npm run dev &
frontend_pid=$!
popd >/dev/null

trap 'kill "$backend_pid" "$frontend_pid" 2>/dev/null || true' INT TERM EXIT
wait