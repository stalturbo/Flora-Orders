#!/bin/bash
set -e

echo "========================================="
echo "FloraOrders - VPS Installation Script"
echo "Ubuntu 22.04 / 24.04"
echo "========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo bash install.sh"
  exit 1
fi

APP_DIR="/opt/floraorders"
APP_USER="floraorders"
DB_NAME="floraorders"
DB_USER="floraorders"
DB_PASS=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -hex 32)
NODE_VERSION="20"

echo "[1/7] Updating system..."
apt-get update -y
apt-get upgrade -y

echo ""
echo "[2/7] Installing Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

echo ""
echo "[3/7] Installing and configuring PostgreSQL..."
if ! command -v psql &> /dev/null; then
  apt-get install -y postgresql postgresql-contrib
fi
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
echo "PostgreSQL configured!"

echo ""
echo "[4/7] Installing Nginx..."
if ! command -v nginx &> /dev/null; then
  apt-get install -y nginx
fi
systemctl enable nginx

echo ""
echo "[5/7] Creating application user and directory..."
id -u ${APP_USER} &>/dev/null || useradd -r -m -s /bin/bash ${APP_USER}
mkdir -p ${APP_DIR}
chown -R ${APP_USER}:${APP_USER} ${APP_DIR}

echo ""
echo "[6/7] Creating environment file..."
cat > ${APP_DIR}/.env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
SESSION_SECRET=${SESSION_SECRET}
EOF
chown ${APP_USER}:${APP_USER} ${APP_DIR}/.env
chmod 600 ${APP_DIR}/.env

echo ""
echo "[7/7] Creating systemd service..."
cat > /etc/systemd/system/floraorders.service << EOF
[Unit]
Description=FloraOrders Application
After=network.target postgresql.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node server_dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo ""
echo "========================================="
echo "Installation complete!"
echo "========================================="
echo ""
echo "Database credentials saved to: ${APP_DIR}/.env"
echo "Database password: ${DB_PASS}"
echo ""
echo "SAVE THIS PASSWORD! It won't be shown again."
echo ""
echo "Next steps:"
echo "1. Upload your application code to ${APP_DIR}"
echo "2. Configure Nginx (see deploy/nginx.conf)"
echo "3. Start the application: systemctl start floraorders"
echo ""
