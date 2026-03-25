resource "aws_key_pair" "tup" {
  key_name = "tup-calculator-key"

  # Public key is on the instance already; Terraform needs a placeholder
  # after import. This is ignored post-import.
  public_key = "ssh-rsa PLACEHOLDER"

  lifecycle {
    ignore_changes = [public_key]
  }
}

resource "aws_instance" "tup" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnet.main.id
  vpc_security_group_ids = [aws_security_group.tup.id]

  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    http_endpoint               = "enabled"
  }

  root_block_device {
    volume_size           = 8
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = false
  }

  tags = {
    Name = "tup-calculator"
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      ami,
      user_data,
      user_data_base64,
    ]
  }
}
