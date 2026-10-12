#!/usr/bin/env sh
# Installation résiliente (réseau instable) : relance jusqu'à 8 fois.
export NODE_OPTIONS=--dns-result-order=ipv4first
i=1
while [ $i -le 8 ]; do
  echo "=== tentative $i"
  pnpm install --reporter=append-only "$@" && exit 0
  i=$((i+1))
  sleep 5
done
exit 1
