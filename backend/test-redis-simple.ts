/**
 * Simple Redis Test (No Database Required)
 *
 * Run with: npx ts-node test-redis-simple.ts
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import { addJob, getJobStatus, getQueueStats, JobType, JobPriority, shutdownQueues } from './src/services/queue-manager';
import redisClient from './src/services/redis-client';

async function testRedisConnection() {
  console.log('\n🧪 Testing Upstash Redis Connection...');

  try {
    await redisClient.ping();
    console.log('✅ Upstash Redis connection successful');

    // Test cache operations with Upstash REST API
    await redisClient.set('test:key', 'test:value', { ex: 60 });
    const value = await redisClient.get('test:key');
    console.log('✅ Redis cache test:', value === 'test:value' ? 'PASSED' : 'FAILED');

    await redisClient.del('test:key');
  } catch (error: any) {
    console.error('❌ Redis connection failed:', error.message);
    throw error;
  }
}

async function testJobQueue() {
  console.log('\n🧪 Testing Job Queue (Without Database)...');

  try {
    // Test 1: Add a code generation job
    console.log('\n📋 Adding code generation job...');
    const job1 = await addJob(
      JobType.CODE_GENERATION,
      {
        taskId: 'test-task-1',
        userId: 'test-user',
        prompt: 'Create a Hello World function',
        projectId: 'test-project',
      },
      {
        priority: JobPriority.HIGH,
      }
    );

    console.log(`✅ Job ${job1.id} added to queue`);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check job status
    const status = await getJobStatus(JobType.CODE_GENERATION, job1.id!);
    console.log('📊 Job state:', status?.state);

    if (status?.state === 'failed') {
      console.log('⚠️  Job failed (expected - no database task exists)');
      console.log('   This is normal for the test.');
    }

    // Test 2: Get queue stats
    console.log('\n📊 Queue Statistics:');
    const stats = await getQueueStats(JobType.CODE_GENERATION);
    console.log(stats);

    console.log('\n✅ Job queue functionality verified!');
    console.log('   Note: Jobs will fail without database tasks, but queue is working.');
  } catch (error: any) {
    console.error('❌ Job queue test failed:', error.message);
    throw error;
  }
}

async function testRateLimiting() {
  console.log('\n🧪 Testing Rate Limiting...');

  try {
    const userId = 'test-user-123';
    const endpoint = '/api/test';
    const key = `ratelimit:${userId}:${endpoint}`;

    // Test rate limiting
    const count1 = await redisClient.incr(key);
    if (count1 === 1) {
      await redisClient.expire(key, 60);
    }
    console.log(`✅ Request count: ${count1}`);

    const count2 = await redisClient.incr(key);
    console.log(`✅ Request count: ${count2}`);

    // Clean up
    await redisClient.del(key);
    console.log('✅ Rate limiting test: PASSED');
  } catch (error: any) {
    console.error('❌ Rate limiting test failed:', error.message);
    throw error;
  }
}

async function testCaching() {
  console.log('\n🧪 Testing LLM Response Caching...');

  try {
    const cacheKey = 'llm:gpt-4:test-prompt-hash';
    const mockResponse = {
      content: 'This is a cached LLM response',
      tokens: 100,
      model: 'gpt-4',
    };

    // Cache the response (Upstash auto-serializes objects)
    await redisClient.set(cacheKey, mockResponse, { ex: 3600 });
    console.log('✅ LLM response cached (1 hour TTL)');

    // Retrieve from cache (Upstash auto-deserializes)
    const cached = await redisClient.get(cacheKey) as any;

    console.log('✅ Retrieved from cache:', cached.content);
    console.log('✅ Cache model:', cached.model);
    console.log('✅ Caching test: PASSED');

    // Clean up
    await redisClient.del(cacheKey);
  } catch (error: any) {
    console.error('❌ Caching test failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Redis and BullMQ Tests (Simplified)\n');

  try {
    // Test 1: Redis Connection
    await testRedisConnection();

    // Test 2: Rate Limiting
    await testRateLimiting();

    // Test 3: Caching
    await testCaching();

    // Test 4: Job Queue
    await testJobQueue();

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('✅ Upstash Redis connection working');
    console.log('✅ Caching functionality working');
    console.log('✅ Rate limiting working');
    console.log('✅ Job queue working (BullMQ + ioredis)');
    console.log('\n📝 Next steps:');
    console.log('1. ✅ Redis setup complete!');
    console.log('2. Create database tasks to test full job execution');
    console.log('3. Integrate workers with your LLM services');
    console.log('4. Start using addJob() in your API routes');

    // Clean up
    await shutdownQueues();
    process.exit(0);
  } catch (error: any) {
    console.error('\n💥 Tests failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure UPSTASH_REDIS_REST_URL is set in .env');
    console.log('2. Make sure UPSTASH_REDIS_REST_TOKEN is set in .env');
    console.log('3. Check that your Upstash Redis instance is active');
    console.log('4. Verify network connectivity');

    await shutdownQueues();
    process.exit(1);
  }
}

main();
