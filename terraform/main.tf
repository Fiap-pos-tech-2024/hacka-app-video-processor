terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = "us-east-1"
}

# === S3 Bucket para armazenar vídeos e frames ===

resource "aws_s3_bucket" "video_processor_storage" {
  bucket = "video-processor-storage-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "Video Processor Storage"
    Environment = "production"
    Service     = "video-processor"
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket_versioning" "video_processor_storage" {
  bucket = aws_s3_bucket.video_processor_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "video_processor_storage" {
  bucket = aws_s3_bucket.video_processor_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# === SQS Queues para processamento de vídeos ===

resource "aws_sqs_queue" "video_processing_queue" {
  name                      = "video-processing-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 86400
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 300

  tags = {
    Name        = "Video Processing Queue"
    Environment = "production"
    Service     = "video-processor"
  }
}

resource "aws_sqs_queue" "video_processing_dlq" {
  name = "video-processing-dlq"

  tags = {
    Name        = "Video Processing Dead Letter Queue"
    Environment = "production"
    Service     = "video-processor"
  }
}

resource "aws_sqs_queue_redrive_policy" "video_processing_queue" {
  queue_url = aws_sqs_queue.video_processing_queue.id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.video_processing_dlq.arn
    maxReceiveCount     = 3
  })
}

# === Usar VPC e Subnets existentes ===
data "aws_vpc" "existing" {
  filter {
    name   = "tag:Name"
    values = ["appnet-vpc"]
  }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.existing.id]
  }
  
  filter {
    name   = "tag:Name"
    values = ["appnet-public-*"]
  }
}

# === Usar cluster ECS existente ===
data "aws_ecs_cluster" "existing" {
  cluster_name = "microservices-cluster"
}

# === IAM Role e Policy para ECS Task ===

resource "aws_iam_role" "video_processor_task_role" {
  name = "video-processor-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "video_processor_task_policy" {
  name = "video-processor-task-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.video_processor_storage.arn,
          "${aws_s3_bucket.video_processor_storage.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:SendMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.video_processing_queue.arn,
          aws_sqs_queue.video_processing_dlq.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "video_processor_task_policy" {
  role       = aws_iam_role.video_processor_task_role.name
  policy_arn = aws_iam_policy.video_processor_task_policy.arn
}

# === IAM Role para execução de tarefas ===
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "video-processor-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Adicionar permissões ECR para a execution role
resource "aws_iam_role_policy" "ecs_task_execution_ecr_policy" {
  name = "video-processor-execution-ecr-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# === CloudWatch Log Group ===

resource "aws_cloudwatch_log_group" "video_processor" {
  name              = "/ecs/video-processor"
  retention_in_days = 7

  tags = {
    Name        = "Video Processor Logs"
    Environment = "production"
    Service     = "video-processor"
  }
}

# === Security Group para ECS ===

resource "aws_security_group" "ecs_sg" {
  name        = "video-processor-ecs-sg"
  description = "Security group para Video Processor (Queue Worker)"
  vpc_id      = data.aws_vpc.existing.id

  # Apenas egress necessário para acessar SQS, S3 e outros serviços AWS
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "Video Processor ECS Security Group"
    Environment = "production"
    Service     = "video-processor"
  }
}

# === ECS Task Definition ===

resource "aws_ecs_task_definition" "this" {
  family                   = "video-processor"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256  # Reduzir CPU para teste
  memory                   = 512  # Reduzir memória para teste
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.video_processor_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "video-processor"
      image = "497986631333.dkr.ecr.us-east-1.amazonaws.com/hacka-app-processor:latest"
      essential = true
      environment = [
        { name = "AWS_REGION", value = "us-east-1" },
        { name = "S3_BUCKET", value = aws_s3_bucket.video_processor_storage.bucket },
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.video_processing_queue.url },
        { name = "NODE_ENV", value = "production" }
      ],
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/video-processor"
          awslogs-region        = "us-east-1"
          awslogs-stream-prefix = "ecs"
        }
      },
      healthCheck = {
        command = ["CMD-SHELL", "echo 'healthy'"]
        interval = 30
        timeout = 5
        retries = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "Video Processor Task Definition"
    Environment = "production"
    Service     = "video-processor"
  }
}

# === ECS Service (Queue Worker - sem Load Balancer) ===

resource "aws_ecs_service" "this" {
  name            = "video-processor"
  cluster         = data.aws_ecs_cluster.existing.id
  task_definition = aws_ecs_task_definition.this.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  # Configuração de rede para queue worker (usa subnets públicas com IP público)
  network_configuration {
    subnets          = data.aws_subnets.public.ids
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = true
  }

  depends_on = [aws_ecs_task_definition.this]

  tags = {
    Name        = "Video Processor Service"
    Environment = "production"
    Service     = "video-processor"
  }
}

# === Outputs ===

output "s3_bucket_name" {
  description = "Nome do bucket S3 para vídeos"
  value       = aws_s3_bucket.video_processor_storage.bucket
}

output "sqs_queue_url" {
  description = "URL da fila SQS para processamento"
  value       = aws_sqs_queue.video_processing_queue.url
}

output "ecs_service_name" {
  description = "Nome do serviço ECS"
  value       = aws_ecs_service.this.name
}
