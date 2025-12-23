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
                docker build -t avvatni/ai-notes-backend:${GIT_COMMIT} server
                docker build -t avvatni/ai-notes-frontend:${GIT_COMMIT} client/my-project
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
      docker push avvatni/ai-notes-backend:${GIT_COMMIT}
      docker push avvatni/ai-notes-frontend:${GIT_COMMIT}
    '''
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
