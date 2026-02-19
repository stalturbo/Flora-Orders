#!/bin/bash
set -e

echo "========================================="
echo "FloraOrders - Deploy Application"
echo "========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy.sh"
  exit 1
fi

APP_DIR="/opt/floraorders"
APP_USER="floraorders"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[1/6] Stopping application..."
systemctl stop floraorders 2>/dev/null || true

echo ""
echo "[2/6] Copying application files..."
cp -r ${PROJECT_DIR}/dist ${APP_DIR}/
cp -r ${PROJECT_DIR}/server_dist ${APP_DIR}/
cp ${PROJECT_DIR}/package.json ${APP_DIR}/
cp ${PROJECT_DIR}/app.json ${APP_DIR}/ 2>/dev/null || true

mkdir -p ${APP_DIR}/server/templates
cp ${PROJECT_DIR}/server/templates/*.html ${APP_DIR}/server/templates/ 2>/dev/null || true

mkdir -p ${APP_DIR}/shared
cp ${PROJECT_DIR}/shared/schema.ts ${APP_DIR}/shared/ 2>/dev/null || true

if [ -d "${PROJECT_DIR}/migrations" ]; then
  cp -r ${PROJECT_DIR}/migrations ${APP_DIR}/
fi

echo ""
echo "[3/6] Installing production dependencies..."
cd ${APP_DIR}
npm install --omit=dev --ignore-scripts 2>/dev/null || npm install --production --ignore-scripts

echo ""
echo "[4/6] Running database migrations..."
source ${APP_DIR}/.env
export DATABASE_URL
cd ${APP_DIR}
npx drizzle-kit push --force 2>/dev/null || echo "Note: Run migrations manually if needed"

echo ""
echo "[5/6] Setting permissions..."
chown -R ${APP_USER}:${APP_USER} ${APP_DIR}

echo ""
echo "[6/6] Starting application..."
systemctl start floraorders
systemctl enable floraorders

echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "Check status: systemctl status floraorders"
echo "View logs:    journalctl -u floraorders -f"
echo ""
