resource "aws_sns_topic" "alerts" {
  name = "tup-calculator-alerts"
}

# ── EC2 built-in metrics ─────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "status_check_failed" {
  alarm_name          = "tup-status-check-failed"
  alarm_description   = "EC2 status check failed - notify"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.tup.id
  }
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "tup-high-cpu"
  alarm_description   = "CPU above 80% for 10 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.tup.id
  }
}

resource "aws_cloudwatch_metric_alarm" "network_out_spike" {
  alarm_name          = "tup-network-out-spike"
  alarm_description   = "Network egress above 500MB in 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NetworkOut"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Sum"
  threshold           = 524288000
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.tup.id
  }
}

resource "aws_cloudwatch_metric_alarm" "network_in_spike" {
  alarm_name          = "tup-network-in-spike"
  alarm_description   = "Network ingress above 500MB in 5 minutes — possible DDoS or abuse"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NetworkIn"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Sum"
  threshold           = 524288000
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.tup.id
  }
}

resource "aws_cloudwatch_metric_alarm" "billing_spike" {
  alarm_name          = "tup-billing-spike"
  alarm_description   = "Estimated charges exceed $50"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = 50
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}

# ── CloudWatch Agent custom metrics (disk + memory) ─────────────────────────
# These require the CloudWatch agent to be installed and configured on the EC2
# instance. See server/cloudwatch-agent-config.json for the agent configuration
# and server/setup-monitoring.sh for the installation script.

resource "aws_cloudwatch_metric_alarm" "disk_usage_high" {
  alarm_name          = "tup-disk-usage-high"
  alarm_description   = "Root volume disk usage above 80% — DB or logs may be growing unbounded"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "disk_used_percent"
  namespace           = "CWAgent"
  period              = 300
  statistic           = "Maximum"
  threshold           = 80
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.tup.id
    path       = "/"
    fstype     = "ext4"
  }
}

resource "aws_cloudwatch_metric_alarm" "memory_usage_high" {
  alarm_name          = "tup-memory-usage-high"
  alarm_description   = "Memory usage above 85% — possible leak or abuse"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.tup.id
  }
}

# ── IAM role for CloudWatch agent on EC2 ─────────────────────────────────────
# Managed via AWS Console (claude-dev IAM user lacks iam:* permissions).
# Role: tup-ec2-cloudwatch-role
# Policy: CloudWatchAgentServerPolicy
# Instance profile: tup-ec2-cloudwatch-profile (attached to EC2)
