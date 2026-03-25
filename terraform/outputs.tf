output "instance_id" {
  value = aws_instance.tup.id
}

output "instance_public_ip" {
  value = aws_instance.tup.public_ip
}

output "security_group_id" {
  value = aws_security_group.tup.id
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}
