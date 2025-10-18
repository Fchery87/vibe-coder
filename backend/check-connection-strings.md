# Connection String Issues Detected

## Problem Found

Your connection strings have issues. Please verify them in Supabase dashboard:

## Steps to Get Correct Connection Strings

1. Go to https://supabase.com/dashboard
2. Select your project: **zzgufotgczekthjqirws**
3. Click **Settings** (left sidebar)
4. Click **Database**
5. Scroll to **Connection string** section

## What to Copy

### For DATABASE_URL (use "Session mode"):
Look for the connection string with port **:5432** that looks like:
```
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

Example format (yours should look similar):
```
postgres://postgres.zzgufotgczekthjqirws:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### For DIRECT_URL (use "Direct connection"):
Look for the direct connection string:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## Encoding Special Characters

Your password is: `Decepmlb1@#`

Special characters MUST be URL-encoded:
- `@` becomes `%40`
- `#` becomes `%23`

So: `Decepmlb1@#` becomes `Decepmlb1%40%23`

## Expected Format in .env

```bash
# Session Mode (note the format with postgres.PROJECT-REF)
DATABASE_URL=postgres://postgres.zzgufotgczekthjqirws:Decepmlb1%40%23@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Direct Connection
DIRECT_URL=postgresql://postgres:Decepmlb1%40%23@db.zzgufotgczekthjqirws.supabase.co:5432/postgres
```

## Current Issues

1. ❌ **DATABASE_URL**: Missing the `.zzgufotgczekthjqirws` after `postgres` username
2. ⚠️ **DIRECT_URL**: May not work from WSL due to IPv6 (try Session mode only)

## Recommended Action

1. Copy the **exact** connection strings from Supabase dashboard
2. Replace the password part with URL-encoded version: `Decepmlb1%40%23`
3. Update `backend/.env`

## Testing

After updating, run:
```bash
node node_modules/prisma/build/index.js db push
```
