#!/bin/bash
# deploy/deploy.sh

set -e

# Configuration
AWS_REGION="us-east-1"
ECR_REGISTRY="YOUR_ACCOUNT_ID.dkr.ecr.${AWS_REGION}.amazonaws.com"
CLUSTER_NAME="livekit-cluster"
FRONTEND_REPO="livekit-frontend"
BACKEND_REPO="livekit-backend"
VPC_ID="vpc-xxxxxxxxx"  # Replace with your VPC ID
SUBNET_IDS="subnet-xxxxxxx,subnet-xxxxxxx"  # Replace with your subnet IDs
SECURITY_GROUP_ID="sg-xxxxxxxxx"  # Replace with your security group ID

echo "🚀 Starting deployment to AWS ECS/Fargate..."

# 1. Create ECR repositories if they don't exist
echo "📦 Creating ECR repositories..."
aws ecr describe-repositories --repository-names $FRONTEND_REPO --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository --repository-name $FRONTEND_REPO --region $AWS_REGION

aws ecr describe-repositories --repository-names $BACKEND_REPO --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository --repository-name $BACKEND_REPO --region $AWS_REGION

# 2. Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# 3. Build and push frontend
echo "🏗️ Building and pushing frontend..."
cd ../frontend
docker build -t $FRONTEND_REPO .
docker tag $FRONTEND_REPO:latest $ECR_REGISTRY/$FRONTEND_REPO:latest
docker push $ECR_REGISTRY/$FRONTEND_REPO:latest
cd ../deploy

# 4. Build and push backend
echo "🏗️ Building and pushing backend..."
cd ../backend
docker build -t $BACKEND_REPO .
docker tag $BACKEND_REPO:latest $ECR_REGISTRY/$BACKEND_REPO:latest
docker push $ECR_REGISTRY/$BACKEND_REPO:latest
cd ../deploy

# 5. Create ECS cluster if it doesn't exist
echo "🏭 Creating ECS cluster..."
aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION 2>/dev/null || \
    aws ecs create-cluster --cluster-name $CLUSTER_NAME --capacity-providers FARGATE --region $AWS_REGION

# 6. Register task definitions
echo "📋 Registering task definitions..."
# Update image URIs in task definitions
sed -i "s|IMAGE_URI_PLACEHOLDER|$ECR_REGISTRY/$FRONTEND_REPO:latest|g" task-definition-frontend.json
sed -i "s|IMAGE_URI_PLACEHOLDER|$ECR_REGISTRY/$BACKEND_REPO:latest|g" task-definition-backend.json

aws ecs register-task-definition --cli-input-json file://task-definition-frontend.json --region $AWS_REGION
aws ecs register-task-definition --cli-input-json file://task-definition-backend.json --region $AWS_REGION

# 7. Create or update services
echo "🚀 Creating/updating ECS services..."

# Check if services exist and create/update accordingly
if aws ecs describe-services --cluster $CLUSTER_NAME --services livekit-frontend-service --region $AWS_REGION 2>/dev/null | grep -q "ACTIVE"; then
    echo "Updating frontend service..."
    aws ecs update-service --cluster $CLUSTER_NAME --service livekit-frontend-service --task-definition livekit-frontend --region $AWS_REGION
else
    echo "Creating frontend service..."
    aws ecs create-service --cli-input-json file://service-frontend.json --region $AWS_REGION
fi

if aws ecs describe-services --cluster $CLUSTER_NAME --services livekit-backend-service --region $AWS_REGION 2>/dev/null | grep -q "ACTIVE"; then
    echo "Updating backend service..."
    aws ecs update-service --cluster $CLUSTER_NAME --service livekit-backend-service --task-definition livekit-backend --region $AWS_REGION
else
    echo "Creating backend service..."
    aws ecs create-service --cli-input-json file://service-backend.json --region $AWS_REGION
fi

echo "✅ Deployment completed!"
echo "🌐 Frontend will be available at the ALB endpoint"
echo "🔧 Backend service is running on the internal network"
