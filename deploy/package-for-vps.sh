#!/bin/bash
set -e

echo "========================================="
echo "FloraOrders - Package for VPS Upload"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "[1/3] Building web frontend..."
npx expo export --platform web --output-dir dist

echo ""
echo "[2/3] Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=server_dist

echo ""
echo "[3/3] Creating deployment archive..."
tar -czf floraorders-deploy.tar.gz \
  dist/ \
  server_dist/ \
  shared/schema.ts \
  server/templates/ \
  deploy/ \
  migrations/ \
  drizzle.config.ts \
  package.json \
  app.json \
  2>/dev/null

ARCHIVE_SIZE=$(du -h floraorders-deploy.tar.gz | cut -f1)

echo ""
echo "========================================="
echo "Archive created: floraorders-deploy.tar.gz (${ARCHIVE_SIZE})"
echo "========================================="
echo ""
echo "Upload to VPS:"
echo "  scp floraorders-deploy.tar.gz root@YOUR_IP:/tmp/"
echo ""
