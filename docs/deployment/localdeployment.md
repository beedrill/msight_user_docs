# Local Deployment
MSight Edge system can be deployed locally in the case that Docker is not available or not preferred. Here is a step-by-step guidance.

## 1. Install Redis Server on the local machine
Follow the [installation guidance](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-linux/) to install Redis database.

To check Redis is working properly:
```bash
redis-server --version # check if the Redis server is installed
redis-cli ping # check if Redis is running now
```

## 2. Install MSight Edge module
To install this on a server, you might want to configure your access to git by using deploykey, service user or other method. Check the tutorial [here](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys).
```bash
git clone https://github.com/michigan-traffic-lab/MSight_Edge2.git
git checkout release/some-version
cd MSight_Edge2
sudo apt install libgl1
pip install .
```

## 3. Write config file for Supervisor
Here is an example:
```
[program:udp_stadium]
command=msight_launch_udp_server -n ouster_sdsm_main_stadium -t ouster_sdsm --sensor-name ouster_sdsm_main_stadium --port 7001 --host "::" --ipv6
environment=MSIGHT_EDGE_DEVICE_NAME="your-edgebox-name"
autostart=true
autorestart=true
stdout_logfile=/var/log/msight/udp_stadium.out.log
stderr_logfile=/var/log/msight/udp_stadium.err.log
stdout_logfile_maxbytes=10MB
stderr_logfile_maxbytes=10MB
stdout_logfile_backups=5
stderr_logfile_backups=5

[program:http_upload]
command=msight_launch_http -n ouster_http_upload -t ouster_sdsm --url example-url --wait 3
environment=MSIGHT_EDGE_DEVICE_NAME="your-edgebox-name"
autostart=true
autorestart=true
stdout_logfile=/var/log/msight/http_upload.out.log
stderr_logfile=/var/log/msight/http_upload.err.log
stdout_logfile_maxbytes=10MB
stderr_logfile_maxbytes=10MB
stdout_logfile_backups=5
stderr_logfile_backups=5
```

## 4.  Copy the configuration to the correct place
```bash 
sudo cp sip-cloud-udp-relay.conf /etc/supervisor/conf.d/msight.conf
```

## 5. Start Supervisor
```bash
sudo supervisorctl reread
sudo supervisorctl update
```

Now the system should be deployed successfully.

## 6. Enable Supervisor start on boot
```bash
sudo systemctl enable supervisor
sudo systemctl start supervisor
```

## Check if the Supervisor code is running correctly:

To check the status of all processes:
```bash
sudo supervisorctl status
```

To check the logs:
```bash
tail -f /var/log/msight/udp_stadium.err.log
```

Or change the file name to others to see the other program's output, note that the logging is going to stderr so you should read `*.err.log` file.

## Modification & update
If you already deployed the service and need to update the conf file, do the following:
First copy the new config file:
```bash
sudo cp sip-cloud-udp-relay.conf /etc/supervisor/conf.d/msight.conf
```

then, update the service with the new configs:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart all
```