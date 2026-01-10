pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        DOCKER_BUILDKIT = '1'
        COMPOSE_DOCKER_CLI_BUILD = '1'
    }

    stages {
        stage('Checkout code') {
            steps {
                checkout scm
            }
        }

        stage('Docker infra (Debug)') {
            steps {
                sh 'docker --version'
                sh 'docker compose version'
            }
        }

        stage('Clean previous CI containers') {
            steps {
                sh '''
                  docker compose -f docker-compose.ci.yml down -v --remove-orphans || true
                '''
            }
        }

        stage('Build & Run Tests (CI)') {
            steps {
                sh '''
                  docker compose -f docker-compose.ci.yml up \
                  --build \
                  --abort-on-container-exit
                '''
            }
        }

        stage('Cleanup after CI') {
            steps {
                sh '''
                  docker compose -f docker-compose.ci.yml down -v --remove-orphans || true
                '''
            }
        }

        stage('Build Production Images'){
            steps {
                sh '''
                docker build -t avvatni/ai-notes-backend:${GIT_COMMIT} --target prod ./server
                docker build -t avvatni/ai-notes-frontend:${GIT_COMMIT} ./client/my-project
                '''
            }
        }

        stage('Docker Login') {
  steps {
    withCredentials([
      usernamePassword(
        credentialsId: 'dockerhub-creds-id',
        usernameVariable: 'DOCKER_USER',
        passwordVariable: 'DOCKER_PASS'
      )
    ]) {
      sh '''
        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
      '''
    }
  }
}

        stage('Push Images to Docker Hub') {
            steps {
                sh '''
                    # Push commit-specific tags
                    docker push avvatni/ai-notes-backend:${GIT_COMMIT}
                    docker push avvatni/ai-notes-frontend:${GIT_COMMIT}

                    # Tag images as latest
                    docker tag avvatni/ai-notes-backend:${GIT_COMMIT} avvatni/ai-notes-backend:latest
                    docker tag avvatni/ai-notes-frontend:${GIT_COMMIT} avvatni/ai-notes-frontend:latest

                    # Push latest tags
                    docker push avvatni/ai-notes-backend:latest
                    docker push avvatni/ai-notes-frontend:latest
                '''
            }
        }

        /* ===================== CD STARTS HERE ===================== */
        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([
                    string(credentialsId: 'MONGO_ATLAS_URI', variable: 'MONGO_URI'),
                    string(credentialsId: 'GEMINI_API_KEY', variable: 'GEMINI_API_KEY'),
                    string(credentialsId: 'JWT_SECRET', variable: 'JWT_SECRET')
                ]) {
                    sh '''
                        set -e
                        
                        echo "Creating namespace..."
                        kubectl apply -f k8s/namespace.yml
                        
                        echo "Creating ConfigMap..."
                        kubectl apply -f k8s/configmap.yml

                        echo "Creating/updating secrets..."
                        # Use local MongoDB service in K8s cluster instead of Atlas
                        LOCAL_MONGO_URI="mongodb://mongo:27017/neura_notes"
                        kubectl create secret generic ai-notes-secrets \
                            --namespace ai-notes \
                            --from-literal=MONGO_URI=$LOCAL_MONGO_URI \
                            --from-literal=GEMINI_API_KEY=$GEMINI_API_KEY \
                            --from-literal=JWT_SECRET=$JWT_SECRET \
                            --dry-run=client -o yaml | kubectl apply -f -

                        echo "Deploying MongoDB..."
                        kubectl apply -f k8s/mongo-deployment.yml
                        kubectl apply -f k8s/mongo-service.yml
                        
                        echo "Waiting for MongoDB to be ready..."
                        kubectl wait --for=condition=available --timeout=300s deployment/mongo -n ai-notes || true
                        kubectl wait --for=condition=ready pod -l app=mongo -n ai-notes --timeout=300s || true
                        
                        # Give MongoDB additional time to fully initialize and accept connections
                        echo "Waiting for MongoDB to fully initialize (15 seconds)..."
                        sleep 15

                        echo "Deploying backend..."
                        kubectl apply -f k8s/backend-deployment.yml
                        
                        echo "Deploying frontend..."
                        kubectl apply -f k8s/frontend-deployment.yml
                        
                        echo "Creating services..."
                        kubectl apply -f k8s/services.yml

                        echo "Deploying Prometheus..."
                        kubectl apply -f k8s/prometheus-rbac.yml
                        kubectl apply -f k8s/prometheus-config.yml
                        kubectl apply -f k8s/prometheus-deployment.yml
                        kubectl apply -f k8s/prometheus-service.yml

                        echo "Deploying Grafana..."
                        kubectl apply -f k8s/grafana-config.yml
                        kubectl apply -f k8s/grafana-dashboard-config.yml
                        kubectl apply -f k8s/grafana-deployment.yml
                        kubectl apply -f k8s/grafana-service.yml

                        echo "Waiting for backend rollout..."
                        kubectl rollout status deployment/ai-notes-backend -n ai-notes --timeout=5m || {
                            echo "Backend rollout failed, checking pod status..."
                            kubectl describe pod -l app=backend -n ai-notes
                            kubectl logs -l app=backend -n ai-notes --tail=50
                            exit 1
                        }
                        
                        echo "Waiting for frontend rollout..."
                        kubectl rollout status deployment/ai-notes-frontend -n ai-notes --timeout=5m || {
                            echo "Frontend rollout failed, checking pod status..."
                            kubectl describe pod -l app=frontend -n ai-notes
                            kubectl logs -l app=frontend -n ai-notes --tail=50
                            exit 1
                        }
                        
                        echo "Waiting for monitoring stack..."
                        kubectl wait --for=condition=available --timeout=120s deployment/prometheus -n ai-notes || true
                        kubectl wait --for=condition=available --timeout=120s deployment/grafana -n ai-notes || true
                        
                        echo "Deployment completed successfully!"
                        kubectl get pods -n ai-notes
                        kubectl get svc -n ai-notes
                        echo ""
                        echo "📊 Monitoring Stack:"
                        echo "   - Prometheus: http://localhost:30008"
                        echo "   - Grafana: http://localhost:30009 (admin/admin)"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'CI pipeline passed successfully!'
        }
        failure {
            echo 'CI pipeline failed. Check logs above.'
        }
        always {
            sh 'docker logout || true'
            sh 'docker system prune -f || true'
        }
    }
}
