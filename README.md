# Docker Swarm Job Scheduler
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Introduction
A container runs in Swarm cluster as a service, manages scheduled/delayed/cron based jobs for you.

## How it works
This service relies on [bull](https://github.com/betarabbit/bull) to manage jobs, add job queue and job information in redis, and registers job prossoror as an one-time container.

## Features
- [X] Cron scheduled job in container
- [X] Swarm master/worker separation
- [X] Support private image repository
- [X] Swarm network attachable
- [X] Send job execution status to Graphite

## Usage
Add job configuration in `config/default.json`.
```json
{
    "name": "Ping Redis",
    "image": "casplatformregistry.azurecr.io/busybox",
    "registry": {
    "username": "REGISTRY_USERNAME",
    "password": "REGISTRY_PASSWORD",
    "serveraddress": "REGISTRY_SERVER"
    },
    "cmd": [ "ping", "redis", "-c", "1" ],
    "networkName": "NETWORK_NAME",
    "location": "manager",
    "repeat": {
    "cron": "* * * * *"
    }
}
```

Add this service as a global service in Swarm stack, bind `/var/run/docker.sock` and `/var/lib/docker/containers` as volumes.
```yaml
scheduler:
    image: scheduler:latest
    networks:
      - attachable_net
    volumes:
      - type: bind
        source: /var/run/docker.sock
        target: /var/run/docker.sock
      - type: bind
        source: /var/lib/docker/containers
        target: /var/lib/docker/containers
    environment:
      NODE_ENV: production
      REDIS: "redis://redis:6379"
      NETWORK_NAME: "test_attachable_net"
      REGISTRY_USERNAME: "PALCEHOLDER_REGISTRY_USERNAME"
      REGISTRY_PASSWORD: "PALCEHOLDER_REGISTRY_PASSWORD"
      REGISTRY_SERVER: "PALCEHOLDER_REGISTRY_SERVER"
      STATSD_HOST: graphite
      STATSD_PORT: 8125
      STATSD_PREFIX: tasks.
    configs:
      - source: task_config
        target: /opt/scheduler/config/default.json
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "10"
    deploy:
      mode: global
      update_config:
        parallelism: 2
        delay: 10s
      restart_policy:
        condition: on-failure
```
