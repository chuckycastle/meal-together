# Supabase Setup Guide for MealTogether

This guide walks you through setting up Supabase for the MealTogether application.

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available at https://supabase.com)
- Git

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in (or create account)
2. Click **"New Project"**
3. Fill in the project details:
   - **Name**: `meal-together`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., `US East (North Virginia)`)
   - **Pricing Plan**: Free (or Pro if needed)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project provisioning

## Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (for migrations only - keep secret!)

## Step 3: Configure Environment Variables

1. Copy the example env file:
   ```bash
   cd frontend
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your Supabase credentials:
   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Important**: Never commit `.env.local` - it's in `.gitignore`

## Step 4: Install Supabase CLI (Optional but Recommended)

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or via npm (all platforms)
npm install -g supabase
```

## Step 5: Link Local Project to Supabase

```bash
# Login to Supabase CLI
supabase login

# Link your project
cd /path/to/meal-together
supabase link --project-ref <your-project-ref>

# You can find your project-ref in the Project URL:
# https://<project-ref>.supabase.co
```

## Step 6: Run Database Migrations

### Option A: Using Supabase Dashboard (Easy)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the sidebar
3. Click **"New query"**
4. Copy the contents of `supabase/migrations/20250125000001_initial_schema.sql`
5. Paste into the query editor
6. Click **"Run"**
7. Repeat for `supabase/migrations/20250125000002_row_level_security.sql`

### Option B: Using Supabase CLI (Recommended)

```bash
# Push all migrations to your Supabase project
supabase db push

# Verify migrations
supabase db remote changes
```

## Step 7: Verify Database Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see all tables:
   - users
   - families
   - family_members
   - recipes
   - ingredients
   - cooking_steps
   - recipe_timers
   - shopping_lists
   - shopping_list_items
   - cooking_sessions
   - active_timers

3. Click on any table and check the **Policies** tab - you should see RLS policies

## Step 8: Configure Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard

2. **Email Provider** (enabled by default):
   - Enable email confirmations: **ON**
   - Secure email change: **ON**
   - Confirm email: **ON**

3. **Google OAuth** (optional):
   - Toggle **Enable**
   - Get credentials from https://console.cloud.google.com/
   - Add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Paste Client ID and Secret

4. **GitHub OAuth** (optional):
   - Toggle **Enable**
   - Create OAuth app at https://github.com/settings/developers
   - Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Paste Client ID and Secret

5. **URL Configuration**:
   - Go to **Authentication** → **URL Configuration**
   - **Site URL**: `https://mealtogether.chuckycastle.io`
   - **Redirect URLs**: Add:
     - `http://localhost:5173/**` (development)
     - `https://mealtogether.chuckycastle.io/**` (production)

## Step 9: Test Connection

```bash
# Start the frontend dev server
cd frontend
npm run dev

# Open browser to http://localhost:5173
# You should see the app without connection errors
```

## Step 10: Migrate Existing Data (Optional)

If you have existing data in the Flask/PostgreSQL database:

```bash
# Run the migration script
cd scripts
node migrate-to-supabase.js
```

**Note**: You'll need to create this script based on the template in `SUPABASE_MIGRATION.md`

## Troubleshooting

### Error: "Missing Supabase environment variables"

- Check that `.env.local` exists in the `frontend/` directory
- Verify the variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after changing `.env` files

### Error: "Invalid API key"

- Make sure you copied the **anon public** key, not the service_role key
- Check for extra spaces or newlines in the `.env.local` file
- Regenerate the API key in Supabase dashboard if needed

### Error: "Failed to fetch"

- Verify your Project URL is correct
- Check that your Supabase project is running (not paused)
- Verify network connectivity to Supabase

### Error: "Row Level Security policy violation"

- Check that RLS policies were applied (Step 6)
- Verify you're authenticated before querying protected tables
- Check browser console for specific policy errors

### Database Migrations Failed

- Verify you have database admin permissions
- Check for syntax errors in SQL files
- Try running migrations one at a time
- Check Supabase logs in dashboard for detailed errors

## Development Workflow

### Local Development with Supabase

```bash
# Start local Supabase (requires Docker)
supabase start

# Your local Supabase will be at:
# API URL: http://localhost:54321
# Studio UI: http://localhost:54323
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres

# Stop local Supabase
supabase stop
```

### Schema Changes

When you modify the schema:

1. Create a new migration file:
   ```bash
   supabase migration new <description>
   ```

2. Edit the generated file in `supabase/migrations/`

3. Apply locally:
   ```bash
   supabase db reset # Resets local DB and applies all migrations
   ```

4. Push to production:
   ```bash
   supabase db push
   ```

## Security Best Practices

1. **Never commit `.env.local`** - it contains secrets
2. **Use anon key in frontend** - never use service_role key in client code
3. **Enable email confirmation** - prevents spam accounts
4. **Review RLS policies** - ensure users can only access their family data
5. **Enable 2FA** for your Supabase account
6. **Regularly rotate API keys** if compromised
7. **Monitor Auth logs** for suspicious activity

## Useful Commands

```bash
# Check Supabase status
supabase status

# View logs
supabase logs

# Generate TypeScript types from database
supabase gen types typescript --local > frontend/src/lib/database.types.ts

# Create a database backup
supabase db dump -f backup.sql

# Restore from backup
supabase db push --file backup.sql
```

## Next Steps

- [Read the Migration Guide](./SUPABASE_MIGRATION.md) for architectural details
- [Review RLS Policies](./supabase/migrations/20250125000002_row_level_security.sql) for security model
- [Check out Supabase Docs](https://supabase.com/docs) for advanced features

## Support

- Supabase Discord: https://discord.supabase.com
- Supabase GitHub: https://github.com/supabase/supabase
- MealTogether Issues: https://github.com/chuckycastle/meal-together/issues
