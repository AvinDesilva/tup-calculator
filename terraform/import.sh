#!/bin/bash
# One-time import of existing AWS resources into Terraform state.
# Run from the terraform/ directory after `terraform init`.
set -e

cd "$(dirname "$0")"

echo "=== Importing existing resources ==="

# EC2
terraform import aws_instance.tup i-07e04373ba0721af8
terraform import aws_key_pair.tup tup-calculator-key

# Security Group + Rules
terraform import aws_security_group.tup sg-02f1533de0a8351dd
# SG rules use compound format: SGID_TYPE_PROTOCOL_FROM_TO_SOURCE
terraform import aws_security_group_rule.ssh sg-02f1533de0a8351dd_ingress_tcp_22_22_98.194.33.214/32
terraform import aws_security_group_rule.http sg-02f1533de0a8351dd_ingress_tcp_80_80_0.0.0.0/0
terraform import aws_security_group_rule.https sg-02f1533de0a8351dd_ingress_tcp_443_443_0.0.0.0/0
terraform import aws_security_group_rule.egress_all sg-02f1533de0a8351dd_egress_-1_0_0_0.0.0.0/0

# IAM
terraform import aws_iam_user.claude_dev claude-dev
terraform import aws_iam_user_policy.claude_dev_scoped claude-dev:tup-calculator-scoped

# Monitoring
terraform import aws_sns_topic.alerts arn:aws:sns:us-east-1:804579426931:tup-calculator-alerts
terraform import aws_cloudwatch_metric_alarm.status_check_failed tup-status-check-failed
terraform import aws_cloudwatch_metric_alarm.high_cpu tup-high-cpu
terraform import aws_cloudwatch_metric_alarm.network_out_spike tup-network-out-spike
terraform import aws_cloudwatch_metric_alarm.billing_spike tup-billing-spike

echo "=== All imports complete ==="
echo "Run 'terraform plan' to verify zero diff"
