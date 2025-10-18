# ⚠️ IMPORTANT: Get Your Exact Connection String

Your current connection strings have the wrong format. Please follow these steps:

## Step 1: Go to Supabase Dashboard

Visit this URL:
```
https://supabase.com/dashboard/project/zzgufotgczekthjqirws/settings/database
```

## Step 2: Scroll to "Connection string" Section

You'll see a dropdown menu. Select **"Session mode"**

## Step 3: Copy the EXACT String

It should look like this (with your password placeholder):
```
postgres://postgres.zzgufotgczekthjqirws:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Important:** Notice `postgres.zzgufotgczekthjqirws` - that's the correct format!

## Step 4: Replace Password with URL-Encoded Version

Your password: `Decepmlb1@#`

URL-encoded: `Decepmlb1%40%23`

Replace `[YOUR-PASSWORD]` with `Decepmlb1%40%23`

## Step 5: Final Connection Strings

Once you have the exact string from Supabase, your `.env.local` should have:

```bash
# Use the EXACT string from Supabase, with password replaced
DATABASE_URL=postgres://postgres.zzgufotgczekthjqirws:Decepmlb1%40%23@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# For WSL, use same pooler URL for both (to avoid IPv6 issues)
DIRECT_URL=postgres://postgres.zzgufotgczekthjqirws:Decepmlb1%40%23@aws-0-us-east-1.pooler.supabase.com:5432/postgres

SUPABASE_URL=https://zzgufotgczekthjqirws.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6Z3Vmb3RnY3pla3RoanFpcndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MjQwMjgsImV4cCI6MjA3NjMwMDAyOH0.VdxC8leKvGCx_a8-AF1p8FVsxrXvgWxYpK3_543woLU
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6Z3Vmb3RnY3pla3RoanFpcndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcyNDAyOCwiZXhwIjoyMDc2MzAwMDI4fQ.Ce1gFxbzSRAZfsaY8yBpZ8HEubq5hHqZxfzvbmszphs
```

## What to Do Next

1. Open Supabase dashboard
2. Copy the **exact** Session mode connection string
3. Tell me what it is (you can paste it here)
4. I'll help you create the correct `.env.local` file

**Or** if you want to do it yourself:
1. Copy the string from Supabase
2. Replace `[YOUR-PASSWORD]` with `Decepmlb1%40%23`
3. Update both `/.env.local` and `/backend/.env`
4. Run: `node node_modules/prisma/build/index.js db push`
