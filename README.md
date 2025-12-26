# 🧠 AI Notes - DevOps Project

A full-stack AI-powered note-taking application with complete CI/CD pipeline using Jenkins, Docker, and Kubernetes.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [CI/CD Pipeline](#cicd-pipeline)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## ✨ Features

- **Rich Text Editor**: Create and edit notes with formatting, images, and more
- **AI-Powered Features**:
  - Automatic note summarization
  - Content expansion with AI suggestions
  - Intelligent tag generation
- **Organization**: Folders, tags, pinning, and archiving
- **Authentication**: Secure user registration and login
- **Image Upload**: Upload and embed images in notes
- **Search & Filter**: Find notes quickly with search and filters

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              CI/CD Pipeline (Jenkins)           │
│  ┌──────────────────────────────────────────┐  │
│  │  1. Checkout Code                        │  │
│  │  2. Run Tests (Docker Compose CI)       │  │
│  │  3. Build Production Images              │  │
│  │  4. Push to Docker Hub                  │  │
│  │  5. Deploy to Kubernetes                │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│         Kubernetes Cluster                      │
│  ┌──────────────────────────────────────────┐  │
│  │  Frontend (NodePort:30007)              │  │
│  │  ┌──────────────────────────────────┐   │  │
│  │  │  Nginx                            │   │  │
│  │  │  - Serves static files            │   │  │
│  │  │  - Proxies /api/* → Backend      │   │  │
│  │  │  - Proxies /uploads/* → Backend  │   │  │
│  │  └──────────────────────────────────┘   │  │
│  └──────────────────────────────────────────┘  │
│                    │                            │
│  ┌─────────────────▼────────────────────────┐  │
│  │  Backend API (ClusterIP)                │  │
│  │  - Express.js server                    │  │
│  │  - Port 5000                            │  │
│  └─────────────────┬──────────────────────┘  │
│                      │                          │
│  ┌──────────────────▼──────────────────────┐  │
│  │  MongoDB (ClusterIP)                    │  │
│  │  - Port 27017                            │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 📦 Prerequisites

### For Local Development
- **Node.js** (v18+)
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### For CI/CD Pipeline
- **Jenkins** (with Docker and kubectl plugins)
- **Docker** (for building images)
- **Docker Hub** account (for image registry)
- **Kubernetes** cluster access (kubectl configured)
- **Jenkins Credentials**:
  - `dockerhub-creds-id`: Docker Hub username/password
  - `MONGO_ATLAS_URI`: MongoDB connection string
  - `GEMINI_API_KEY`: Google Gemini API key
  - `JWT_SECRET`: JWT secret for authentication

### For Kubernetes Deployment
- **kubectl** installed and configured
- **Kubernetes** cluster (Docker Desktop, Minikube, or cloud provider)

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI_Notes_DevOps
   ```

2. **Setup Backend**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit .env with your MongoDB URI and Gemini API key
   npm run init-db
   npm run dev
   ```

3. **Setup Frontend** (in a new terminal)
   ```bash
   cd client/my-project
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Docker Compose (Local)

```bash
docker compose up --build
```

Access at http://localhost:3000

## 🔄 CI/CD Pipeline

The Jenkins pipeline automates the entire build, test, and deployment process:

### Pipeline Stages

1. **Checkout Code**: Clones the repository
2. **Docker Infrastructure Check**: Verifies Docker and Docker Compose
3. **Clean Previous CI Containers**: Removes old test containers
4. **Build & Run Tests**: Runs integration and unit tests using Docker Compose CI
5. **Cleanup after CI**: Removes test containers
6. **Build Production Images**: Builds optimized production Docker images
7. **Docker Login**: Authenticates with Docker Hub
8. **Push Images**: Pushes images to Docker Hub with commit tags and latest tag
9. **Deploy to Kubernetes**: Deploys application to Kubernetes cluster

### Running the Pipeline

1. **Configure Jenkins**:
   - Install required plugins: Docker Pipeline, Kubernetes CLI
   - Add credentials (see Prerequisites)

2. **Create Jenkins Job**:
   - Create a new Pipeline job
   - Point to `Jenkinsfile` in repository
   - Configure webhook (optional) for automatic builds on push

3. **Run Pipeline**:
   - Click "Build Now" or push to repository (if webhook configured)
   - Monitor progress in Jenkins console

### Pipeline Configuration

The pipeline uses the following environment variables:
- `GIT_COMMIT`: Git commit hash (automatically set)
- `DOCKER_BUILDKIT`: Enabled for faster builds
- `COMPOSE_DOCKER_CLI_BUILD`: Enabled for Docker Compose builds

## ☸️ Kubernetes Deployment

### Manual Deployment

1. **Build Images Locally** (optional, for testing):
   ```bash
   cd server
   docker build -t ai-notes-backend:latest --target prod .
   
   cd ../client/my-project
   docker build -t ai-notes-frontend:latest .
   ```

2. **Create Secrets**:
   ```bash
   cp k8s/secrets.yml.example k8s/secrets.yml
   # Edit secrets.yml with your actual values
   ```

3. **Deploy**:
   ```bash
   kubectl apply -f k8s/namespace.yml
   kubectl apply -f k8s/configmap.yml
   kubectl apply -f k8s/secrets.yml
   kubectl apply -f k8s/mongo-deployment.yml
   kubectl apply -f k8s/mongo-service.yml
   kubectl apply -f k8s/backend-deployment.yml
   kubectl apply -f k8s/frontend-deployment.yml
   kubectl apply -f k8s/services.yml
   ```

4. **Verify**:
   ```bash
   kubectl get pods -n ai-notes
   kubectl get svc -n ai-notes
   ```

5. **Access Application**:
   - Frontend: http://localhost:30007 (NodePort)
   - Or use port-forward: `kubectl port-forward svc/frontend 3000:80 -n ai-notes`

### Using Deployment Script

```bash
chmod +x k8s/deploy.sh
./k8s/deploy.sh
```

## 📁 Project Structure

```
AI_Notes_DevOps/
├── client/
│   └── my-project/          # React frontend application
│       ├── src/
│       │   ├── api/         # API client functions
│       │   ├── components/  # React components
│       │   └── config.js    # Configuration
│       ├── Dockerfile       # Frontend Docker image
│       └── nginx.conf       # Nginx configuration
│
├── server/                  # Node.js backend API
│   ├── routes/             # API routes
│   ├── models/             # MongoDB models
│   ├── middleware/         # Express middleware
│   ├── tests/              # Test files
│   └── Dockerfile          # Backend Docker image
│
├── k8s/                     # Kubernetes manifests
│   ├── namespace.yml       # Namespace definition
│   ├── configmap.yml       # Configuration
│   ├── secrets.yml.example # Secrets template
│   ├── mongo-deployment.yml
│   ├── backend-deployment.yml
│   ├── frontend-deployment.yml
│   ├── services.yml        # Service definitions
│   ├── deploy.sh           # Deployment script
│   └── README.md           # K8s deployment guide
│
├── docker-compose.yml      # Local development
├── docker-compose.ci.yml   # CI testing
├── Jenkinsfile             # CI/CD pipeline
└── README.md              # This file
```

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongo:27017/neura_notes
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
CLIENT_URL=http://localhost:30007
```

#### Frontend
- Uses relative `/api` path in production (configured in `src/config.js`)
- No environment variables needed for Kubernetes deployment

### Kubernetes Secrets

Create `k8s/secrets.yml` from template:
```bash
cp k8s/secrets.yml.example k8s/secrets.yml
```

Required secrets:
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `GEMINI_API_KEY`: Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## 🐛 Troubleshooting

### Common Issues

1. **Images not displaying**
   - ✅ Fixed: Nginx now proxies `/uploads/` to backend
   - Verify: Check nginx.conf includes `/uploads/` location block

2. **502 Bad Gateway on AI features**
   - Cause: Invalid or missing Gemini API key
   - Solution: Update `k8s/secrets.yml` with valid API key and restart backend

3. **Pods not starting**
   - Check: `kubectl describe pod <pod-name> -n ai-notes`
   - Verify: Image pull policy and image names are correct
   - Check logs: `kubectl logs <pod-name> -n ai-notes`

4. **Backend can't connect to MongoDB**
   - Verify: MongoDB pod is running
   - Check: MONGO_URI in secrets matches service name
   - Test: `kubectl exec -it <mongo-pod> -n ai-notes -- mongosh`

### Useful Commands

```bash
# View all resources
kubectl get all -n ai-notes

# Check pod logs
kubectl logs -n ai-notes -l app=backend --tail=50
kubectl logs -n ai-notes -l app=frontend --tail=50

# Restart deployments
kubectl rollout restart deployment ai-notes-backend -n ai-notes
kubectl rollout restart deployment ai-notes-frontend -n ai-notes

# Delete everything
kubectl delete namespace ai-notes

# Test backend connectivity
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -n ai-notes -- curl http://backend:5000/
```

For more detailed troubleshooting, see [k8s/TROUBLESHOOTING.md](k8s/TROUBLESHOOTING.md)

## 🧪 Testing

### Run Tests Locally

**Backend Tests**:
```bash
cd server
npm test
```

**Frontend E2E Tests**:
```bash
cd client/my-project
npm run test:e2e
```

### CI Testing

Tests run automatically in Jenkins pipeline using `docker-compose.ci.yml`:
- Backend unit and integration tests
- Frontend E2E tests with Playwright

## 📚 Documentation

- [Kubernetes Deployment Guide](k8s/README.md)
- [Troubleshooting Guide](k8s/TROUBLESHOOTING.md)
- [Deployment Summary](DEPLOYMENT.md)
- [CD Implementation Summary](CD_IMPLEMENTATION_SUMMARY.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- React & Vite for frontend framework
- Express.js for backend API
- MongoDB for database
- Google Gemini for AI features
- Jenkins for CI/CD automation
- Kubernetes for container orchestration

---

**Built with ❤️ using modern DevOps practices**
