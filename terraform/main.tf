terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "tup-calculator"
      ManagedBy = "terraform"
    }
  }
}

data "aws_vpc" "default" {
  id = "vpc-5f136122"
}

data "aws_subnet" "main" {
  id = "subnet-1b748257"
}
