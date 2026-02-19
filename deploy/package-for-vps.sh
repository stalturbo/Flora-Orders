#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "[1/4] Сборка фронтенда..."
rm -rf dist/_expo/static/js/web/*
npx expo export --platform web

echo ""
echo "[2/4] Сборка сервера..."
npx esbuild server/index.ts --bundle --platform=node --target=node18 --outdir=server_dist --packages=external --format=cjs

echo ""
echo "[3/4] Создание архива..."
tar -czf deploy-package.tar.gz \
  dist/ \
  server_dist/ \
  shared/ \
  package.json \
  package-lock.json

echo ""
echo "[4/4] Загрузка архива..."
cp deploy-package.tar.gz /tmp/deploy-package.png
UPLOAD_RESPONSE=$(curl -s --max-time 120 -F "file=@/tmp/deploy-package.png" https://tmpfiles.org/api/v1/upload)
rm -f /tmp/deploy-package.png
UPLOAD_URL=$(echo "$UPLOAD_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

if [ -z "$UPLOAD_URL" ]; then
  echo "Ошибка загрузки!"
  echo "$UPLOAD_RESPONSE"
  exit 1
fi

DL_URL=$(echo "$UPLOAD_URL" | sed 's|tmpfiles.org/|tmpfiles.org/dl/|')

echo ""
echo "========================================="
echo "Готово! Выполни на VPS:"
echo "========================================="
echo ""
echo "cd /opt/floraorders && rm -rf dist/ server_dist/ && wget -O deploy-package.tar.gz \"${DL_URL}\" && tar xzf deploy-package.tar.gz && sudo systemctl restart floraorders"
echo ""
