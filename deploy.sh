#!/bin/bash
# TUP Calculator Deployment Script
KEY="/Users/avindesilva/.ssh/tup-calculator-key.pem"
SERVER="ubuntu@98.89.216.65"
DEST="/var/www/tupcalculator.org/"

echo "🚀 Building App..."
npm run build

echo "📦 Syncing files to server..."
scp -i "$KEY" -r dist/* "$SERVER":"$DEST"

echo "♻️  Reloading Nginx..."
ssh -i "$KEY" "$SERVER" "sudo nginx -s reload"

echo "✅ TUP Calculator is Live!"
