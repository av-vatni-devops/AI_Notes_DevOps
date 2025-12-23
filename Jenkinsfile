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
    }

    post {
        success {
            echo 'CI pipeline passed successfully!'
        }
        failure {
            echo 'CI pipeline failed. Check logs above.'
        }
        always {
            sh 'docker system prune -f || true'
        }
    }
}
