resource "aws_iam_user" "claude_dev" {
  name = "claude-dev"

  tags = {
    Purpose = "CI/CD and development access for TUP Calculator"
  }
}

resource "aws_iam_user_policy" "claude_dev_scoped" {
  name = "tup-calculator-scoped"
  user = aws_iam_user.claude_dev.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EC2DescribeAll"
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "ec2:CreateTags",
        ]
        Resource = "*"
      },
      {
        Sid    = "EC2BasicOps"
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:RebootInstances",
        ]
        Resource = "arn:aws:ec2:us-east-1:804579426931:instance/${aws_instance.tup.id}"
      },
      {
        Sid    = "EC2SecurityGroupModify"
        Effect = "Allow"
        Action = [
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupIngress",
        ]
        Resource = "arn:aws:ec2:us-east-1:804579426931:security-group/${aws_security_group.tup.id}"
      },
      {
        Sid    = "CloudWatch"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricAlarm",
          "cloudwatch:DeleteAlarms",
          "cloudwatch:DescribeAlarms",
          "cloudwatch:GetMetricData",
          "cloudwatch:ListMetrics",
          "cloudwatch:SetAlarmState",
          "cloudwatch:ListTagsForResource",
          "cloudwatch:TagResource",
        ]
        Resource = "*"
      },
      {
        Sid    = "SNS"
        Effect = "Allow"
        Action = [
          "sns:CreateTopic",
          "sns:Subscribe",
          "sns:ListTopics",
          "sns:GetTopicAttributes",
          "sns:ListSubscriptionsByTopic",
          "sns:ListTagsForResource",
          "sns:SetTopicAttributes",
          "sns:TagResource",
        ]
        Resource = "*"
      },
      {
        Sid    = "IAMSelf"
        Effect = "Allow"
        Action = [
          "iam:GetUser",
          "iam:ListAttachedUserPolicies",
          "iam:ListUserPolicies",
          "iam:ListUserTags",
          "iam:UntagUser",
          "iam:GetUserPolicy",
          "iam:PutUserPolicy",
          "iam:DeleteUserPolicy",
          "iam:TagUser",
        ]
        Resource = "arn:aws:iam::804579426931:user/claude-dev"
      },
      {
        Sid    = "TerraformState"
        Effect = "Allow"
        Action = ["s3:*"]
        Resource = [
          "arn:aws:s3:::tup-calculator-tfstate",
          "arn:aws:s3:::tup-calculator-tfstate/*",
        ]
      },
      {
        Sid    = "TerraformLock"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
        ]
        Resource = "arn:aws:dynamodb:us-east-1:804579426931:table/tup-calculator-tflock"
      },
    ]
  })
}
