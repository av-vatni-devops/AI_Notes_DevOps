# Kubernetes Deployment for AI Notes

This directory contains Kubernetes manifests for deploying the AI Notes application to Docker Desktop Kubernetes.

## Prerequisites

1. **Docker Desktop** with Kubernetes enabled
2. **kubectl** installed and configured
3. **Docker** CLI for building images

## Quick Start

### Option 1: Using the deployment script (Linux/Mac)

```bash
chmod +x k8s/deploy.sh
./k8s/deploy.sh
```

### Option 2: Manual deployment

1. **Build Docker images:**

```bash
# Build backend
cd server
docker build -t ai-notes-backend:latest --target prod .

# Build frontend
cd ../client/my-project
docker build -t ai-notes-frontend:latest .
```

2. **Create secrets file:**

```bash
cd ../../k8s
cp secrets.yml.example secrets.yml
# Edit secrets.yml with your actual values
```

3. **Deploy to Kubernetes:**

```bash
kubectl apply -f namespace.yml
kubectl apply -f configmap.yml
kubectl apply -f secrets.yml
kubectl apply -f mongo-deployment.yml
kubectl apply -f mongo-service.yml
kubectl apply -f backend-deployment.yml
kubectl apply -f frontend-deployment.yml
kubectl apply -f services.yml
```

4. **Wait for pods to be ready:**

```bash
kubectl wait --for=condition=ready pod -l app=mongo -n ai-notes --timeout=120s
kubectl wait --for=condition=ready pod -l app=backend -n ai-notes --timeout=120s
kubectl wait --for=condition=ready pod -l app=frontend -n ai-notes --timeout=120s
```

5. **Verify deployment:**

```bash
kubectl get pods -n ai-notes
kubectl get svc -n ai-notes
```

## Accessing the Application

- **Frontend**: http://localhost:30007
- **Backend API**: Accessible via frontend at `/api/*` (proxied through nginx)

## Files Overview

- `namespace.yml` - Creates the `ai-notes` namespace
- `configmap.yml` - Non-sensitive configuration
- `secrets.yml.example` - Template for secrets (safe to commit)
- `secrets.yml` - Actual secrets (DO NOT COMMIT - in .gitignore)
- `mongo-deployment.yml` - MongoDB deployment
- `mongo-service.yml` - MongoDB service (ClusterIP)
- `backend-deployment.yml` - Backend API deployment
- `frontend-deployment.yml` - Frontend deployment
- `services.yml` - Backend and Frontend services

## Architecture

```
┌─────────────────────────────────────────┐
│         Kubernetes Cluster               │
│  ┌──────────────────────────────────┐   │
│  │      Frontend (NodePort)         │   │
│  │      Port: 30007                 │   │
│  │      ┌─────────────────────┐     │   │
│  │      │  Nginx (port 80)    │     │   │
│  │      │  Serves static files│     │   │
│  │      │  Proxies /api/*     │     │   │
│  │      └──────────┬──────────┘     │   │
│  └─────────────────┼────────────────┘   │
│                    │                    │
│  ┌─────────────────▼────────────────┐   │
│  │   Backend (ClusterIP)            │   │
│  │   Port: 5000                     │   │
│  └──────────┬───────────────────────┘   │
│             │                            │
│  ┌──────────▼───────────────────────┐   │
│  │   MongoDB (ClusterIP)            │   │
│  │   Port: 27017                    │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n ai-notes
kubectl describe pod <pod-name> -n ai-notes
```

### Check logs
```bash
# Backend logs
kubectl logs -n ai-notes -l app=backend --tail=50

# Frontend logs
kubectl logs -n ai-notes -l app=frontend --tail=50

# MongoDB logs
kubectl logs -n ai-notes -l app=mongo --tail=50
```

### Test backend connectivity
```bash
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -n ai-notes -- curl http://backend:5000/
```

### Restart deployments
```bash
kubectl rollout restart deployment ai-notes-backend -n ai-notes
kubectl rollout restart deployment ai-notes-frontend -n ai-notes
```

### Cleanup
```bash
kubectl delete namespace ai-notes
```

## Notes

- Images use `imagePullPolicy: Never` for local Docker Desktop Kubernetes
- MongoDB uses `emptyDir` volume (data is ephemeral - use PersistentVolume for production)
- Frontend proxies `/api/*` requests to backend service
- Secrets should never be committed to git

