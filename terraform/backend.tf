terraform {
  backend "s3" {
    bucket         = "tup-calculator-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tup-calculator-tflock"
    encrypt        = true
  }
}
