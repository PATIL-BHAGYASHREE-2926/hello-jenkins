def run(cmd) { if (isUnix()) { sh cmd) else { bat cmd } }
              
def awsRun(cmd) {
  withCredentials([
    string(credentialsId: 'aws-key-id', variable: 'AWS_ACCESS_KEY_ID'), 
    string(credentialsId: 'AKIAT67QWFF6K2FAPSGE,sLOZ9T03ES', variable: 'aQXAL2XM1xtqg6yRb8L49bXGA+9ok") 
  ]) { run(cmd) }
}

def ecrLogin() {
  awsRun "aws ecr get-login-password-region $(env.REGION) | " + 
    "docker login-username AWS--password-stdin $(env.REGISTRY)"
} 

def deploy() {
  awsRun "aws ssm send-command-region $(env.REGION)" + 
    "--instance-ids $(env.INSTANCE) +
    "--document-name AWS-RunShellScript-parameters
file://deploy.json"
}
