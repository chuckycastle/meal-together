# Deployment Checklist

Quick reference checklist for deploying MealTogether to production.

## Pre-Deployment

Before running deployment command:

- [ ] **Git status clean**: Run `git status` - no uncommitted changes
- [ ] **Code committed**: All changes committed with clear message
- [ ] **Code pushed**: Changes pushed to GitHub `main` branch
- [ ] **Frontend builds locally**: Run `cd frontend && npm run build` - completes without errors
- [ ] **Tests pass** (if applicable): Run `npm test`
- [ ] **Environment variables updated**: If config changes needed, verify `.env.production` files
- [ ] **Database migration ready** (if needed): Migration tested locally

## Deployment

Run the deployment command:

```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'cd /opt/applications/meal-together && \
   git pull && \
   cd frontend && \
   npm run build && \
   sudo systemctl reload nginx'
```

Watch command output for:
- [ ] **Git pull successful**: No merge conflicts or errors
- [ ] **npm build completes**: No TypeScript or build errors
- [ ] **Nginx reload successful**: No configuration errors

## Post-Deployment Verification

Immediately after deployment:

- [ ] **Site loads**: Visit https://mealtogether.chuckycastle.io
- [ ] **Hard refresh browser**: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows/Linux)
- [ ] **Login works**: Test authentication
- [ ] **Navigation works**: Click through main pages (Dashboard, Recipes, Shopping, Timeline, Cooking, Families, Profile)
- [ ] **No console errors**: Check browser DevTools console for errors
- [ ] **WebSocket connects**: Real-time features work (shopping list updates, etc.)
- [ ] **API responses working**: Network tab shows successful API calls

## Test Critical Features

Verify core functionality:

- [ ] **Recipe operations**: View, create, edit recipes
- [ ] **Shopping list**: Add/check/remove items, real-time updates
- [ ] **Timeline planning**: Select recipes, calculate timeline
- [ ] **Cooking session**: Start cooking, use timers
- [ ] **Family management**: View members, switch families
- [ ] **Profile updates**: Change settings, update password

## If Issues Occur

If deployment causes problems:

1. **Check deployment output**: Look for error messages in deployment command output
2. **View backend logs**: `ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 'sudo journalctl -u mealtogether -n 50'`
3. **Check nginx logs**: `ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 'sudo tail -f /var/log/nginx/error.log'`
4. **Browser DevTools**: Check Console and Network tabs for errors
5. **Rollback if critical**: See DEPLOYMENT.md "Rollback Procedures" section

## Database Migrations (If Needed)

If deployment includes database schema changes:

- [ ] **Migration tested locally**: Run and verify migration on local database first
- [ ] **Backup database**: Create backup before running migration in production
- [ ] **Run migration**:
  ```bash
  ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
    'cd /opt/applications/meal-together/backend && \
     source venv/bin/activate && \
     flask db upgrade'
  ```
- [ ] **Verify migration success**: Check migration output for errors
- [ ] **Test affected features**: Verify features using changed schema work correctly

## Backend Changes (If Needed)

If deployment includes backend code changes:

- [ ] **Restart backend service**:
  ```bash
  ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
    'sudo systemctl restart mealtogether'
  ```
- [ ] **Check service status**:
  ```bash
  ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
    'sudo systemctl status mealtogether'
  ```
- [ ] **Service running**: Status shows "active (running)"
- [ ] **No errors in logs**: `sudo journalctl -u mealtogether -n 20` shows no errors

## Documentation

After deployment:

- [ ] **Update CHANGELOG** (if applicable): Document deployed changes
- [ ] **Tag release** (for major releases): `git tag v1.x.x && git push --tags`
- [ ] **Document issues**: Note any deployment issues encountered for future reference

## Quick Links

- **Full Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Development Guide**: [CLAUDE.md](./CLAUDE.md)
- **Project Overview**: [README.md](./README.md)

## Common Issues Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Frontend not updating | Hard refresh browser (Cmd+Shift+R) |
| 502 Bad Gateway | Restart backend: `sudo systemctl restart mealtogether` |
| Nginx errors | Check config: `sudo nginx -t` |
| Database connection errors | Verify DATABASE_URL in backend .env |
| WebSocket not working | Check nginx WebSocket proxy config |
| Build fails | Check for TypeScript errors locally first |
