# Backend Deployment Guide

## Development Environment

### Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Run with Auto-Reload
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Access at `http://localhost:8000`
- API: `http://localhost:8000/api/*`
- Docs: `http://localhost:8000/docs`

---

## Docker Deployment

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Build & Run
```bash
docker build -t pipeline-intelligence-backend .
docker run -p 8000:8000 \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/data:/app/data \
  pipeline-intelligence-backend
```

### Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - LOG_LEVEL=info
    volumes:
      - ./models:/app/models:ro
      - ./data:/app/data:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

---

## Production Deployment (Linux/AWS)

### 1. Install System Dependencies
```bash
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev
```

### 2. Clone & Setup
```bash
git clone https://github.com/yourorg/pipeline-intelligence.git
cd pipeline-intelligence/backend

python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

### 3. Create Systemd Service
```bash
sudo nano /etc/systemd/system/pipeline-backend.service
```

```ini
[Unit]
Description=Pipeline Intelligence Backend
After=network.target

[Service]
Type=notify
User=pipelines
WorkingDirectory=/opt/pipeline-intelligence/backend
Environment="PATH=/opt/pipeline-intelligence/backend/venv/bin"
ExecStart=/opt/pipeline-intelligence/backend/venv/bin/gunicorn \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  -b 0.0.0.0:8000 \
  --timeout 60 \
  main:app

[Install]
WantedBy=multi-user.target
```

### 4. Enable & Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable pipeline-backend
sudo systemctl start pipeline-backend
sudo systemctl status pipeline-backend
```

### 5. Nginx Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/pipeline-api
```

```nginx
upstream pipeline_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.pipeline.example.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://pipeline_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/pipeline-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL with Let's Encrypt
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.pipeline.example.com
```

---

## Environment Variables

Create `.env` file in `backend/`:
```bash
LOG_LEVEL=info
MODEL_PATH=../models
DATA_PATH=../data
USGS_API_TIMEOUT=10
CORS_ORIGINS=https://frontend.example.com
DEBUG=false
```

Load in `main.py`:
```python
from dotenv import load_dotenv
import os

load_dotenv()
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
```

---

## Monitoring & Logging

### Application Logs
```bash
# Systemd
sudo journalctl -u pipeline-backend -f

# Docker
docker logs -f <container_id>
```

### Health Check
```bash
curl http://localhost:8000/api/health
# Expected: {"status": "healthy", "ml_ready": true, "timestamp": "..."}
```

### Metrics (Optional: Prometheus)
```bash
pip install prometheus-client
```

Add to `main.py`:
```python
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

---

## Scaling Strategies

### 1. Horizontal (Multiple Instances)
```bash
# Load balance with Nginx upstream
upstream pipeline_backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}

# Run multiple workers
for i in {0..2}; do
  PORT=$((8000 + $i)) python -m uvicorn main:app --port $PORT &
done
```

### 2. Vertical (More Workers)
```bash
gunicorn -w 8 -k uvicorn.workers.UvicornWorker main:app
```

### 3. Container Orchestration (Kubernetes)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pipeline-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pipeline-backend
  template:
    metadata:
      labels:
        app: pipeline-backend
    spec:
      containers:
      - name: pipeline-backend
        image: pipeline-intelligence-backend:latest
        ports:
        - containerPort: 8000
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## Troubleshooting

### Models Not Loading
```bash
# Check file permissions
ls -la ../models/
file ../models/model.pkl

# Verify joblib compatibility
python -c "import joblib; print(joblib.load('../models/model.pkl'))"
```

### High Memory Usage
```bash
# Check if singletons are being recreated
ps aux | grep uvicorn
# Should see only N+1 processes (N workers + master)
```

### Slow Routes
```bash
# Profile with
pip install py-spy
py-spy record -o profile.svg -- python -m uvicorn main:app
```

### CORS Issues
```bash
# Verify CORS middleware is first
# In main.py, ensure CORSMiddleware.add_middleware() is called BEFORE routers
```

---

## Backup & Recovery

### Model Backup
```bash
tar czf models_backup_$(date +%Y%m%d).tar.gz ../models/
rsync -avz ../models/ backup-server:/backup/models/
```

### Data Backup
```bash
cron: 0 2 * * * tar czf /backup/data_$(date +\%Y\%m\%d).tar.gz /opt/pipeline-intelligence/data/
```

---

## Performance Checklist

- [ ] Models load in < 5 seconds at startup
- [ ] Prediction endpoint responds in < 100ms
- [ ] Earthquake API calls cached for 5+ minutes
- [ ] Graph loaded into memory (not re-parsed per request)
- [ ] Gunicorn workers >= CPU cores
- [ ] Nginx gzip enabled
- [ ] Database queries (if added) use connection pooling
