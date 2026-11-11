def run(cmd) {
    if (isUnix()) {
        sh cmd
    } else {
        bat cmd
    }
}

def awsRun(cmd) {
    withCredentials([
        string(credentialsId: 'aws-key-id',
               variable: 'AWS_ACCESS_KEY_ID'),
        string(credentialsId: 'aws-secret',
               variable: 'AWS_SECRET_ACCESS_KEY')
    ]) {
        withEnv(["AWS_DEFAULT_REGION=${env.REGION}"]) {
            run(cmd)
        }
    }
}

def ecrLogin() {
    awsRun(
        "aws ecr get-login-password --region ${env.REGION} | " +
        "docker login --username AWS --password-stdin ${env.REGISTRY}"
    )
}

def deploy() {
     awsRun(
        "aws ssm send-command --region ${env.REGION} " +
        "--instance-ids ${env.INSTANCE} " +
        "--document-name AWS-RunShellScript " +
        "--parameters file://deploy.json"
    )
}

pipeline {
    agent any

    environment {
        REGION   = 'ap-south-1'
        ACCOUNT  = '272698321276'
        REPO     = 'hello-jenkins'
        INSTANCE = 'i-08e0d888ee1dd8352'

        REGISTRY = "${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
        IMG      = "${REPO}:${BUILD_NUMBER}"
        REMOTE   = "${REGISTRY}/${REPO}:latest"
    }

    stages {

        stage('Check Tools') {
            steps {
                bat 'docker --version'
                bat 'aws --version'
            }
        }

        stage('Snapshot Builds') {
            steps {
                script {
                    def builds = []

                    // Current build, shown as RUNNING because it hasn't finished
                    builds << [
                        number   : currentBuild.number,
                        result   : 'RUNNING',
                        duration : 0,
                        timestamp: currentBuild.timeInMillis
                    ]

                    // Earlier builds of this job (up to 20)
                    def prev = currentBuild.previousBuild
                    def count = 0
                    while (prev != null && count < 20) {
                        builds << [
                            number   : prev.number,
                            result   : prev.result ?: 'RUNNING',
                            duration : prev.duration,
                            timestamp: prev.timeInMillis
                        ]
                        prev = prev.previousBuild
                        count++
                    }

                    def successful = builds.count { it.result == 'SUCCESS' }
                    def failed     = builds.count { it.result == 'FAILURE' }

                    def snapshot = [
                        status          : 'success',
                        job             : 'deploypulse-pipeline',
                        totalBuilds     : builds.size(),
                        successfulBuilds: successful,
                        failedBuilds    : failed,
                        builds          : builds
                    ]

                    writeFile file: 'deploypulse/builds.json',
                            text: groovy.json.JsonOutput.prettyPrint(
                                groovy.json.JsonOutput.toJson(snapshot))
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    run "docker build -t ${IMG} ."
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    run "docker run --rm ${IMG} nginx -t"
                }
            }
        }

        stage('Push') {
            steps {
                script {
                    awsRun(
                        "aws sts get-caller-identity"
                    )

                    ecrLogin()

                    run "docker tag ${IMG} ${REMOTE}"
                    run "docker push ${REMOTE}"
                }
            }
        }

        stage('Deploy') {
            when {
                expression { env.INSTANCE != 'none' }
            }
            steps {
                script {
                    deploy()
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check Console Output.'
        }
    }
}
