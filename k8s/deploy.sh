#!/bin/bash

# Kubernetes Deployment Script for AI Notes
# This script builds Docker images and deploys to Kubernetes

set -e

echo "🚀 Starting Kubernetes deployment for AI Notes..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Kubernetes cluster
echo -e "${YELLOW}📡 Checking Kubernetes cluster...${NC}"
kubectl cluster-info > /dev/null 2>&1 || {
    echo "❌ Kubernetes cluster is not accessible. Please ensure Docker Desktop Kubernetes is running."
    exit 1
}
echo -e "${GREEN}✅ Kubernetes cluster is accessible${NC}"

# Build backend image
echo -e "${YELLOW}🔨 Building backend Docker image...${NC}"
cd "$(dirname "$0")/../server"
docker build -t ai-notes-backend:latest --target prod . || {
    echo "❌ Failed to build backend image"
    exit 1
}
echo -e "${GREEN}✅ Backend image built successfully${NC}"

# Build frontend image
echo -e "${YELLOW}🔨 Building frontend Docker image...${NC}"
cd "../client/my-project"
docker build -t ai-notes-frontend:latest . || {
    echo "❌ Failed to build frontend image"
    exit 1
}
echo -e "${GREEN}✅ Frontend image built successfully${NC}"

# Navigate to k8s directory
cd "../../k8s"

# Check if secrets.yml exists
if [ ! -f "secrets.yml" ]; then
    echo -e "${YELLOW}⚠️  secrets.yml not found. Creating from template...${NC}"
    cp secrets.yml.example secrets.yml
    echo -e "${YELLOW}⚠️  Please edit k8s/secrets.yml with your actual secrets before deploying!${NC}"
    read -p "Press Enter to continue after editing secrets.yml..."
fi

# Deploy to Kubernetes
echo -e "${YELLOW}📦 Deploying to Kubernetes...${NC}"

echo "Creating namespace..."
kubectl apply -f namespace.yml

echo "Creating ConfigMap..."
kubectl apply -f configmap.yml

echo "Creating Secrets..."
kubectl apply -f secrets.yml

echo "Deploying MongoDB..."
kubectl apply -f mongo-deployment.yml
kubectl apply -f mongo-service.yml

echo "Waiting for MongoDB to be ready..."
kubectl wait --for=condition=ready pod -l app=mongo -n ai-notes --timeout=120s || {
    echo "❌ MongoDB failed to start"
    exit 1
}

echo "Deploying Backend..."
kubectl apply -f backend-deployment.yml

echo "Deploying Frontend..."
kubectl apply -f frontend-deployment.yml

echo "Creating Services..."
kubectl apply -f services.yml

echo "Waiting for Backend to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n ai-notes --timeout=120s || {
    echo "❌ Backend failed to start"
    exit 1
}

echo "Waiting for Frontend to be ready..."
kubectl wait --for=condition=ready pod -l app=frontend -n ai-notes --timeout=120s || {
    echo "❌ Frontend failed to start"
    exit 1
}

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Deployment Status:"
kubectl get pods -n ai-notes
echo ""
echo "🌐 Services:"
kubectl get svc -n ai-notes
echo ""
echo -e "${GREEN}🎉 Frontend is accessible at: http://localhost:30007${NC}"

