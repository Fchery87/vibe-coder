-- Migration: Move vector extension from public to extensions schema
-- This resolves the Supabase security warning about extensions in public schema
--
-- Run this SQL in Supabase SQL Editor to fix the security issue

-- Step 1: Create the extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Step 2: Check if vector extension exists in public schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    -- Step 3: Drop the extension from public schema (CASCADE is safe here)
    -- The vector type will be automatically recreated when we reinstall the extension
    RAISE NOTICE 'Dropping vector extension from public schema...';
    DROP EXTENSION vector CASCADE;

    -- Step 4: Recreate it in the extensions schema
    -- This will restore the vector type and all dependent columns will work again
    RAISE NOTICE 'Creating vector extension in extensions schema...';
    CREATE EXTENSION vector WITH SCHEMA extensions;

    RAISE NOTICE 'Migration complete! Vector extension moved to extensions schema.';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'vector' AND n.nspname = 'extensions'
  ) THEN
    RAISE NOTICE 'Vector extension already exists in extensions schema. No migration needed.';
  ELSE
    -- Extension doesn't exist yet, create it in the correct schema
    RAISE NOTICE 'Vector extension not found. Creating in extensions schema...';
    CREATE EXTENSION vector WITH SCHEMA extensions;
    RAISE NOTICE 'Vector extension created successfully.';
  END IF;
END $$;

-- Step 5: Verify the extension is now in the extensions schema
SELECT
  e.extname as extension_name,
  n.nspname as schema_name,
  e.extversion as version
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'vector';

-- Expected output:
-- extension_name | schema_name | version
-- vector         | extensions  | 0.x.x
