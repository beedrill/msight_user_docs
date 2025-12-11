# Enable AWS Cloudwatch for Logging
Enabling this feature will allow the user view the log from the cloud.

To do this:
1. setup IAM user and grant the user with Cloud wathc access. Refer to [this article](https://docs.docker.com/config/containers/logging/awslogs/)
2. Once created user, you will get the access key and secret. Add them to docker, by creating a file on the path `/etc/systemd/system/docker.service.d/override.conf`, and add the following to it
```
[Service]
Environment="AWS_ACCESS_KEY_ID=my-aws-access-key"
Environment="AWS_SECRET_ACCESS_KEY=my-secret-access-key"
```

3. You can then specify logging option in docker-compose.yml, which is should already be setup.
4. reload docker
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```
