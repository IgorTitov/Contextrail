<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document server-deployment for this repository.
@sidecar server-deployment.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Server deployment guide

How to deploy server-side applications built with the Contextrail hex modules.

This guide covers the `apps/api-starter/` app shell and any custom server
app that uses the same hex module wiring pattern.

## Prerequisites

- Node.js >= 18.18.0
- The app runs as a standard Node.js process — no bundler, no transpiler

## Environment variables

| Variable   | Default       | Description                |
| ---------- | ------------- | -------------------------- |
| `NODE_ENV` | `development` | Server mode                |
| `PORT`     | `3000`        | Listen port                |
| `HOST`     | `0.0.0.0`     | Listen host / bind address |

## Running directly

```bash
NODE_ENV=production PORT=8080 node apps/api-starter/app.mjs
```

## Process management with PM2

[PM2](https://pm2.keymetrics.io/) keeps the process alive and handles
log rotation, clustering, and zero-downtime reloads.

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start apps/api-starter/app.mjs --name api-starter \
  --env NODE_ENV=production \
  --env PORT=3000

# Cluster mode (one process per CPU core)
pm2 start apps/api-starter/app.mjs --name api-starter -i max

# Zero-downtime reload
pm2 reload api-starter

# Save current process list for auto-restart on reboot
pm2 save
pm2 startup
```

### ecosystem.config.cjs

```javascript
module.exports = {
  apps: [{
    name: 'api-starter',
    script: 'apps/api-starter/app.mjs',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
};
```

```bash
pm2 start ecosystem.config.cjs --env production
```

## systemd unit

For Linux servers without PM2, use a systemd service:

```ini
# /etc/systemd/system/api-starter.service
[Unit]
Description=Contextrail API Starter
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/opt/api-starter
ExecStart=/usr/bin/node apps/api-starter/app.mjs
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable api-starter
sudo systemctl start api-starter
sudo journalctl -u api-starter -f
```

## Docker

The repository includes a multi-stage `Dockerfile`. For the API starter:

```bash
# Build the production image
docker build --target production -t api-starter .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --name api-starter \
  api-starter

# Or use docker-compose
docker compose up -d
```

### Custom Dockerfile for api-starter only

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY modules/ modules/
COPY apps/api-starter/ apps/api-starter/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api-starter/app.mjs"]
```

This minimal image includes only the hex modules and the app shell — no
dev dependencies, no test files, no build tooling.

## Kubernetes

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-starter
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-starter
  template:
    metadata:
      labels:
        app: api-starter
    spec:
      containers:
        - name: api-starter
          image: your-registry/api-starter:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 3
            periodSeconds: 5
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-starter
spec:
  selector:
    app: api-starter
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

The `/health` endpoint returns `{ status: "ok", uptime, mode }` — use it
for both liveness and readiness probes.

## Graceful shutdown

For production deployments, add graceful shutdown handling to your app:

```javascript
// After startServer()
const { server } = startServer();

function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

PM2 and Kubernetes send `SIGTERM` before killing the process. This
pattern lets in-flight requests complete before the process exits.

## Reverse proxy (Nginx)

```nginx
upstream api_starter {
    server 127.0.0.1:3000;
    # Add more backends for load balancing
    # server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://api_starter;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Production checklist

- [ ] `NODE_ENV=production` is set
- [ ] Process manager (PM2 / systemd) handles restarts
- [ ] Health endpoint (`/health`) monitored
- [ ] Graceful shutdown handles SIGTERM
- [ ] Reverse proxy terminates TLS
- [ ] CORS `Access-Control-Allow-Origin` restricted to your domain
- [ ] Logs are collected (structured JSON via `log` module)
- [ ] Resource limits set (memory, CPU)
