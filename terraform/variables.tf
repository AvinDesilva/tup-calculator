variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "ami_id" {
  type    = string
  default = "ami-0071174ad8cbb9e17"
}

variable "ssh_allowed_cidr" {
  type    = string
  default = "98.194.33.214/32"
}

variable "sns_email" {
  type      = string
  sensitive = true
}
