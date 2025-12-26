# Kubernetes Deployment Guide

This guide provides step-by-step instructions for deploying the AI Notes application to Docker Desktop Kubernetes.

## Prerequisites

1. **Docker Desktop** with Kubernetes enabled
2. **kubectl** installed and configured
3. **Docker** CLI for building images

## Step 1: Verify Kubernetes is Running

```bash
kubectl cluster-info
kubectl get nodes
```

Expected output: You should see your Docker Desktop node.

## Step 2: Build Docker Images Locally

Build the backend image:

```bash
cd server
docker build -t ai-notes-backend:latest --target prod .
cd ..
```

Build the frontend image:

```bash
cd client/my-project
docker build -t ai-notes-frontend:latest .
cd ../..
```

Verify images are built:

```bash
docker images | grep ai-notes
```

Expected output:
```
ai-notes-backend    latest    <image-id>    <time>    <size>
ai-notes-frontend   latest    <image-id>    <time>    <size>
```

## Step 3: Load Images into Kubernetes

Docker Desktop Kubernetes can use local images, but ensure they're available:

```bash
# Verify Docker Desktop Kubernetes context
kubectl config current-context
# Should output: docker-desktop
```

If using a different Kubernetes cluster, you may need to:
- Use `docker save` and `docker load` on the cluster nodes, OR
- Push to a registry and update imagePullPolicy

## Step 4: Create Kubernetes Secrets

**IMPORTANT**: Do not commit `k8s/secrets.yml`. Use the example template:

```bash
cp k8s/secrets.yml.example k8s/secrets.yml
```

Edit `k8s/secrets.yml` and replace:
- `YOUR_JWT_SECRET_HERE` with a secure random string
- `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key

Example secrets.yml:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ai-notes-secrets
  namespace: ai-notes
type: Opaque
stringData:
  MONGO_URI: mongodb://mongo:27017/neura_notes
  JWT_SECRET: your-secure-random-secret-here
  GEMINI_API_KEY: your-actual-gemini-api-key
```

## Step 5: Deploy Kubernetes Manifests

Deploy in the following order:

### 5.1 Create Namespace

```bash
kubectl apply -f k8s/namespace.yml
```

Verify:
```bash
kubectl get namespace ai-notes
```

### 5.2 Create ConfigMap

```bash
kubectl apply -f k8s/configmap.yml
```

Verify:
```bash
kubectl get configmap -n ai-notes
```

### 5.3 Create Secrets

```bash
kubectl apply -f k8s/secrets.yml
```

Verify (secrets are hidden by default):
```bash
kubectl get secrets -n ai-notes
```

### 5.4 Deploy MongoDB

```bash
kubectl apply -f k8s/mongo-deployment.yml
kubectl apply -f k8s/mongo-service.yml
```

Wait for MongoDB to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=mongo -n ai-notes --timeout=120s
```

Verify:
```bash
kubectl get pods -n ai-notes -l app=mongo
kubectl get svc -n ai-notes -l app=mongo
```

Expected output:
```
NAME                     READY   STATUS    RESTARTS   AGE
mongo-xxxxxxxxx-xxxxx    1/1     Running   0          XXs

NAME     TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)     AGE
mongo    ClusterIP   <cluster-ip>    <none>        27017/TCP   XXs
```

### 5.5 Deploy Backend

```bash
kubectl apply -f k8s/backend-deployment.yml
kubectl apply -f k8s/services.yml
```

Wait for backend to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=backend -n ai-notes --timeout=120s
```

Verify:
```bash
kubectl get pods -n ai-notes -l app=backend
kubectl get svc -n ai-notes -l app=backend
```

Expected output:
```
NAME                           READY   STATUS    RESTARTS   AGE
ai-notes-backend-xxxxxxxxx     1/1     Running   0          XXs

NAME      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
backend   ClusterIP   <cluster-ip>    <none>        5000/TCP   XXs
```

### 5.6 Deploy Frontend

```bash
kubectl apply -f k8s/frontend-deployment.yml
```

Wait for frontend to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=frontend -n ai-notes --timeout=120s
```

Verify:
```bash
kubectl get pods -n ai-notes -l app=frontend
kubectl get svc -n ai-notes -l app=frontend
```

Expected output:
```
NAME                            READY   STATUS    RESTARTS   AGE
ai-notes-frontend-xxxxxxxxx     1/1     Running   0          XXs

NAME       TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
frontend   NodePort   <cluster-ip>    <none>        80:30007/TCP   XXs
```

## Step 6: Validation

### 6.1 Check All Pods

```bash
kubectl get pods -n ai-notes
```

All pods should show `STATUS: Running` and `READY: 1/1`.

### 6.2 Check All Services

```bash
kubectl get svc -n ai-notes
```

Expected services:
- `mongo`: ClusterIP, port 27017
- `backend`: ClusterIP, port 5000
- `frontend`: NodePort, port 80:30007

### 6.3 Test Backend Service

Get backend pod name:
```bash
BACKEND_POD=$(kubectl get pods -n ai-notes -l app=backend -o jsonpath='{.items[0].metadata.name}')
```

Test backend from within cluster:
```bash
kubectl exec -n ai-notes $BACKEND_POD -- wget -qO- http://localhost:5000/
```

Or test via service:
```bash
kubectl run curl-test --image=curlimages/curl:latest --rm -it --restart=Never -n ai-notes -- curl http://backend:5000/
```

Expected output:
```json
{"message":"NeuraNotes API is working","version":"1.0.0","status":"online","timestamp":"..."}
```

### 6.4 Get Frontend URL

Get the NodePort:
```bash
kubectl get svc frontend -n ai-notes -o jsonpath='{.spec.ports[0].nodePort}'
```

Get Docker Desktop IP (usually localhost):
```bash
# On Windows/Mac, use localhost
# On Linux, get the node IP:
kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}'
```

**Frontend URL**: `http://localhost:30007`

### 6.5 Test Frontend in Browser

1. Open browser: `http://localhost:30007`
2. Open browser DevTools (F12) → Console tab
3. Verify:
   - ✅ No console errors
   - ✅ Frontend loads correctly
   - ✅ Can register/login
   - ✅ API calls work (check Network tab - should see `/api/` requests)

### 6.6 Verify Backend Connectivity from Frontend

In browser console:
```javascript
fetch('/api/')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Expected: Should return the backend API status JSON.

## Step 7: Troubleshooting

### Check Pod Logs

```bash
# Backend logs
kubectl logs -n ai-notes -l app=backend --tail=50

# Frontend logs
kubectl logs -n ai-notes -l app=frontend --tail=50

# MongoDB logs
kubectl logs -n ai-notes -l app=mongo --tail=50
```

### Check Pod Status

```bash
kubectl describe pod <pod-name> -n ai-notes
```

### Restart Pods

```bash
# Restart backend
kubectl rollout restart deployment ai-notes-backend -n ai-notes

# Restart frontend
kubectl rollout restart deployment ai-notes-frontend -n ai-notes
```

### Verify Environment Variables

```bash
# Backend env vars
kubectl exec -n ai-notes -l app=backend -- env | grep -E "MONGO_URI|JWT_SECRET|PORT"

# Frontend env vars
kubectl exec -n ai-notes -l app=frontend -- env
```

## Step 8: Cleanup (Optional)

To remove everything:

```bash
kubectl delete namespace ai-notes
```

## Final Checklist

- [ ] All pods are Running (1/1 Ready)
- [ ] MongoDB service is ClusterIP on port 27017
- [ ] Backend service is ClusterIP on port 5000
- [ ] Frontend service is NodePort on port 30007
- [ ] Backend responds to curl test
- [ ] Frontend accessible at http://localhost:30007
- [ ] No browser console errors
- [ ] Frontend can call backend via /api
- [ ] Authentication works (register/login)
- [ ] No secrets committed to git (secrets.yml in .gitignore)

## Summary

**Frontend URL**: `http://localhost:30007`

**Key kubectl Commands**:
```bash
# Build images
docker build -t ai-notes-backend:latest --target prod ./server
docker build -t ai-notes-frontend:latest ./client/my-project

# Deploy
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/configmap.yml
kubectl apply -f k8s/secrets.yml
kubectl apply -f k8s/mongo-deployment.yml
kubectl apply -f k8s/mongo-service.yml
kubectl apply -f k8s/backend-deployment.yml
kubectl apply -f k8s/frontend-deployment.yml
kubectl apply -f k8s/services.yml

# Verify
kubectl get pods -n ai-notes
kubectl get svc -n ai-notes
```

**Architecture**:
- MongoDB: ClusterIP service (internal only)
- Backend: ClusterIP service (accessed via frontend nginx proxy)
- Frontend: NodePort service (exposed on port 30007)
- Frontend nginx proxies `/api/*` → `http://backend:5000/api/*`

