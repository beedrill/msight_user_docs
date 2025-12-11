## Use Unix socket instead of loopback address:
docker run -d \
  -v /var/run/docker/sockets:/var/run/redis \
  -v /path/to/redis.conf:/usr/local/etc/redis/redis.conf \
  --name my-redis-container \
  redis:latest redis-server /usr/local/etc/redis/redis.conf
