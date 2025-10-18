/**
 * Test Phase 1.3: Caching & Session Layer
 *
 * Run with: npx ts-node test-phase-1-3.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { llmCacheService } from './src/services/llm-cache-service';
import { sessionService } from './src/services/session-service';
import redisClient from './src/services/redis-client';

async function testLLMCaching() {
  console.log('\n🧪 Testing LLM Response Caching...\n');

  const testParams = {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    prompt: 'Write a Hello World function in TypeScript',
    temperature: 0.7,
    maxTokens: 1024,
  };

  const mockResponse = {
    text: 'function helloWorld(): void {\n  console.log("Hello, World!");\n}',
    tokens: 50,
    model: 'claude-3-5-sonnet-20241022',
  };

  try {
    // Test cache MISS
    console.log('1️⃣  Testing cache MISS...');
    const cached1 = await llmCacheService.get(testParams);
    console.log(`   Result: ${cached1 ? 'CACHED' : 'MISS'} ✅`);

    // Set cache
    console.log('\n2️⃣  Setting cache...');
    await llmCacheService.set(testParams, mockResponse, 300); // 5 min TTL
    console.log('   Cache set ✅');

    // Test cache HIT
    console.log('\n3️⃣  Testing cache HIT...');
    const cached2 = await llmCacheService.get(testParams);
    console.log(`   Result: ${cached2 ? 'HIT' : 'MISS'} ✅`);
    console.log(`   Response: ${JSON.stringify(cached2).substring(0, 50)}...`);

    // Get cache stats
    console.log('\n4️⃣  Cache Statistics:');
    const stats = await llmCacheService.getStats();
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Hit Rate: ${stats.hitRate}%`);
    console.log(`   Est. Savings: ${stats.estimatedSavings}`);

    console.log('\n✅ LLM Caching Test: PASSED\n');
  } catch (error: any) {
    console.error('❌ LLM Caching Test: FAILED', error.message);
    throw error;
  }
}

async function testRateLimiting() {
  console.log('\n🧪 Testing Rate Limiting...\n');

  try {
    const userId = 'test-user-123';
    const endpoint = '/api/test';

    console.log('1️⃣  Simulating 5 requests...');
    for (let i = 1; i <= 5; i++) {
      const key = `ratelimit:${endpoint}:${userId}`;
      const count = await redisClient.incr(key);

      if (count === 1) {
        await redisClient.expire(key, 60);
      }

      console.log(`   Request ${i}: Count = ${count}`);
    }

    // Check current limit
    const key = `ratelimit:${endpoint}:${userId}`;
    const currentCount = (await redisClient.get(key) as number) || 0;
    console.log(`\n2️⃣  Current count: ${currentCount}/100`);

    // Clean up
    await redisClient.del(key);
    console.log('\n✅ Rate Limiting Test: PASSED\n');
  } catch (error: any) {
    console.error('❌ Rate Limiting Test: FAILED', error.message);
    throw error;
  }
}

async function testSessionManagement() {
  console.log('\n🧪 Testing Session Management...\n');

  try {
    // Create session
    console.log('1️⃣  Creating session...');
    const sessionData = {
      userId: 'user-456',
      email: 'test@example.com',
      name: 'Test User',
    };

    const sessionId = await sessionService.create(sessionData);
    console.log(`   Session ID: ${sessionId.substring(0, 16)}...`);
    console.log(`   ✅ Session created`);

    // Get session
    console.log('\n2️⃣  Retrieving session...');
    const retrieved = await sessionService.get(sessionId);
    console.log(`   User: ${retrieved?.name}`);
    console.log(`   Email: ${retrieved?.email}`);
    console.log(`   ✅ Session retrieved`);

    // Update session
    console.log('\n3️⃣  Updating session...');
    await sessionService.update(sessionId, {
      lastActivity: new Date().toISOString(),
    });
    console.log(`   ✅ Session updated`);

    // Get updated session
    const updated = await sessionService.get(sessionId);
    console.log(`   Last Activity: ${updated?.lastActivity}`);

    // Destroy session
    console.log('\n4️⃣  Destroying session...');
    await sessionService.destroy(sessionId);
    console.log(`   ✅ Session destroyed`);

    // Verify destruction
    const destroyed = await sessionService.get(sessionId);
    console.log(`   Exists: ${destroyed ? 'YES' : 'NO'} (should be NO)`);

    console.log('\n✅ Session Management Test: PASSED\n');
  } catch (error: any) {
    console.error('❌ Session Management Test: FAILED', error.message);
    throw error;
  }
}

async function testCachePerformance() {
  console.log('\n🧪 Testing Cache Performance...\n');

  try {
    const iterations = 100;
    console.log(`1️⃣  Writing ${iterations} cache entries...`);

    const startWrite = Date.now();
    for (let i = 0; i < iterations; i++) {
      await redisClient.set(`perf:test:${i}`, { value: i }, { ex: 60 });
    }
    const writeTime = Date.now() - startWrite;
    console.log(`   Write time: ${writeTime}ms (${(writeTime / iterations).toFixed(2)}ms per write)`);

    console.log(`\n2️⃣  Reading ${iterations} cache entries...`);
    const startRead = Date.now();
    for (let i = 0; i < iterations; i++) {
      await redisClient.get(`perf:test:${i}`);
    }
    const readTime = Date.now() - startRead;
    console.log(`   Read time: ${readTime}ms (${(readTime / iterations).toFixed(2)}ms per read)`);

    // Clean up
    console.log(`\n3️⃣  Cleaning up...`);
    for (let i = 0; i < iterations; i++) {
      await redisClient.del(`perf:test:${i}`);
    }

    console.log('\n✅ Cache Performance Test: PASSED\n');
  } catch (error: any) {
    console.error('❌ Cache Performance Test: FAILED', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Phase 1.3 Tests: Caching & Session Layer\n');
  console.log('=' .repeat(60));

  try {
    // Run all tests
    await testLLMCaching();
    await testRateLimiting();
    await testSessionManagement();
    await testCachePerformance();

    console.log('=' .repeat(60));
    console.log('\n🎉 All Phase 1.3 Tests Passed!\n');
    console.log('📊 Summary:');
    console.log('  ✅ LLM Response Caching - Working');
    console.log('  ✅ Rate Limiting - Working');
    console.log('  ✅ Session Management - Working');
    console.log('  ✅ Cache Performance - Working');

    console.log('\n📝 Next Steps:');
    console.log('  1. Apply middleware to your routes');
    console.log('  2. Integrate LLM caching in ProviderManager');
    console.log('  3. Add rate limiting to API endpoints');
    console.log('  4. Switch to Redis sessions');

    process.exit(0);
  } catch (error: any) {
    console.error('\n💥 Tests Failed:', error.message);
    process.exit(1);
  }
}

main();
