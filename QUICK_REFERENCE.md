# Supabase Migration - Quick Reference Card

## 🚀 Quick Start

### Enable Supabase Features

Edit `frontend/.env.local`:

```bash
# Enable one at a time for gradual rollout
VITE_FEATURE_SUPABASE_AUTH=true      # ← Start here
VITE_FEATURE_SUPABASE_TIMERS=false   # ← Then this
VITE_FEATURE_SUPABASE_SHOPPING=false # ← Then this
VITE_FEATURE_DISABLE_SOCKETIO=false  # ← Finally this
```

### Deploy Changes

```bash
cd frontend
npm run build

# Deploy to production
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'cd /opt/applications/meal-together && \
   git pull && \
   cd frontend && \
   npm run build && \
   sudo systemctl reload nginx'
```

## 📊 Feature Flag States

| Auth | Timers | Shopping | Socket.IO | Mode | Description |
|------|--------|----------|-----------|------|-------------|
| ❌ | ❌ | ❌ | ✅ | **Flask** | Current state - all features on Flask |
| ✅ | ❌ | ❌ | ✅ | **Hybrid 1** | Auth on Supabase |
| ✅ | ✅ | ❌ | ✅ | **Hybrid 2** | Auth + Timers on Supabase |
| ✅ | ✅ | ✅ | ✅ | **Hybrid 3** | All on Supabase, Socket.IO for legacy |
| ✅ | ✅ | ✅ | ❌ | **Supabase** | Full migration complete |

## 🔧 Common Commands

### Check Current State
```bash
# View feature flags
cat frontend/.env.local | grep FEATURE

# Check Supabase connection
cd frontend
npm run dev
# Open browser console, look for "Feature Flags:" log
```

### Rollback
```bash
# Instant rollback - set all flags to false
VITE_FEATURE_SUPABASE_AUTH=false
VITE_FEATURE_SUPABASE_TIMERS=false
VITE_FEATURE_SUPABASE_SHOPPING=false

# Rebuild and deploy
npm run build
```

### Monitor Production
```bash
# Supabase Dashboard
open https://supabase.com/dashboard/project/jxlpznlsqpfwsvskjlrh

# Server logs
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🧪 Testing Each Feature

### Test Auth (Week 1-2)
```bash
VITE_FEATURE_SUPABASE_AUTH=true
```
1. Register new account
2. Login with credentials
3. Verify user profile loads
4. Logout and login again
5. Check Supabase Dashboard → Auth → Users

### Test Timers (Week 3-4)
```bash
VITE_FEATURE_SUPABASE_TIMERS=true
```
1. Create new timer
2. Start timer
3. Open in second browser → verify real-time update
4. Pause/resume timer
5. Check telemetry in database

### Test Shopping (Week 5-6)
```bash
VITE_FEATURE_SUPABASE_SHOPPING=true
```
1. Add shopping item
2. Open in second browser → verify appears
3. Check item in browser 2
4. Verify check appears in browser 1
5. Delete item → verify sync

## 📁 Key Files

| File | Purpose |
|------|---------|
| `frontend/.env.local` | Feature flags configuration |
| `frontend/src/config/featureFlags.ts` | Feature flag logic |
| `frontend/src/services/auth/index.ts` | Unified auth service |
| `frontend/src/services/timers/index.ts` | Unified timer service |
| `frontend/src/services/shopping/index.ts` | Unified shopping service |
| `frontend/src/lib/supabase.ts` | Supabase client |
| `supabase/migrations/` | Database schema migrations |
| `DEPLOYMENT_GUIDE.md` | Full deployment procedures |
| `SUPABASE_MIGRATION_COMPLETE.md` | Complete documentation |

## 🔗 Important URLs

- **Production**: https://mealtogether.chuckycastle.io
- **Supabase Dashboard**: https://supabase.com/dashboard/project/jxlpznlsqpfwsvskjlrh
- **Supabase API**: https://jxlpznlsqpfwsvskjlrh.supabase.co
- **Server**: 44.211.71.114 (AWS Lightsail us-east-1)

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to Supabase" | Check `.env.local` has correct URL and anon key |
| "Real-time not working" | Verify feature flag is `true`, check browser console |
| "401 Unauthorized" | Check RLS policies, verify user is family member |
| "Timer won't start" | Check `transition_timer_state` function exists |
| "Items not appearing" | Verify `family_id` is set correctly |

## 📞 Quick Links

- [Full Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Migration Status](./SUPABASE_MIGRATION_STATUS.md)  
- [Complete Summary](./SUPABASE_MIGRATION_COMPLETE.md)
- [Supabase Docs](https://supabase.com/docs)

## ⚡ Emergency Rollback

```bash
# 1. Disable all Supabase features
vim frontend/.env.local
# Set all VITE_FEATURE_SUPABASE_* to false

# 2. Rebuild
cd frontend && npm run build

# 3. Deploy
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'cd /opt/applications/meal-together && \
   git pull && \
   cd frontend && \
   npm run build && \
   sudo systemctl reload nginx'

# 4. Verify Flask is working
curl https://mealtogether.chuckycastle.io/api/health
```

---

**Last Updated**: 2025-11-25
**Status**: ✅ Ready for Rollout
