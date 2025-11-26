# MealTogether Supabase Migration - Deployment Guide

## Prerequisites

- Supabase project created and configured
- Environment variables set in `.env.local`
- All migrations applied to Supabase database
- Frontend built and tested locally

## Phase 1: Foundation (COMPLETE ✅)

All foundation work is complete. The hybrid architecture is ready for gradual rollout.

### What's Been Implemented

1. **Database Schema** ✅
   - All tables migrated to Supabase
   - RLS policies configured
   - Kitchen timers table with telemetry
   - Shopping list enhancements (family_id, position)

2. **Service Adapters** ✅
   - Auth: Flask ↔ Supabase switching
   - Timers: Flask ↔ Supabase switching
   - Shopping: Flask ↔ Supabase switching
   - All controlled by feature flags

3. **Real-Time Sync** ✅
   - Supabase Realtime integration
   - Kitchen timers subscription
   - Shopping list subscription
   - Feature flag controlled activation

4. **Configuration** ✅
   - Environment variables
   - Feature flags system
   - Supabase client initialization

## Phase 2: Gradual Rollout

### Week 1-2: Auth Migration

**Objective**: Migrate authentication to Supabase

**Steps**:

1. **Enable Supabase Auth**
   ```bash
   # Update .env.local
   VITE_FEATURE_SUPABASE_AUTH=true
   ```

2. **Test Authentication Flow**
   - Register new account
   - Login with email/password
   - Verify JWT token in localStorage
   - Check user profile loads correctly
   - Test logout functionality

3. **Verify RLS Policies**
   - Ensure users can only see their own data
   - Test family membership permissions
   - Verify role-based access (OWNER/ADMIN/MEMBER)

4. **Monitor**
   - Check Supabase dashboard for errors
   - Monitor auth logs
   - Watch for failed logins

**Rollback**: Set `VITE_FEATURE_SUPABASE_AUTH=false`

### Week 3-4: Timer Migration

**Objective**: Migrate kitchen timers to Supabase with real-time sync

**Steps**:

1. **Enable Supabase Timers**
   ```bash
   # Update .env.local
   VITE_FEATURE_SUPABASE_TIMERS=true
   ```

2. **Test Timer Functionality**
   - Create new timer
   - Start/pause/resume timer
   - Verify precision timing with `end_at`
   - Test timer completion
   - Verify audio notifications

3. **Test Real-Time Sync**
   - Open two browser windows
   - Create timer in window 1
   - Verify it appears in window 2
   - Start timer in window 2
   - Verify state updates in window 1

4. **Monitor Telemetry**
   - Check `last_sync_at` timestamps
   - Monitor `sync_source` values
   - Watch for channel disconnections in `channel_id`

5. **Verify State Transitions**
   - Test all state transitions (idle → running → paused → finished)
   - Verify transition_timer_state function
   - Check error handling for invalid transitions

**Rollback**: Set `VITE_FEATURE_SUPABASE_TIMERS=false`

### Week 5-6: Shopping List Migration

**Objective**: Migrate shopping lists to Supabase with real-time collaboration

**Steps**:

1. **Enable Supabase Shopping**
   ```bash
   # Update .env.local
   VITE_FEATURE_SUPABASE_SHOPPING=true
   ```

2. **Test Shopping List Operations**
   - Add items to list
   - Check/uncheck items
   - Delete items
   - Clear checked items
   - Test position ordering

3. **Test Real-Time Collaboration**
   - Two users in same family
   - User 1 adds item
   - User 2 sees it appear instantly
   - User 2 checks item
   - User 1 sees check state update

4. **Test Concurrent Edits**
   - Multiple users editing simultaneously
   - Verify no lost updates
   - Check optimistic UI updates

**Rollback**: Set `VITE_FEATURE_SUPABASE_SHOPPING=false`

### Week 7-8: Full Migration

**Objective**: Complete migration and disable Flask Socket.IO

**Steps**:

1. **Enable All Supabase Features**
   ```bash
   # Update .env.local
   VITE_FEATURE_SUPABASE_AUTH=true
   VITE_FEATURE_SUPABASE_TIMERS=true
   VITE_FEATURE_SUPABASE_SHOPPING=true
   ```

2. **Verify All Features Work Together**
   - Auth, timers, and shopping all using Supabase
   - No Flask API calls for these features
   - Real-time updates working smoothly

3. **Monitor Performance**
   - Check Supabase dashboard metrics
   - Monitor database query performance
   - Watch for Realtime connection issues
   - Check network tab for API calls

4. **Disable Socket.IO** (FINAL STEP)
   ```bash
   # Update .env.local
   VITE_FEATURE_DISABLE_SOCKETIO=true
   ```

5. **Cleanup Flask Backend** (AFTER FULL MIGRATION)
   - Remove Socket.IO routes
   - Remove timer endpoints
   - Remove shopping list sync endpoints
   - Keep timeline, PDF, and import/export routes

**Rollback**: Set all feature flags to `false`

## Production Deployment

### 1. Build Frontend

```bash
cd frontend
npm run build
```

### 2. Deploy to Server

```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114 \
  'cd /opt/applications/meal-together && \
   git pull && \
   cd frontend && \
   npm run build && \
   sudo systemctl reload nginx'
```

### 3. Verify Deployment

- Visit https://mealtogether.chuckycastle.io
- Test auth flow
- Test timer creation and sync
- Test shopping list updates
- Check browser console for errors

### 4. Monitor Production

**Supabase Dashboard**:
- Database → Tables (check row counts)
- Authentication → Users
- Database → Logs (check for errors)
- Settings → API (monitor usage)

**Nginx Logs**:
```bash
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Rollback Procedures

### Immediate Rollback (No Data Loss)

If issues occur during migration:

1. **Set all feature flags to false**
   ```bash
   VITE_FEATURE_SUPABASE_AUTH=false
   VITE_FEATURE_SUPABASE_TIMERS=false
   VITE_FEATURE_SUPABASE_SHOPPING=false
   VITE_FEATURE_DISABLE_SOCKETIO=false
   ```

2. **Rebuild and redeploy**
   ```bash
   npm run build
   # Deploy to server
   ```

3. **Verify Flask backend is responding**
   - Users can login
   - Timers work via Socket.IO
   - Shopping lists sync

### Partial Rollback

If specific feature has issues:

1. **Disable problematic feature**
   ```bash
   # Example: Timers having issues
   VITE_FEATURE_SUPABASE_TIMERS=false
   # Keep auth and shopping on Supabase
   ```

2. **Rebuild and redeploy**

## Testing Checklist

### Pre-Migration Testing

- [ ] All migrations applied successfully
- [ ] Feature flags load correctly
- [ ] Service adapters switch properly
- [ ] Local development works with all flags off
- [ ] Local development works with all flags on

### Auth Testing

- [ ] Register new account
- [ ] Login with email/password
- [ ] Logout
- [ ] Refresh token works
- [ ] Protected routes redirect to login
- [ ] User profile loads correctly

### Timer Testing

- [ ] Create timer
- [ ] Start timer
- [ ] Pause timer
- [ ] Resume timer
- [ ] Timer completes and shows notification
- [ ] Reset timer to idle
- [ ] Delete timer
- [ ] Multiple timers work simultaneously
- [ ] Real-time sync across devices

### Shopping List Testing

- [ ] Add item
- [ ] Check item
- [ ] Uncheck item
- [ ] Delete item
- [ ] Clear checked items
- [ ] Items persist position
- [ ] Real-time sync across users
- [ ] Concurrent edits don't conflict

### Performance Testing

- [ ] Page load time < 2s
- [ ] Timer updates within 100ms
- [ ] Shopping list updates within 200ms
- [ ] No memory leaks during long sessions
- [ ] Real-time connections stable for 1+ hours

### Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Troubleshooting

### Issue: "Cannot connect to Supabase"

**Solution**:
1. Check `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Verify Supabase project is not paused
3. Check network tab for 401/403 errors
4. Ensure RLS policies are correct

### Issue: "Real-time updates not working"

**Solution**:
1. Check Supabase Realtime is enabled in project settings
2. Verify feature flags are set correctly
3. Check browser console for subscription errors
4. Ensure family_id filter matches data

### Issue: "Timer state transitions failing"

**Solution**:
1. Check `transition_timer_state` function exists in database
2. Verify user has permission (member of family)
3. Check timer status allows the transition
4. Review database function logs

### Issue: "Shopping list items not appearing"

**Solution**:
1. Verify `family_id` is set on items
2. Check RLS policies allow user to see items
3. Ensure `shopping_list_id` matches active list
4. Check database for items directly

## Environment Variables Reference

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://jxlpznlsqpfwsvskjlrh.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Feature Flags
VITE_FEATURE_SUPABASE_AUTH=false     # Enable Supabase auth
VITE_FEATURE_SUPABASE_TIMERS=false   # Enable Supabase timers
VITE_FEATURE_SUPABASE_SHOPPING=false # Enable Supabase shopping
VITE_FEATURE_DISABLE_SOCKETIO=false  # Disable Flask Socket.IO
VITE_FEATURE_DEBUG_MODE=true         # Development debugging
VITE_FEATURE_TELEMETRY=true          # Timer telemetry

# Flask Backend (for hybrid mode)
VITE_API_URL=http://localhost:5000
VITE_WS_URL=http://localhost:5000
```

## Support & Monitoring

### Supabase Dashboard
- URL: https://supabase.com/dashboard/project/jxlpznlsqpfwsvskjlrh
- Monitor: Database, Auth, Realtime, Logs

### Production Server
- SSH: `ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114`
- Logs: `/var/log/nginx/`
- App: `/opt/applications/meal-together`

### Key Metrics to Monitor
- Auth success rate
- Timer state transition errors
- Shopping list update latency
- Real-time connection drops
- Database query performance
