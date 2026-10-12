#!/usr/bin/env sh
# Utilise « docker compose » (plugin) si disponible, sinon « docker-compose ».
if docker compose version >/dev/null 2>&1; then
  exec docker compose "$@"
else
  exec docker-compose "$@"
fi
