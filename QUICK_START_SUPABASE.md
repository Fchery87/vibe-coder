# Quick Start: Supabase Integration

Get up and running with Supabase in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works!)

## Step 1: Create Supabase Project (2 min)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"** (top-right corner)
3. Fill in:
   - Name: `vibe-coder`
   - Database Password: (generate and **save it!**)
   - Region: Choose closest to you
   - Pricing Plan: **Free**
4. Click **"Create New Project"**
5. Wait for provisioning (~2 minutes)
   - API keys appear while database spins up

## Step 2: Get Connection Strings (1 min)

### Database URLs

1. Go to **Settings** > **Database** (left sidebar)
2. Scroll to **Connection string** section
3. Copy **TWO** strings:
   - **Session mode** (port 5432) - for app queries
   - **Direct connection** - for migrations

Format:
```
Session: postgres://postgres.PROJECT-REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
Direct: postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres
```

### API Keys

**Method 1: Settings Menu**
1. Go to **Settings** > **API** (left sidebar)
2. Copy:
   - Project URL
   - `anon` `public` key
   - `service_role` key

**Method 2: Quick Access (Cmd/Ctrl + K)**
1. Click avatar (top-right)
2. Select **Command menu**
3. Type "API keys" → Copy keys

## Step 3: Configure Environment (1 min)

Create `backend/.env`:

```bash
cd backend
cp ../.env.local.example .env
```

Edit `.env` and fill in your values:

```bash
# Session mode pooler - for queries
DATABASE_URL=postgres://postgres.PROJECT-REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

# Direct connection - for migrations
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres

# API credentials
SUPABASE_URL=https://PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
```

## Step 4: Setup Database (1 min)

Run the setup script:

```bash
cd backend
npm run db:setup
```

This will:
- Generate Prisma Client
- Push schema to Supabase
- Create all tables

Expected output:
```
✔ Generated Prisma Client
🚀 Your database is now in sync with your Prisma schema.
```

## Step 5: Verify Setup (30 sec)

### Option A: Using Prisma Studio

```bash
npm run prisma:studio
```

Opens `http://localhost:5555` - you should see all tables!

### Option B: Quick Test

Create `backend/src/test-connection.ts`:

```typescript
import prisma from './services/database';

async function test() {
  const count = await prisma.user.count();
  console.log('✅ Connected! User count:', count);
  process.exit(0);
}

test();
```

Run it:
```bash
npx ts-node src/test-connection.ts
```

## You're Done! 🎉

Your Supabase database is ready. Next steps:

1. **Enable pgvector** (for Phase 3 semantic search):
   - Go to Supabase Dashboard > Database > Extensions
   - Enable `pgvector`

2. **Explore the schema**:
   - Check `backend/prisma/schema.prisma`
   - See all tables and relationships

3. **Read full docs**:
   - See `docs/SUPABASE_SETUP.md` for advanced usage

## Common Commands

```bash
# View database in browser
npm run prisma:studio

# Generate Prisma Client (after schema changes)
npm run prisma:generate

# Push schema changes to database
npm run prisma:push

# Create a migration
npm run prisma:migrate -- --name your_migration_name
```

## Troubleshooting

**"Password authentication failed"**
- Check your password in `.env` matches Supabase
- Try resetting password in Supabase Dashboard

**"Prisma not found"**
- Run `npm install` in backend directory
- Make sure you're in the `backend/` folder

**Connection timeout**
- Check if project is paused (free tier auto-pauses)
- Visit Supabase dashboard to wake it up

---

Need help? Check `docs/SUPABASE_SETUP.md` for detailed troubleshooting!
