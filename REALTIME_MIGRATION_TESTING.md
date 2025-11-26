# Supabase Realtime Migration - Testing Guide

## Phase 1 Implementation Complete ✅

All infrastructure for Supabase Realtime migration has been implemented and integrated.

### Completed Components

#### 1. TypeScript Types (`frontend/src/types/index.ts`)
- ✅ `KitchenTimer` interface
- ✅ `RealtimePayload<T>` generic type
- ✅ `RealtimeStatus` and `RealtimeConnectionInfo` types
- ✅ `RealtimeChannel` interface

#### 2. RealtimeContext (`frontend/src/contexts/RealtimeContext.tsx`)
- ✅ Connection status monitoring
- ✅ Channel subscription management
- ✅ Feature flag integration
- ✅ Automatic connection when features enabled

#### 3. UI Components
- ✅ `RealtimeStatusIndicator` - Connection status display
- ✅ Integrated into App.tsx
- ✅ Exported from components/ui/index.ts

#### 4. Fallback Polling (`frontend/src/hooks/state/useRealtimeSync.ts`)
- ✅ Enhanced with polling mechanism
- ✅ Activates on Realtime connection failure
- ✅ Configurable interval (default: 5000ms)
- ✅ INSERT/UPDATE/DELETE detection

#### 5. App Integration
- ✅ RealtimeProvider added to provider stack
- ✅ RealtimeStatusIndicator rendered globally
- ✅ Build verification passed

## Testing Plan

### Test Environment Setup

#### Local Development Environment
```bash
# 1. Ensure frontend dependencies installed
cd frontend
npm install

# 2. Verify .env.local has Supabase credentials
cat .env.local | grep SUPABASE

# 3. Start development server
npm run dev
```

#### Feature Flag Configuration

For **Shopping List Testing**:
```bash
# Edit frontend/.env.local
VITE_FEATURE_SUPABASE_SHOPPING=true
VITE_FEATURE_DISABLE_SOCKETIO=false  # Keep false for hybrid mode
```

For **Timer Testing**:
```bash
# Edit frontend/.env.local
VITE_FEATURE_SUPABASE_TIMERS=true
VITE_FEATURE_DISABLE_SOCKETIO=false  # Keep false for hybrid mode
```

### Test Cases

#### Test 1: Realtime Connection Status
**Objective**: Verify RealtimeProvider connects to Supabase

**Steps**:
1. Enable `VITE_FEATURE_SUPABASE_SHOPPING=true`
2. Start dev server: `npm run dev`
3. Open browser DevTools Console
4. Look for log: "Realtime connected for shopping_list_items"
5. Verify RealtimeStatusIndicator shows connected state (or doesn't appear)

**Expected Results**:
- Console shows successful channel subscription
- No error notifications appear
- Connection status is 'connected'

**Troubleshooting**:
- If "Connection error" appears → Check Supabase credentials
- If timeout → Check network connectivity
- If no logs → Feature flag may not be enabled

---

#### Test 2: Shopping List Realtime Sync
**Objective**: Verify shopping list items sync in real-time between browser tabs

**Prerequisites**:
- `VITE_FEATURE_SUPABASE_SHOPPING=true`
- Logged in user with active family

**Steps**:
1. Open shopping list page in two browser tabs (Tab A and Tab B)
2. In Tab A: Add new item "Test Realtime Item"
3. Observe Tab B without refreshing

**Expected Results**:
- Item appears in Tab B within 1-2 seconds
- No page refresh required
- Item has correct name and status

**Test Variations**:
- Update item (toggle checked) → Should sync to other tab
- Delete item → Should remove from other tab
- Add multiple items rapidly → All should sync

---

#### Test 3: Fallback Polling on Connection Failure
**Objective**: Verify polling activates when Realtime connection fails

**Steps**:
1. Enable `VITE_FEATURE_SUPABASE_SHOPPING=true`
2. Temporarily invalidate Supabase URL in `.env.local`
3. Start dev server
4. Open shopping list page
5. Check console for: "Starting fallback polling for shopping_list_items"

**Expected Results**:
- Console shows Realtime connection failed
- Polling mechanism activates automatically
- Items still update every 5 seconds via polling
- RealtimeStatusIndicator shows "error" state

**Restore**:
- Revert Supabase URL to correct value
- Reload page to reconnect

---

#### Test 4: Kitchen Timers Realtime Sync
**Objective**: Verify timers sync across devices/tabs

**Prerequisites**:
- `VITE_FEATURE_SUPABASE_TIMERS=true`
- Active cooking session with timers

**Steps**:
1. Open cooking session page in two tabs
2. In Tab A: Start a timer
3. Observe Tab B

**Expected Results**:
- Timer appears in Tab B
- Timer countdown syncs in real-time
- Pause/resume actions sync between tabs
- Timer completion syncs

---

#### Test 5: Hybrid Mode Operation
**Objective**: Verify Socket.IO and Realtime can coexist

**Prerequisites**:
- `VITE_FEATURE_SUPABASE_SHOPPING=true`
- `VITE_FEATURE_DISABLE_SOCKETIO=false`

**Steps**:
1. Enable both Socket.IO and Supabase Realtime
2. Open shopping list page
3. Check console for both connection types
4. Add/update items

**Expected Results**:
- Both WebSocket and Realtime connections active
- No conflicts or duplicate updates
- Items sync via Supabase Realtime
- Other features still use Socket.IO

---

### Performance Testing

#### Test 6: Rapid Updates
**Objective**: Verify system handles rapid updates without issues

**Steps**:
1. Open shopping list in two tabs
2. Rapidly add 10 items in Tab A
3. Observe Tab B

**Expected Results**:
- All items appear in Tab B
- No UI freezing or slowdown
- No duplicate items
- Console shows no errors

---

#### Test 7: Connection Recovery
**Objective**: Verify reconnection after network disruption

**Steps**:
1. Open shopping list page
2. Disconnect network (turn off WiFi or use DevTools offline mode)
3. Wait 10 seconds
4. Reconnect network

**Expected Results**:
- RealtimeStatusIndicator shows "disconnected" state
- On reconnect, automatically reestablishes connection
- Any missed updates sync after reconnection
- Console shows successful reconnection

---

### Rollback Testing

#### Test 8: Disable Supabase Features
**Objective**: Verify clean fallback to Socket.IO

**Steps**:
1. Set all Supabase feature flags to `false`
2. Restart dev server
3. Use shopping list and timers

**Expected Results**:
- RealtimeProvider does not initialize
- No Realtime connection attempts
- Socket.IO handles all real-time updates
- Application works normally

---

## Known Issues & Limitations

### Current State
- **Recipe import 429 error**: Rate limiter misconfigured in backend
- **WebSocket connection retries**: Multiple 400 errors before success
- **Polling performance**: Default 5-second interval may need tuning

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Test WebSocket/Realtime compatibility
- Mobile browsers: Test iOS Safari and Chrome

---

## Debugging Tips

### Enable Debug Logs
```typescript
// In RealtimeContext.tsx, add more console.log statements
console.log('Channel status:', status);
console.log('Payload received:', payload);
```

### Check Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Navigate to Database → Replication
3. Verify Realtime is enabled for tables:
   - `shopping_list_items`
   - `kitchen_timers`

### Network Inspection
1. Open DevTools → Network tab
2. Filter: WS (WebSockets)
3. Look for Supabase Realtime connections
4. Check connection status and messages

### React Query DevTools
- Available in dev mode
- Shows query state and cache
- Useful for debugging data synchronization

---

## Success Criteria

Phase 1 is successful if:
- ✅ Realtime connection establishes without errors
- ✅ Shopping list items sync between tabs in <2 seconds
- ✅ Timers sync across devices
- ✅ Fallback polling activates on connection failure
- ✅ No breaking changes to existing Socket.IO features
- ✅ Application builds without TypeScript errors
- ✅ Feature flags properly control activation

---

## Next Steps After Testing

1. **If tests pass**:
   - Document any performance tuning needed
   - Prepare production deployment plan
   - Update rollback documentation

2. **If issues found**:
   - Document specific failures
   - Create bug tickets
   - Fix critical issues before production

3. **Production Rollout**:
   - Deploy to production with flags disabled
   - Enable for 10% of users (shopping first)
   - Monitor metrics and error rates
   - Gradually increase to 100%

---

## Rollback Procedure

If issues occur in production:

```bash
# 1. Disable Supabase features immediately
VITE_FEATURE_SUPABASE_SHOPPING=false
VITE_FEATURE_SUPABASE_TIMERS=false

# 2. Rebuild and deploy
npm run build
# Deploy to production

# 3. Verify Socket.IO is handling all real-time updates
# Monitor logs for any residual errors
```

All changes are backward compatible - disabling feature flags immediately reverts to Socket.IO without code changes.
