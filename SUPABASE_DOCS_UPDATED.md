# ✅ Supabase Documentation Updated (2025)

All Supabase setup documentation has been updated to reflect the latest Supabase dashboard and API changes as of 2025.

## What Changed

### 1. Connection Strings (IMPORTANT)

**Old (Deprecated):**
```bash
# Old pgbouncer format
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres?pgbouncer=true
```

**New (Current):**
```bash
# Session Mode Pooler (Supavisor) - for app queries
DATABASE_URL=postgres://postgres.PROJECT-REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

# Direct Connection - for migrations
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres
```

**Why the change?**
- Supabase moved from PgBouncer to **Supavisor** (their new connection pooler)
- Supavisor supports both IPv4 and IPv6
- Better performance and reliability

### 2. Project Creation Process

**Updated steps:**
1. Click **"New Project"** button (now in top-right corner)
2. Fill in project details (database password is now required upfront)
3. Select pricing plan explicitly (Free, Pro, etc.)
4. Wait 2-3 minutes - API keys appear during provisioning
5. Dashboard auto-redirects when ready

### 3. Finding API Keys

**New methods:**

**Method 1: Settings Menu**
- Go to **Settings** > **API** (left sidebar)
- Copy Project URL, `anon` key, `service_role` key

**Method 2: Quick Access (NEW in 2025)**
- Click avatar (top-right)
- Press **Cmd/Ctrl + K** for Command menu
- Type "API keys" → Quick copy

### 4. Database User Best Practices

Supabase now recommends creating a **dedicated Prisma user** for better security:

```sql
CREATE USER prisma WITH PASSWORD 'secure-password';
GRANT ALL privileges needed...
```

This is optional for development but recommended for production.

## Files Updated

| File | Changes |
|------|---------|
| `docs/SUPABASE_SETUP.md` | ✅ Updated connection strings, navigation steps, API key locations |
| `QUICK_START_SUPABASE.md` | ✅ Updated quick setup with new connection format |
| `.env.local.example` | ✅ Updated with Session Mode Pooler format |

## Migration Guide (If You Already Set Up)

If you already set up Supabase with the old connection strings:

### Update Your `.env` File

**Change this:**
```bash
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres?pgbouncer=true
```

**To this:**
```bash
# Get this from Settings > Database > Connection string > Session mode
DATABASE_URL=postgres://postgres.PROJECT-REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

# Get this from Settings > Database > Connection string > Direct connection
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres
```

### Where to Find Your New Connection Strings

1. Go to your Supabase project
2. Navigate to **Settings** (left sidebar)
3. Click **Database**
4. Scroll to **Connection string** section
5. Copy:
   - **Session mode** → `DATABASE_URL`
   - **Direct connection** → `DIRECT_URL`

### Test the New Connection

```bash
cd backend

# Generate Prisma Client with new connection
npm run prisma:generate

# Test connection
npx ts-node -e "
import prisma from './src/services/database';
(async () => {
  await prisma.\$connect();
  console.log('✅ Connected with new connection string!');
  await prisma.\$disconnect();
})();
"
```

## Key Differences: Old vs New

| Aspect | Old (Pre-2025) | New (2025) |
|--------|----------------|------------|
| **Pooler** | PgBouncer | Supavisor |
| **Connection String** | `?pgbouncer=true` | `pooler.supabase.com:5432` |
| **Project Creation** | Simple form | Explicit pricing tier selection |
| **API Keys** | Settings only | Settings + Command menu (Cmd+K) |
| **Database User** | Use `postgres` | Recommended dedicated `prisma` user |
| **IPv6 Support** | Limited | Full support in Supavisor |

## Connection Modes Explained

Supabase now offers **three connection modes**:

### 1. Session Mode (Recommended for Prisma)
```
postgres://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```
- Uses Supavisor pooler
- Supports prepared statements
- Best for persistent connections
- IPv4 + IPv6 support

### 2. Transaction Mode
```
postgres://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```
- Port **6543** (note the difference!)
- For serverless/edge functions
- Does NOT support prepared statements
- Not recommended for Prisma

### 3. Direct Connection
```
postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
```
- Direct to database (no pooler)
- Required for migrations
- IPv6 only
- Not recommended for serverless

## For Vibe Coder, Use:

```bash
# Prisma Client queries → Session Mode
DATABASE_URL=postgres://postgres.PROJECT-REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

# Prisma Migrate → Direct Connection
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres
```

## Verify Your Setup

After updating your connection strings:

```bash
# 1. Generate Prisma Client
npm run prisma:generate

# 2. Push schema
npm run prisma:push

# 3. Open Prisma Studio
npm run prisma:studio
```

Expected output:
```
✔ Generated Prisma Client
🚀 Your database is now in sync with your Prisma schema.
```

## Still Have Old Format?

If you see this error:
```
Error: P1001: Can't reach database server at db.PROJECT.supabase.co:5432
```

**You're using the old connection format.** Update to the new Supavisor format above.

## Resources

- [Supabase Prisma Guide](https://supabase.com/docs/guides/database/prisma) (updated)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supavisor Documentation](https://supabase.com/docs/guides/database/connection-pooling)

## Questions?

- Check `docs/SUPABASE_SETUP.md` for detailed setup
- See `QUICK_START_SUPABASE.md` for quick 5-minute setup
- Review `.env.local.example` for correct format

---

**Last Updated:** October 17, 2025
**Verified Against:** Supabase Dashboard v2025, Supavisor, Prisma 6.17.1

All documentation now reflects current Supabase best practices! 🎉
