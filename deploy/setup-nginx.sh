#!/bin/bash
set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo bash setup-nginx.sh YOUR_IP_ADDRESS"
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: sudo bash setup-nginx.sh YOUR_IP_ADDRESS"
  echo "Example: sudo bash setup-nginx.sh 185.123.45.67"
  exit 1
fi

IP_ADDRESS="$1"

echo "Setting up Nginx for ${IP_ADDRESS}..."

cat > /etc/nginx/sites-available/floraorders << EOF
server {
    listen 80;
    server_name ${IP_ADDRESS};

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/floraorders /etc/nginx/sites-enabled/floraorders

nginx -t
systemctl reload nginx

echo ""
echo "Nginx configured!"
echo "Application will be available at: http://${IP_ADDRESS}"
echo ""
