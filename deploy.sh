#!/bin/bash
set -e

# MealTogether Deployment Script for AWS Lightsail
# Deploys backend (Flask) and frontend (React) to chuckycastle-apps instance

SERVER="ubuntu@44.211.71.114"
SSH_KEY="~/.ssh/LightsailDefaultKey-us-east-1.pem"
APP_DIR="/opt/applications/meal-together"
BACKEND_PORT=5000
DOMAIN="mealtogether.chuckycastle.io"

echo "🍽️  MealTogether Deployment Starting..."

# Step 1: Create application directory on server
echo "📁 Creating application directory..."
ssh -i "$SSH_KEY" "$SERVER" "sudo mkdir -p $APP_DIR/backend $APP_DIR/frontend && sudo chown -R ubuntu:ubuntu $APP_DIR"

# Step 2: Deploy Backend
echo "🔧 Deploying backend..."
rsync -avz -e "ssh -i $SSH_KEY" --exclude='venv' --exclude='__pycache__' --exclude='.pytest_cache' --exclude='*.pyc' \
  backend/ "$SERVER:$APP_DIR/backend/"

# Step 3: Deploy Frontend Build
echo "🎨 Deploying frontend..."
rsync -avz -e "ssh -i $SSH_KEY" frontend/dist/ "$SERVER:$APP_DIR/frontend/"

# Step 4: Setup Backend Environment
echo "🐍 Setting up Python environment..."
ssh -i "$SSH_KEY" "$SERVER" << 'ENDSSH'
cd /opt/applications/meal-together/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  cat > .env << 'EOF'
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
JWT_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000
DATABASE_URL=postgresql://mealtogether:mealtogether_pass@localhost/mealtogether_prod
FRONTEND_URL=https://mealtogether.chuckycastle.io
PORT=5000
EOF
  echo "⚠️  .env file created with default values. Please update DATABASE_URL and secrets!"
fi

# Check if PostgreSQL database exists, create if not
echo "📊 Checking database..."
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw mealtogether_prod || {
  sudo -u postgres psql -c "CREATE DATABASE mealtogether_prod;"
  sudo -u postgres psql -c "CREATE USER mealtogether WITH PASSWORD 'mealtogether_pass';"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mealtogether_prod TO mealtogether;"
  echo "✅ Database created"
}

# Run migrations
source venv/bin/activate
export FLASK_APP=app.py
flask db upgrade || echo "⚠️  No migrations to run or migration failed"

ENDSSH

# Step 5: Install systemd service
echo "🔄 Installing systemd service..."
scp -i "$SSH_KEY" backend/mealtogether.service "$SERVER:/tmp/"
ssh -i "$SSH_KEY" "$SERVER" "sudo mv /tmp/mealtogether.service /etc/systemd/system/ && \
  sudo systemctl daemon-reload && \
  sudo systemctl enable mealtogether && \
  sudo systemctl restart mealtogether"

# Step 6: Configure Nginx
echo "🌐 Configuring nginx..."
ssh -i "$SSH_KEY" "$SERVER" "sudo tee /etc/nginx/sites-available/mealtogether > /dev/null" << 'NGINXCONF'
# MealTogether - Collaborative Meal Planning (Port 5000)
server {
    server_name mealtogether.chuckycastle.io;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # API routes go to Flask backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket support for Socket.IO
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        proxy_hide_header X-Powered-By;
    }

    # Socket.IO endpoint
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket specific settings
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }

    # Static frontend assets
    location /assets/ {
        alias /opt/applications/meal-together/frontend/assets/;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # SPA fallback - serve index.html for all other routes
    location / {
        root /opt/applications/meal-together/frontend;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/chuckycastle.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chuckycastle.io/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP to HTTPS redirect
server {
    if ($host = mealtogether.chuckycastle.io) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name mealtogether.chuckycastle.io;
    return 404;
}
NGINXCONF

# Enable site and reload nginx
ssh -i "$SSH_KEY" "$SERVER" "sudo ln -sf /etc/nginx/sites-available/mealtogether /etc/nginx/sites-enabled/ && \
  sudo nginx -t && \
  sudo systemctl reload nginx"

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure Cloudflare DNS for mealtogether.chuckycastle.io"
echo "2. Run: sudo certbot --nginx -d mealtogether.chuckycastle.io (on server)"
echo "3. Update .env file with production secrets"
echo "4. Check service status: sudo systemctl status mealtogether"
echo ""
echo "Application will be available at: https://mealtogether.chuckycastle.io"
