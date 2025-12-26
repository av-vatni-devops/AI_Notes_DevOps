# CI/CD Pipeline Guide

## Overview

This project uses Jenkins for Continuous Integration and Continuous Deployment (CI/CD). The pipeline automates building, testing, and deploying the application to Kubernetes.

## Pipeline Stages

### 1. Checkout Code
- Clones the repository from Git
- Uses Jenkins SCM configuration

### 2. Docker Infrastructure Check
- Verifies Docker and Docker Compose are available
- Debug stage to ensure environment is ready

### 3. Clean Previous CI Containers
- Removes any leftover containers from previous runs
- Ensures clean test environment

### 4. Build & Run Tests (CI)
- Builds and runs test containers using `docker-compose.ci.yml`
- Runs backend unit and integration tests
- Runs frontend E2E tests with Playwright
- Aborts on container exit (fails pipeline if tests fail)

### 5. Cleanup after CI
- Removes test containers after completion
- Frees up resources

### 6. Build Production Images
- Builds optimized production Docker images:
  - Backend: `avvatni/ai-notes-backend:${GIT_COMMIT}` (using `--target prod`)
  - Frontend: `avvatni/ai-notes-frontend:${GIT_COMMIT}`
- Uses Docker BuildKit for faster builds

### 7. Docker Login
- Authenticates with Docker Hub using Jenkins credentials
- Credential ID: `dockerhub-creds-id`
- Required format: Username/Password credential

### 8. Push Images to Docker Hub
- Pushes commit-specific tags: `:${GIT_COMMIT}`
- Tags images as `:latest`
- Pushes both commit tags and latest tags

### 9. Deploy to Kubernetes
- Applies Kubernetes manifests in order:
  1. Namespace
  2. ConfigMap
  3. Secrets (created from Jenkins credentials)
  4. MongoDB deployment and service
  5. Backend deployment
  6. Frontend deployment
  7. Services
- Waits for deployments to be ready (5 minute timeout)
- Uses Jenkins credentials for secrets:
  - `MONGO_ATLAS_URI`: MongoDB connection string
  - `GEMINI_API_KEY`: Google Gemini API key
  - `JWT_SECRET`: JWT signing secret

## Jenkins Configuration

### Required Plugins
- Docker Pipeline
- Kubernetes CLI
- Credentials Binding

### Required Credentials

Create these credentials in Jenkins (Manage Jenkins → Credentials):

1. **Docker Hub Credentials**
   - Type: Username with password
   - ID: `dockerhub-creds-id`
   - Username: Your Docker Hub username
   - Password: Your Docker Hub password/token

2. **MongoDB Atlas URI**
   - Type: Secret text
   - ID: `MONGO_ATLAS_URI`
   - Secret: Your MongoDB Atlas connection string

3. **Gemini API Key**
   - Type: Secret text
   - ID: `GEMINI_API_KEY`
   - Secret: Your Google Gemini API key

4. **JWT Secret**
   - Type: Secret text
   - ID: `JWT_SECRET`
   - Secret: A secure random string for JWT signing

### Jenkins Job Setup

1. **Create New Pipeline Job**
   - Go to Jenkins → New Item
   - Select "Pipeline"
   - Name: `ai-notes-cicd` (or your preferred name)

2. **Configure Pipeline**
   - Pipeline definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: Your repository URL
   - Credentials: Git credentials (if private repo)
   - Branch: `*/main` or `*/master`
   - Script Path: `Jenkinsfile`

3. **Configure Kubernetes Access**
   - Ensure Jenkins has kubectl configured
   - Test: `kubectl cluster-info` should work from Jenkins node
   - For Docker Desktop Kubernetes: Ensure Jenkins runs on same machine or has access

### Optional: Webhook Configuration

For automatic builds on Git push:

1. **GitHub/GitLab Webhook**
   - In repository settings, add webhook
   - URL: `http://your-jenkins-url/github-webhook/`
   - Content type: `application/json`
   - Events: Push events

2. **Jenkins Configuration**
   - In job configuration, enable "GitHub hook trigger for GITScm polling"

## Troubleshooting

### Pipeline Fails at Build Stage

**Issue**: Docker build fails
- **Check**: Docker is available on Jenkins node
- **Check**: Dockerfile syntax is correct
- **Check**: Build context paths are correct (`./server`, `./client/my-project`)

### Pipeline Fails at Push Stage

**Issue**: Cannot push to Docker Hub
- **Check**: Docker Hub credentials are correct
- **Check**: Image names match Docker Hub repository names
- **Check**: Docker Hub repository exists and is accessible

### Pipeline Fails at Deploy Stage

**Issue**: Kubernetes deployment fails
- **Check**: kubectl is configured and accessible
- **Check**: Kubernetes cluster is running
- **Check**: Credentials are correctly set in Jenkins
- **Check**: Manifest files are valid (`kubectl apply --dry-run=client -f k8s/`)

**Common Errors**:
- `Error from server (NotFound)`: Namespace doesn't exist (should be created by pipeline)
- `Error from server (Forbidden)`: Insufficient permissions
- `ImagePullBackOff`: Image doesn't exist or can't be pulled

### Pods Not Starting

**Issue**: Deployments succeed but pods don't start
- **Check**: `kubectl get pods -n ai-notes`
- **Check**: `kubectl describe pod <pod-name> -n ai-notes`
- **Check**: Image pull policy is `Always` (for Docker Hub images)
- **Check**: Image names match what was pushed

### Secrets Not Working

**Issue**: Backend can't access secrets
- **Check**: Secret is created: `kubectl get secret ai-notes-secrets -n ai-notes`
- **Check**: Deployment references correct secret name
- **Check**: Environment variables in deployment match secret keys

## Manual Pipeline Steps

If you need to run pipeline steps manually:

```bash
# 1. Build images
docker build -t avvatni/ai-notes-backend:latest --target prod ./server
docker build -t avvatni/ai-notes-frontend:latest ./client/my-project

# 2. Login to Docker Hub
docker login -u your-username

# 3. Push images
docker push avvatni/ai-notes-backend:latest
docker push avvatni/ai-notes-frontend:latest

# 4. Deploy to Kubernetes
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/configmap.yml
kubectl create secret generic ai-notes-secrets \
    --namespace ai-notes \
    --from-literal=MONGO_URI="your-mongo-uri" \
    --from-literal=GEMINI_API_KEY="your-api-key" \
    --from-literal=JWT_SECRET="your-jwt-secret" \
    --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/mongo-deployment.yml
kubectl apply -f k8s/mongo-service.yml
kubectl apply -f k8s/backend-deployment.yml
kubectl apply -f k8s/frontend-deployment.yml
kubectl apply -f k8s/services.yml

# 5. Wait for deployments
kubectl rollout status deployment/ai-notes-backend -n ai-notes --timeout=5m
kubectl rollout status deployment/ai-notes-frontend -n ai-notes --timeout=5m
```

## Best Practices

1. **Always test locally first**: Run tests and builds locally before pushing
2. **Use commit tags**: Pipeline uses `${GIT_COMMIT}` for traceability
3. **Monitor deployments**: Check rollout status and pod logs
4. **Keep credentials secure**: Never commit secrets to repository
5. **Use latest tag carefully**: Only latest tag is updated, consider versioning
6. **Monitor resource usage**: Check pod resource limits and requests

## Pipeline Output

After successful pipeline run:
- ✅ All tests pass
- ✅ Images pushed to Docker Hub
- ✅ Application deployed to Kubernetes
- ✅ Frontend accessible at configured NodePort (default: 30007)

## Next Steps

- Set up monitoring and alerting
- Configure production environment variables
- Set up backup strategies for MongoDB
- Implement blue-green or canary deployments
- Add performance testing to pipeline

