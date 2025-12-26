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
                        kubectl apply -f k8s/namespace.yml
                        kubectl apply -f k8s/configmap.yml

                        kubectl create secret generic ai-notes-secrets \
                            --namespace ai-notes \
                            --from-literal=MONGO_URI=$MONGO_URI \
                            --from-literal=GEMINI_API_KEY=$GEMINI_API_KEY \
                            --from-literal=JWT_SECRET=$JWT_SECRET \
                            --dry-run=client -o yaml | kubectl apply -f -

                        kubectl apply -f k8s/mongo-deployment.yml
                        kubectl apply -f k8s/mongo-service.yml
                        kubectl apply -f k8s/backend-deployment.yml
                        kubectl apply -f k8s/frontend-deployment.yml
                        kubectl apply -f k8s/services.yml

                        kubectl rollout status deployment/ai-notes-backend -n ai-notes --timeout=5m
                        kubectl rollout status deployment/ai-notes-frontend -n ai-notes --timeout=5m
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
