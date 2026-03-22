#!/bin/bash
set -e

KEY="${TUP_SSH_KEY:-$HOME/.ssh/tup-calculator-key.pem}"
SERVER="${TUP_SERVER:-ubuntu@98.89.216.65}"
DEST="/var/www/tupcalculator.org/"
SERVER_DEST="/opt/tup-proxy/"

echo "🚀 Building App..."
npm run build

echo "📦 Syncing frontend to server..."
scp -i "$KEY" -r dist/* "$SERVER":"$DEST"

echo "📦 Syncing proxy server to server..."
ssh -i "$KEY" "$SERVER" "sudo mkdir -p $SERVER_DEST && sudo chown ubuntu:ubuntu $SERVER_DEST"
scp -i "$KEY" server/index.js server/package.json "$SERVER":"$SERVER_DEST"

echo "📦 Installing proxy dependencies..."
ssh -i "$KEY" "$SERVER" "cd $SERVER_DEST && npm install --omit=dev --quiet"

echo "♻️  Restarting proxy service..."
ssh -i "$KEY" "$SERVER" "sudo systemctl restart tup-proxy"

NGINX_CONF="tupcalculator.org"
NGINX_DEST="/etc/nginx/sites-available/$NGINX_CONF"

echo "📦 Syncing nginx config..."
scp -i "$KEY" server/nginx.conf "$SERVER":/tmp/nginx-tup.conf
ssh -i "$KEY" "$SERVER" "sudo cp /tmp/nginx-tup.conf $NGINX_DEST && sudo ln -sf $NGINX_DEST /etc/nginx/sites-enabled/$NGINX_CONF"

echo "🔍 Validating nginx config..."
ssh -i "$KEY" "$SERVER" "sudo nginx -t"

echo "♻️  Reloading Nginx..."
ssh -i "$KEY" "$SERVER" "sudo nginx -s reload"

echo "✅ TUP Calculator is Live!"
