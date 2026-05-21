#!/usr/bin/env bash
# setup-monitoring.sh — Install & configure CloudWatch agent on the EC2 instance.
# Run once after attaching the IAM instance profile (tup-ec2-cloudwatch-profile).
#
# Usage:  ssh ubuntu@<host> 'bash -s' < setup-monitoring.sh
set -euo pipefail

echo "==> Installing CloudWatch agent..."
wget -q https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E amazon-cloudwatch-agent.deb
rm -f amazon-cloudwatch-agent.deb

echo "==> Deploying agent config..."
sudo cp /opt/tup-proxy/cloudwatch-agent-config.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

echo "==> Starting CloudWatch agent..."
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

echo "==> Enabling on boot..."
sudo systemctl enable amazon-cloudwatch-agent

echo "==> Done. Agent status:"
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status
