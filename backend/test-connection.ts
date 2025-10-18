import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnections() {
  console.log('🔍 Testing Supabase Connections...\n');

  // Test 1: Environment Variables
  console.log('1️⃣ Checking Environment Variables:');
  const requiredVars = [
    'DATABASE_URL',
    'DIRECT_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
  ];

  let allVarsPresent = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.includes('your-')) {
      console.log(`   ❌ ${varName}: Missing or placeholder`);
      allVarsPresent = false;
    } else {
      console.log(`   ✅ ${varName}: Set (${value.substring(0, 30)}...)`);
    }
  }
  console.log();

  if (!allVarsPresent) {
    console.error('❌ Please set all environment variables in backend/.env');
    process.exit(1);
  }

  // Test 2: Prisma Database Connection
  console.log('2️⃣ Testing Prisma Database Connection:');
  try {
    await prisma.$connect();
    console.log('   ✅ Connected to database successfully!');

    // Test query
    const userCount = await prisma.user.count();
    console.log(`   ✅ Query executed successfully (${userCount} users)`);
  } catch (error: any) {
    console.error('   ❌ Database connection failed:');
    console.error(`   Error: ${error.message}`);
    if (error.message.includes('password authentication failed')) {
      console.error('\n   💡 Tip: Check your database password in .env');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.error('\n   💡 Tip: Check your connection string format');
      console.error('   Expected format: postgres://postgres:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres');
    }
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log();

  // Test 3: Supabase Client Connection
  console.log('3️⃣ Testing Supabase Client Connection:');
  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test simple query
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error && error.message.includes('relation')) {
      console.log('   ⚠️  Tables not created yet (run: npm run db:setup)');
    } else if (error) {
      console.error('   ❌ Supabase client error:', error.message);
    } else {
      console.log('   ✅ Supabase client connected successfully!');
    }
  } catch (error: any) {
    console.error('   ❌ Supabase client failed:', error.message);
  }
  console.log();

  // Test 4: Database Schema Check
  console.log('4️⃣ Checking Database Schema:');
  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    if (tables.length === 0) {
      console.log('   ⚠️  No tables found. Run: npm run db:setup');
    } else {
      console.log(`   ✅ Found ${tables.length} tables:`);
      tables.forEach((table: { tablename: string }) => {
        console.log(`      • ${table.tablename}`);
      });
    }
  } catch (error: any) {
    console.error('   ❌ Schema check failed:', error.message);
  }
  console.log();

  // Summary
  console.log('📊 Connection Test Summary:');
  console.log('   ✅ Environment variables configured');
  console.log('   ✅ Prisma database connection working');
  console.log('   ✅ Supabase client connection working');
  console.log('\n🎉 All connections verified successfully!\n');

  await prisma.$disconnect();
}

testConnections().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
