# Supabase Setup Checklist

Use this checklist to verify your Supabase + Prisma setup is correct (2025 version).

## ✅ Pre-Setup

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Git installed
- [ ] Supabase account created at [supabase.com](https://supabase.com)

## ✅ Supabase Project Creation

- [ ] Clicked "New Project" (top-right corner of dashboard)
- [ ] Set project name: `vibe-coder`
- [ ] Generated and **saved** database password
- [ ] Selected region closest to you
- [ ] Selected "Free" pricing tier
- [ ] Waited 2-3 minutes for provisioning
- [ ] Confirmed project is active in dashboard

## ✅ Get Connection Strings

### Database Connections

- [ ] Navigated to **Settings** > **Database**
- [ ] Found **Connection string** section
- [ ] Copied **Session mode** connection string:
  ```
  postgres://postgres.PROJECT-REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
  ```
- [ ] Copied **Direct connection** string:
  ```
  postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres
  ```

### API Credentials

- [ ] Navigated to **Settings** > **API**
- [ ] Copied **Project URL** (e.g., `https://xxxxx.supabase.co`)
- [ ] Copied **anon public** key
- [ ] Copied **service_role** key (keep secret!)

## ✅ Environment Configuration

- [ ] Created `backend/.env` file
- [ ] Set `DATABASE_URL` to **Session mode** connection
- [ ] Set `DIRECT_URL` to **Direct connection**
- [ ] Set `SUPABASE_URL` to project URL
- [ ] Set `SUPABASE_ANON_KEY` to anon key
- [ ] Set `SUPABASE_SERVICE_KEY` to service key
- [ ] Verified no placeholder values remain

### Example `.env` format:
```bash
DATABASE_URL=postgres://postgres.abcd1234:mypass@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres:mypass@db.abcd1234.supabase.co:5432/postgres
SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
```

## ✅ Database Setup

- [ ] Ran `npm install` in backend directory
- [ ] Ran `npm run db:setup` (or `npm run prisma:generate && npm run prisma:push`)
- [ ] Saw success message: `✔ Generated Prisma Client`
- [ ] Saw success message: `🚀 Your database is now in sync`
- [ ] No errors in output

## ✅ Verification Steps

### Test 1: Prisma Studio
- [ ] Ran `npm run prisma:studio`
- [ ] Browser opened to `http://localhost:5555`
- [ ] Can see all 8 tables:
  - [ ] users
  - [ ] projects
  - [ ] tasks
  - [ ] agents
  - [ ] executions
  - [ ] commits
  - [ ] reviews
  - [ ] code_embeddings

### Test 2: Database Connection
- [ ] Created test file or ran example
- [ ] Successfully connected to database
- [ ] Can query tables (even if empty)

Example test:
```bash
npx ts-node -e "
import prisma from './src/services/database';
(async () => {
  await prisma.\$connect();
  const count = await prisma.user.count();
  console.log('✅ Connected! User count:', count);
  await prisma.\$disconnect();
})();
"
```

Expected: `✅ Connected! User count: 0`

### Test 3: Run Examples (Optional)
- [ ] Ran `npx ts-node src/examples/database-usage-examples.ts`
- [ ] Script completed without errors
- [ ] Created test user, project, tasks
- [ ] Can see data in Prisma Studio

## ✅ Optional: Enable pgvector (Phase 3 Ready)

For semantic search capabilities:

- [ ] Navigated to **Database** > **Extensions** in Supabase dashboard
- [ ] Searched for "vector"
- [ ] Enabled **pgvector** extension
- [ ] Verified extension is active

Or via SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## ✅ Optional: Create Prisma Database User (Production)

For better security:

- [ ] Opened **SQL Editor** in Supabase dashboard
- [ ] Created `prisma` user with secure password
- [ ] Granted all necessary privileges
- [ ] Updated `.env` to use `prisma` user
- [ ] Tested connection with new user

## ✅ Security Checks

- [ ] `.env` file is in `.gitignore`
- [ ] Never committed `.env` to git
- [ ] Service role key kept secret (not in client-side code)
- [ ] Database password is strong (16+ characters)
- [ ] Credentials not shared in screenshots or docs

## ✅ Common Issues Resolved

If you encountered any issues, mark if resolved:

- [ ] **Connection timeout** → Verified project is not paused
- [ ] **Password auth failed** → Double-checked password in `.env`
- [ ] **Prisma not found** → Ran `npm install` in backend directory
- [ ] **Migration failed** → Used `DIRECT_URL` for migrations
- [ ] **Wrong connection format** → Updated to new Supavisor format

## ✅ Documentation Reviewed

- [ ] Read `QUICK_START_SUPABASE.md`
- [ ] Reviewed `docs/SUPABASE_SETUP.md` for details
- [ ] Checked `docs/DATABASE_ARCHITECTURE.md` for schema info
- [ ] Reviewed `.env.local.example` for correct format

## ✅ Ready for Development

- [ ] All tables created in Supabase
- [ ] Prisma Client generated
- [ ] Can query database successfully
- [ ] Prisma Studio works
- [ ] Example code runs without errors

## Next Steps

You're ready to move to **Phase 2** (Message Queue & Multi-Agent Architecture)!

Next up:
- [ ] Set up Upstash Redis (free tier)
- [ ] Implement Bull/BullMQ for job queue
- [ ] Build agent orchestration system

Or start building features:
- [ ] Migrate existing code to use Prisma
- [ ] Create API routes with database
- [ ] Build user authentication
- [ ] Implement task management

---

## Quick Commands Reference

```bash
# Database setup
npm run db:setup                  # One-time setup

# Development
npm run prisma:studio             # Visual database browser
npm run prisma:generate           # Generate Prisma Client
npm run prisma:push               # Push schema changes

# Testing
npx ts-node src/examples/database-usage-examples.ts

# Migration (production)
npm run prisma:migrate -- --name migration_name
```

---

**Setup Complete?** Check off all items above before proceeding! ✅

If you have any issues, see troubleshooting in `docs/SUPABASE_SETUP.md`
