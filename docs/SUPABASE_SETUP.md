# Supabase Setup Guide

This guide will walk you through setting up Supabase for Vibe Coder, including database configuration, Prisma integration, and enabling pgvector for semantic search.

## Table of Contents

- [Initial Supabase Setup](#initial-supabase-setup)
- [Environment Variables](#environment-variables)
- [Prisma Configuration](#prisma-configuration)
- [Database Migration](#database-migration)
- [Enable pgvector Extension](#enable-pgvector-extension)
- [Testing the Setup](#testing-the-setup)
- [Troubleshooting](#troubleshooting)

---

## Initial Supabase Setup

### 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended for easy integration)

### 2. Create a New Project

1. Click **"New Project"** button (top-right corner of dashboard)
2. Choose your organization (or create one)
3. Fill in project details:
   - **Project Name**: `vibe-coder` (or your preferred name)
   - **Database Password**: Generate a strong password (**save this!**)
   - **Region**: Choose closest to you for best performance
   - **Pricing Plan**: Select **"Free"** tier

4. Click **"Create New Project"**
5. Wait 2-3 minutes for provisioning
   - You'll see your API keys while the database spins up
   - Database provisioning typically takes up to 2 minutes

### 3. Get Your Database Connection Strings

Once your project is ready:

1. Navigate to **Settings** (gear icon in left sidebar)
2. Click **Database** in the settings menu
3. Scroll down to **Connection string** section

You'll need **two** connection strings:

#### Session Mode Pooler (for app queries - recommended)
```
postgres://postgres.PROJECT-REF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres
```
- Uses Supavisor session pooler
- Supports both IPv4 and IPv6
- Best for persistent connections

#### Direct Connection (for migrations only)
```
postgresql://postgres:[YOUR-PASSWORD]@db.PROJECT-REF.supabase.co:5432/postgres
```
- Direct database connection (IPv6)
- Required for Prisma migrations
- Not recommended for serverless

**Note:** For Prisma, you'll use:
- `DATABASE_URL` = Session Mode Pooler (for queries)
- `DIRECT_URL` = Direct Connection (for migrations)

### 4. Get Your API Keys

**Method 1: Via Settings (Recommended)**

1. Go to **Settings** > **API** in the left sidebar
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon** `public` key (safe for client-side use)
   - **service_role** key (**keep this secret!** - server-side only)

**Method 2: Quick Access via Command Menu**

1. Click your avatar in the top-right corner
2. Select **Command menu** (or press Cmd/Ctrl + K)
3. Type "API keys" and select:
   - **Get API Keys → Copy anonymous API key**
   - **Get API Keys → Copy service API key**

---

## Environment Variables

### 1. Create `.env` file

In the `backend` directory, create a `.env` file:

```bash
cd backend
cp ../.env.local.example .env
```

### 2. Fill in Supabase Credentials

Edit `.env` with your actual values:

```bash
# Replace [YOUR-PASSWORD] with your database password
# Replace [PROJECT-REF] with your project reference (e.g., abcdefghijklm)
# Replace [REGION] with your region (e.g., us-east-1)

# Session Mode Pooler - for app queries (Prisma Client)
DATABASE_URL=postgres://postgres.PROJECT-REF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres

# Direct Connection - for migrations (Prisma Migrate)
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.PROJECT-REF.supabase.co:5432/postgres

# Supabase API credentials
SUPABASE_URL=https://PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- `DATABASE_URL` is used for queries (uses connection pooling)
- `DIRECT_URL` is used for migrations (direct database connection)
- Never commit `.env` to version control!

---

## Prisma Configuration

The Prisma schema is already set up at `backend/prisma/schema.prisma`.

### Important: Create a Custom Prisma Database User (Recommended)

For better security and permissions management, Supabase recommends creating a dedicated database user for Prisma:

1. Open **Supabase SQL Editor** in your dashboard
2. Run this SQL to create a Prisma user:

```sql
-- Create a password (use a password generator!)
-- Replace 'your-secure-password' with your actual password
CREATE USER prisma WITH PASSWORD 'your-secure-password';

-- Grant privileges on the public schema
GRANT USAGE ON SCHEMA public TO prisma;
GRANT CREATE ON SCHEMA public TO prisma;
GRANT ALL ON ALL TABLES IN SCHEMA public TO prisma;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO prisma;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO prisma;

-- Grant privileges on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prisma;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO prisma;
```

3. Update your `.env` connection strings to use the `prisma` user:

```bash
# Replace 'postgres' with 'prisma' in the username
DATABASE_URL=postgres://postgres.PROJECT-REF:PRISMA-PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?user=prisma
DIRECT_URL=postgresql://prisma:PRISMA-PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres
```

**Note:** This is optional but recommended for production. For development, you can use the default `postgres` user.

### Understanding the Schema

The schema includes:

1. **Users & Authentication** - User accounts and profiles
2. **Projects & Repositories** - GitHub repository tracking
3. **Tasks & Execution** - Task management and decomposition
4. **Agents & Execution** - Multi-agent orchestration (Phase 2)
5. **Git & Version Control** - Commit tracking
6. **Code Review** - Automated review results
7. **Semantic Search** - Code embeddings with pgvector (Phase 3)

### Add Prisma Scripts

Add these scripts to `backend/package.json`:

```json
"scripts": {
  "start": "nodemon --watch 'src/**/*.ts' --exec npx ts-node src/index.ts",
  "cli": "npx ts-node src/index.ts",
  "build": "tsc",
  "test": "jest",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:studio": "prisma studio",
  "prisma:push": "prisma db push"
}
```

---

## Database Migration

### Option 1: Using Prisma Migrate (Recommended for Development)

This creates migration files and tracks schema changes:

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Create and apply initial migration
npm run prisma:migrate -- --name init
```

When prompted, confirm the migration.

### Option 2: Using Prisma Push (Quick Prototyping)

This directly syncs your schema without creating migration files:

```bash
cd backend
npm run prisma:push
```

**Note:** Use `migrate` for production, `push` for quick iteration.

---

## Enable pgvector Extension

For semantic search functionality (Phase 3), enable the pgvector extension:

### Method 1: Via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Database** > **Extensions** in sidebar
4. Search for "vector"
5. Toggle **ON** for `pgvector`

### Method 2: Via SQL Editor

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New query**
3. Run this SQL:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify it's enabled
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Create Vector Index (for performance)

After running migrations, create an index for faster semantic search:

```sql
-- Create IVFFlat index for cosine similarity
CREATE INDEX IF NOT EXISTS code_embeddings_embedding_idx
ON code_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Note:** This will be added to migrations in Phase 3.

---

## Testing the Setup

### 1. Verify Database Connection

Create a test file `backend/src/test-db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');

    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Current user count: ${userCount}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

Run it:

```bash
npx ts-node src/test-db.ts
```

Expected output:
```
✅ Database connected successfully!
📊 Current user count: 0
```

### 2. Explore Database with Prisma Studio

Prisma Studio provides a visual database browser:

```bash
npm run prisma:studio
```

This opens a web UI at `http://localhost:5555` where you can:
- View all tables
- Create/edit/delete records
- Test relationships

### 3. Create a Test User

In Prisma Studio or via code:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });
  console.log('Created user:', user);
}

createTestUser();
```

---

## Integrate Prisma into Backend

### 1. Create Database Service

Create `backend/src/services/database.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton Prisma client
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });

    // Graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
  }

  return prisma;
}

export default getPrismaClient();
```

### 2. Use in Routes

Example: Create a user in `backend/src/routes/users.ts`:

```typescript
import express from 'express';
import prisma from '../services/database';

const router = express.Router();

router.post('/users', async (req, res) => {
  try {
    const { email, name } = req.body;

    const user = await prisma.user.create({
      data: { email, name },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        projects: true,
        tasks: true,
      },
    });

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
```

### 3. Add to Main App

In `backend/src/index.ts`:

```typescript
import express from 'express';
import userRoutes from './routes/users';

const app = express();
app.use(express.json());

// Add routes
app.use('/api', userRoutes);

// ... rest of your app
```

---

## Supabase Client Setup (Optional)

For using Supabase features like real-time subscriptions and auth:

### 1. Create Supabase Client

Create `backend/src/services/supabase-client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

### 2. Use Real-time Features

Example: Listen for task updates:

```typescript
import { supabase } from '../services/supabase-client';

// Subscribe to task updates
const subscription = supabase
  .channel('task-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'tasks',
    },
    (payload) => {
      console.log('Task updated:', payload.new);
      // Notify connected clients via WebSocket
    }
  )
  .subscribe();
```

---

## Troubleshooting

### Connection Error: "password authentication failed"

**Cause:** Incorrect database password

**Solution:**
1. Go to Supabase Dashboard > Settings > Database
2. Click "Reset database password"
3. Update your `.env` file with the new password
4. Try connecting again

### Migration Error: "relation already exists"

**Cause:** Table already exists from a previous migration

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npm run prisma:migrate -- reset

# Or, mark as applied without running
npm run prisma:migrate -- resolve --applied [migration-name]
```

### Error: "pgvector extension not found"

**Cause:** pgvector extension not enabled

**Solution:**
1. Go to Supabase Dashboard > Database > Extensions
2. Enable `pgvector`
3. Run migrations again

### Prisma CLI not found (WSL issues)

**Cause:** Symlink permissions in WSL

**Solution:**
```bash
# Use npx instead
npx prisma generate
npx prisma migrate dev

# Or add to package.json scripts (already done)
```

### Database Connection Timeout

**Cause:** Firewall or network issues

**Solution:**
1. Check if Supabase project is paused (free tier auto-pauses after inactivity)
2. Verify your internet connection
3. Try using DIRECT_URL instead of DATABASE_URL
4. Check Supabase status: https://status.supabase.com/

---

## Next Steps

Now that Supabase is set up:

1. ✅ **Phase 1 Complete:** Database foundation ready
2. 📋 **Phase 2:** Set up Redis/message queue (Upstash)
3. 🤖 **Phase 2:** Implement multi-agent architecture
4. 🔍 **Phase 3:** Build semantic search with pgvector
5. 🚀 **Deploy:** Host on Vercel/Railway with Supabase

---

## Free Tier Limits

Remember your Supabase free tier includes:

- 500MB database storage
- 2GB bandwidth/month
- Unlimited API requests
- Automatic backups (7 days)
- Pauses after 1 week of inactivity

**Tip:** Visit your project dashboard weekly to keep it active, or upgrade to Pro ($25/month) for always-on hosting.

---

## Useful Commands Reference

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate -- --name [migration-name]

# Apply pending migrations
npm run prisma:migrate -- deploy

# Reset database (delete all data)
npm run prisma:migrate -- reset

# Open Prisma Studio
npm run prisma:studio

# Push schema without migrations
npm run prisma:push

# Format schema file
npx prisma format
```

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase + Prisma Guide](https://supabase.com/docs/guides/integrations/prisma)

---

Happy coding! 🎉
