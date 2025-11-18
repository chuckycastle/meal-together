# MealTogether Deployment Guide

This guide covers deploying the MealTogether application to production.

## Quick Deployment

For quick updates after initial server setup:

```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'cd /opt/applications/meal-together && \
   git pull && \
   cd frontend && \
   npm run build && \
   sudo systemctl reload nginx'
```

This command:
1. Connects to production server via SSH
2. Pulls latest code from GitHub
3. Builds the frontend production bundle
4. Reloads nginx to serve the new build

## Production Infrastructure

- **Server**: AWS Lightsail instance
- **IP Address**: 44.211.71.114
- **Domain**: mealtogether.chuckycastle.io
- **SSL**: Let's Encrypt (auto-renewed)
- **Web Server**: Nginx with WebSocket support
- **Backend**: Flask app running as systemd service
- **Database**: PostgreSQL
- **SSH Key**: ~/.ssh/LightsailDefaultKey-us-east-1.pem

## Initial Server Setup vs. Quick Deployment

### Initial Setup (One-time)

Use the `deploy.sh` script for first-time server setup:

```bash
./deploy.sh
```

This script:
- Creates application directories
- Deploys backend and frontend code via rsync
- Sets up Python virtual environment
- Creates PostgreSQL database
- Installs systemd service (mealtogether.service)
- Configures nginx with SSL
- Sets up production secrets

**Note**: Only run this for initial deployment or complete server rebuild.

### Quick Deployment (Regular Updates)

Use the SSH command above for regular code updates. This assumes:
- Server already configured via deploy.sh
- Systemd service installed and running
- Nginx configured
- Database created and migrated

## Deployment Workflow

### 1. Pre-Deployment

Before deploying:

```bash
# Ensure working directory is clean
git status

# Ensure frontend builds locally
cd frontend && npm run build

# Run tests if applicable
npm test
```

### 2. Commit and Push

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

### 3. Deploy to Production

Run the quick deployment command (see Quick Deployment section above).

### 4. Post-Deployment Verification

After deployment:

1. **Check nginx reload succeeded** - Command should complete without errors
2. **Verify site loads**: Visit https://mealtogether.chuckycastle.io
3. **Test critical features**:
   - Login
   - Create/view recipes
   - Shopping list updates
   - WebSocket real-time features
4. **Check backend service**: `ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 'sudo systemctl status mealtogether'`

## Environment Variables

### Backend (.env on server)

Located at: `/opt/applications/meal-together/backend/.env`

Required variables:
```bash
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=<random-secret>
DATABASE_URL=postgresql://localhost/meal_together_prod
JWT_SECRET_KEY=<random-secret>
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000
FRONTEND_URL=https://mealtogether.chuckycastle.io
PORT=5000
```

### Frontend (.env.production)

Located at: `/Users/chuckycastle/git/meal-together/frontend/.env.production`

```bash
VITE_API_URL=https://mealtogether.chuckycastle.io
VITE_WS_URL=https://mealtogether.chuckycastle.io
```

**Security Note**: Never commit actual secrets to git. Use `.env.example` files for templates.

## Service Management

### Systemd Service

The backend runs as a systemd service: `mealtogether.service`

**Check service status**:
```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'sudo systemctl status mealtogether'
```

**Restart service** (if backend code changed):
```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'sudo systemctl restart mealtogether'
```

**View service logs**:
```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'sudo journalctl -u mealtogether -f'
```

### Nginx

**Reload nginx** (after frontend changes):
```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'sudo systemctl reload nginx'
```

**Check nginx status**:
```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'sudo systemctl status nginx'
```

**View nginx error logs**:
```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'sudo tail -f /var/log/nginx/error.log'
```

## Database Migrations

When database schema changes are needed:

```bash
# Connect to server
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114

# Navigate to backend
cd /opt/applications/meal-together/backend

# Activate virtual environment
source venv/bin/activate

# Run migrations
flask db upgrade

# Exit
exit
```

**Important**: Always test migrations locally before running in production.

## Troubleshooting

### Frontend Not Updating

**Symptom**: Changes not visible after deployment

**Solutions**:
1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
2. Check build completed successfully in deployment output
3. Verify nginx reloaded: `sudo systemctl status nginx`
4. Check nginx serves correct files: `ls -la /opt/applications/meal-together/frontend/dist/`

### Backend Service Not Running

**Symptom**: 502 Bad Gateway or API errors

**Solutions**:
1. Check service status: `sudo systemctl status mealtogether`
2. View service logs: `sudo journalctl -u mealtogether -n 50`
3. Restart service: `sudo systemctl restart mealtogether`
4. Check database connection
5. Verify environment variables in `/opt/applications/meal-together/backend/.env`

### Database Connection Issues

**Symptom**: Backend fails with database errors

**Solutions**:
1. Check PostgreSQL status: `sudo systemctl status postgresql`
2. Verify DATABASE_URL in backend .env
3. Test database connection: `psql -d meal_together_prod`
4. Check database exists: `sudo -u postgres psql -l`

### WebSocket Not Working

**Symptom**: Real-time features not updating

**Solutions**:
1. Verify nginx WebSocket proxy configuration
2. Check backend Socket.IO logs
3. Test WebSocket connection in browser DevTools
4. Ensure FRONTEND_URL matches actual domain

### SSL Certificate Issues

**Symptom**: HTTPS not working or certificate expired

**Solutions**:
1. Check certbot status: `sudo certbot certificates`
2. Renew certificate: `sudo certbot renew`
3. Reload nginx: `sudo systemctl reload nginx`

## Rollback Procedures

If deployment causes critical issues:

### 1. Quick Frontend Rollback

```bash
# SSH into server
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114

# Navigate to repo
cd /opt/applications/meal-together

# Check git log for last good commit
git log --oneline -10

# Rollback to previous commit
git checkout <previous-commit-hash>

# Rebuild frontend
cd frontend && npm run build

# Reload nginx
sudo systemctl reload nginx
```

### 2. Backend Rollback

```bash
# SSH into server
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114

# Navigate to repo
cd /opt/applications/meal-together

# Rollback code
git checkout <previous-commit-hash>

# Restart service
sudo systemctl restart mealtogether
```

### 3. Database Rollback

If migration caused issues:

```bash
# Downgrade migration
cd /opt/applications/meal-together/backend
source venv/bin/activate
flask db downgrade
```

**Warning**: Database rollbacks can cause data loss. Always backup before migrations.

## Security Best Practices

### SSH Key Management

- **Keep private key secure**: Never commit ~/.ssh/LightsailDefaultKey-us-east-1.pem to git
- **Backup key**: Store encrypted backup in secure location
- **Key permissions**: Ensure key has 600 permissions (`chmod 600 ~/.ssh/LightsailDefaultKey-us-east-1.pem`)

### Secret Management

- **Never commit secrets**: Use .env files excluded from git
- **Rotate secrets regularly**: Update JWT_SECRET_KEY and SECRET_KEY periodically
- **Database credentials**: Use strong passwords, limit access
- **Environment-specific secrets**: Different secrets for dev/staging/production

### Server Access

- **Disable password authentication**: Use SSH keys only
- **Firewall rules**: Only allow necessary ports (22, 80, 443)
- **Keep system updated**: Regular security patches
- **Monitor logs**: Watch for suspicious activity

## Monitoring and Health Checks

### Application Monitoring

Check application health:

```bash
# Backend health check
curl https://mealtogether.chuckycastle.io/api/health

# Frontend loads
curl -I https://mealtogether.chuckycastle.io
```

### Resource Monitoring

On server:

```bash
# Disk usage
df -h

# Memory usage
free -h

# CPU usage
top

# Service status
sudo systemctl status mealtogether nginx postgresql
```

### Log Monitoring

Regular log review:

```bash
# Application logs
sudo journalctl -u mealtogether --since "1 hour ago"

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## Additional Resources

- **Project README**: `/README.md` - Project overview and local development
- **CLAUDE.md**: `/CLAUDE.md` - Development instructions
- **Deployment Checklist**: `/DEPLOYMENT_CHECKLIST.md` - Quick reference checklist
- **Deploy Script**: `/deploy.sh` - Initial server setup script

## Support and Troubleshooting

If issues persist after following this guide:

1. Check application logs for error messages
2. Review recent commits for potential issues
3. Test locally to isolate server vs. code issues
4. Consider rollback if critical functionality broken
5. Document issue and resolution for future reference
