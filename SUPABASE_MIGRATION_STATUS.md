# Supabase Migration Status

## Phase 1: Foundation (Week 1) ✅ COMPLETE

### 1.1 Supabase Setup ✅
- **Cloud Project Created**: `meal-together` (jxlpznlsqpfwsvskjlrh)
- **Region**: us-east-2
- **Database**: PostgreSQL 17
- **Status**: Live and operational

### 1.2 Schema Migrations ✅
All migrations successfully applied to cloud database:

1. **Initial Schema** (`20250125000001_initial_schema.sql`)
   - Users table with auth integration
   - Families and family_members
   - Recipes, ingredients, cooking_steps
   - Shopping lists and items
   - Cooking sessions and active_timers

2. **Row Level Security** (`20250125000002_row_level_security.sql`)
   - Family-based isolation policies
   - Role-based access control (OWNER/ADMIN/MEMBER)
   - User profile policies

3. **Codex Enhanced Schema** (`20251126052504_codex_improved_schema.sql`)
   - New `kitchen_timers` table (family-level timers, independent of sessions)
   - Enhanced `shopping_lists` with `is_active` column
   - Enhanced `shopping_list_items` with `family_id` and `position`
   - Timer state transition function with validation
   - Telemetry fields for debugging (last_sync_at, sync_source, channel_id)

4. **Kitchen Timers RLS** (`20251126052505_rls_policies.sql`)
   - Family member access policies for kitchen_timers
   - CRUD policies for all family members

### 1.3 Feature Flags System ✅
**File**: `frontend/src/config/featureFlags.ts`

Feature toggles implemented:
- `supabase_auth` - Switch to Supabase authentication
- `supabase_timers` - Use kitchen_timers table for real-time timers
- `supabase_shopping` - Use Supabase for shopping lists
- `disable_socketio` - Disable Flask WebSocket when fully migrated
- `debug_mode` - Development debugging
- `enable_telemetry` - Timer telemetry tracking

Migration phase detection:
- **flask**: All Supabase features disabled (current state)
- **hybrid**: Some Supabase features enabled
- **supabase**: All features enabled, Socket.IO disabled

### 1.4 Unified Authentication Adapter ✅
**Files Created**:
- `frontend/src/lib/supabase.ts` - Supabase client initialization
- `frontend/src/services/auth/flaskAuthService.ts` - Flask auth implementation
- `frontend/src/services/auth/supabaseAuthService.ts` - Supabase auth implementation
- `frontend/src/services/auth/index.ts` - Unified auth service with feature flag switching

**Updated**:
- `frontend/src/contexts/AuthContext.tsx` - Now uses unified auth service

The auth system automatically switches between Flask and Supabase based on `supabase_auth` feature flag.

### 1.5 Environment Configuration ✅
**Files Created**:
- `frontend/.env.local.example` - Template with all variables
- `frontend/.env.local` - Actual configuration with Supabase credentials

**Configuration**:
```env
VITE_SUPABASE_URL=https://jxlpznlsqpfwsvskjlrh.supabase.co
VITE_SUPABASE_ANON_KEY=<configured>

# All feature flags default to false (Flask mode)
VITE_FEATURE_SUPABASE_AUTH=false
VITE_FEATURE_SUPABASE_TIMERS=false
VITE_FEATURE_SUPABASE_SHOPPING=false
VITE_FEATURE_DISABLE_SOCKETIO=false
```

## Next Steps: Phase 1 Continued

### 1.6 Timer Service Adapter (IN PROGRESS)
Create unified timer service that switches between:
- Flask active_timers (Socket.IO based)
- Supabase kitchen_timers (Realtime based)

Files to create:
- `frontend/src/services/timers/flaskTimerService.ts`
- `frontend/src/services/timers/supabaseTimerService.ts`
- `frontend/src/services/timers/index.ts`

### 1.7 Enable Real-Time Sync
Activate commented code in:
- `frontend/src/hooks/state/useRealtimeSync.ts`

Update to use `kitchen_timers` table and family_id filtering.

## Phase 2: Gradual Rollout (Weeks 2-7)

### Week 2: Auth Migration
- Set `VITE_FEATURE_SUPABASE_AUTH=true`
- Test registration and login flows
- Verify JWT token handling
- Monitor for issues

### Week 3: Timer Migration
- Set `VITE_FEATURE_SUPABASE_TIMERS=true`
- Test kitchen timer real-time sync
- Verify state transitions (idle/running/paused/finished)
- Monitor telemetry data

### Week 4: Shopping List Migration  
- Set `VITE_FEATURE_SUPABASE_SHOPPING=true`
- Test shopping list real-time updates
- Verify position ordering
- Test concurrent edits

### Week 5-6: Stabilization
- Monitor all Supabase features in production
- Fix any bugs or edge cases
- Performance optimization
- Database query tuning

### Week 7: Full Migration
- Set `VITE_FEATURE_DISABLE_SOCKETIO=true`
- Disable Flask Socket.IO completely
- All features running on Supabase

## Phase 3: Backend Simplification (Week 8+)

### Flask Backend Cleanup
Features to keep in Flask:
- Timeline calculation (complex business logic)
- PDF generation
- Recipe import/export
- Any other complex operations

Features to remove from Flask:
- Authentication routes (moved to Supabase)
- Timer management (moved to Supabase)
- Shopping list sync (moved to Supabase)
- WebSocket server (replaced by Supabase Realtime)

### Database Migration Plan
**Decision**: Fresh start (no data migration required per user request)
- Users will re-register
- Families will be recreated
- Recipes can be manually re-added or imported

## Current Architecture

### Hybrid Mode (Current State)
```
Frontend
  ├── Auth: Flask JWT
  ├── Timers: Flask Socket.IO
  ├── Shopping: Flask Socket.IO
  └── Recipes: Flask REST API

Backend
  ├── Flask API (all features)
  └── PostgreSQL (Flask schema)

Supabase
  ├── Database (schema ready, unused)
  ├── Auth (configured, unused)
  └── Realtime (configured, unused)
```

### Target Architecture (End State)
```
Frontend
  ├── Auth: Supabase Auth
  ├── Timers: Supabase Realtime
  ├── Shopping: Supabase Realtime
  └── Recipes: Flask REST API (read-only)

Backend
  ├── Flask API (timeline, PDF, import/export)
  └── Minimal routes

Supabase
  ├── Database (primary data store)
  ├── Auth (user management)
  └── Realtime (live updates)
```

## Testing Checklist

### Phase 1 Testing
- [x] Supabase project created and accessible
- [x] Migrations applied successfully
- [x] Feature flags load correctly
- [x] Auth service switches properly
- [ ] Timer service switches properly
- [ ] Real-time sync activates correctly

### Integration Testing (Pre-Rollout)
- [ ] User registration with Supabase
- [ ] User login with Supabase  
- [ ] Timer creation and state changes
- [ ] Shopping list real-time updates
- [ ] Multiple users in same family
- [ ] Real-time sync across devices

### Performance Testing
- [ ] Measure Supabase query latency
- [ ] Test with 50+ concurrent users
- [ ] Monitor Realtime connection stability
- [ ] Database connection pool sizing

## Rollback Plan

If issues occur during migration:

1. **Immediate Rollback**: Set all feature flags to `false`
2. **Data Consistency**: No data loss (using fresh start approach)
3. **User Impact**: Minimal (just re-login if auth was migrated)

## Documentation

### For Developers
- Feature flag usage documented in `featureFlags.ts`
- Auth service adapter pattern in `services/auth/`
- Migration guide in this file

### For Users
- No action required during gradual rollout
- Re-registration required only for final cutover
- Improved real-time performance after migration

---

**Last Updated**: 2025-11-25
**Phase**: 1 (Foundation) - COMPLETE
**Next Milestone**: Complete timer service adapter
