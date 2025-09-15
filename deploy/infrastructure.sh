#!/bin/bash
# deploy/infrastructure.sh - Create AWS infrastructure

set -e

AWS_REGION="us-east-1"
VPC_ID="vpc-xxxxxxxxx"  # Replace with your VPC ID
SUBNET_IDS=("subnet-xxxxxxx" "subnet-xxxxxxx")  # Replace with your public subnet IDs
CLUSTER_NAME="livekit-cluster"

echo "🏗️ Setting up AWS infrastructure..."

# 1. Create security groups
echo "🔒 Creating security groups..."

# ALB Security Group
ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name livekit-alb-sg \
    --description "Security group for LiveKit ALB" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' --output text)

# Add rules for ALB
aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

# ECS Security Group
ECS_SG_ID=$(aws ec2 create-security-group \
    --group-name livekit-ecs-sg \
    --description "Security group for LiveKit ECS tasks" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' --output text)

# Allow traffic from ALB to ECS
aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 3000 \
    --source-group $ALB_SG_ID \
    --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 8080 \
    --source-group $ALB_SG_ID \
    --region $AWS_REGION

echo "ALB Security Group: $ALB_SG_ID"
echo "ECS Security Group: $ECS_SG_ID"

# 2. Create Application Load Balancer
echo "⚖️ Creating Application Load Balancer..."

ALB_ARN=$(aws elbv2 create-load-balancer \
    --name livekit-alb \
    --subnets ${SUBNET_IDS[@]} \
    --security-groups $ALB_SG_ID \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].DNSName' --output text)

echo "ALB DNS: $ALB_DNS"

# 3. Create target groups
echo "🎯 Creating target groups..."

# Frontend target group
FRONTEND_TG_ARN=$(aws elbv2 create-target-group \
    --name livekit-frontend-tg \
    --protocol HTTP \
    --port 3000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-path /api/health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' --output text)

# Backend target group
BACKEND_TG_ARN=$(aws elbv2 create-target-group \
    --name livekit-backend-tg \
    --protocol HTTP \
    --port 8080 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' --output text)

# 4. Create listeners
echo "👂 Creating ALB listeners..."

# Default listener (frontend)
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN \
    --region $AWS_REGION

# Backend API listener rule
aws elbv2 create-rule \
    --listener-arn $(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --region $AWS_REGION --query 'Listeners[0].ListenerArn' --output text) \
    --priority 100 \
    --conditions Field=path-pattern,Values='/api/*' \
    --actions Type=forward,TargetGroupArn=$BACKEND_TG_ARN \
    --region $AWS_REGION

# 5. Create CloudWatch log groups
echo "📊 Creating CloudWatch log groups..."
aws logs create-log-group --log-group-name /ecs/livekit-frontend --region $AWS_REGION || true
aws logs create-log-group --log-group-name /ecs/livekit-backend --region $AWS_REGION || true

# 6. Store configuration
echo "💾 Storing configuration..."
cat > config.env << EOF
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
ALB_SG_ID=$ALB_SG_ID
ECS_SG_ID=$ECS_SG_ID
FRONTEND_TG_ARN=$FRONTEND_TG_ARN
BACKEND_TG_ARN=$BACKEND_TG_ARN
EOF

echo "✅ Infrastructure setup completed!"
echo "🌐 Your application will be available at: http://$ALB_DNS"
echo "📝 Configuration saved to config.env"
