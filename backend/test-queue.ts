/**
 * Test script for Redis and BullMQ setup
 *
 * Run with: npx ts-node test-queue.ts
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import { addJob, getJobStatus, getQueueStats, JobType, JobPriority } from './src/services/queue-manager';
import { initializeWorkers } from './src/services/workers';
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
  console.log('\n🧪 Testing Job Queue...');

  try {
    // Initialize workers
    initializeWorkers();
    console.log('✅ Workers initialized');

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

    // Wait a bit for processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check job status
    const status = await getJobStatus(JobType.CODE_GENERATION, job1.id!);
    console.log('📊 Job status:', status?.state);
    console.log('📈 Job progress:', status?.progress);

    // Test 2: Get queue stats
    console.log('\n📊 Queue Statistics:');
    const stats = await getQueueStats(JobType.CODE_GENERATION);
    console.log(stats);

    console.log('\n✅ All job queue tests passed!');
  } catch (error: any) {
    console.error('❌ Job queue test failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Redis and BullMQ Tests\n');

  try {
    // Test 1: Redis Connection
    await testRedisConnection();

    // Test 2: Job Queue
    await testJobQueue();

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Add REDIS_URL to your .env file');
    console.log('2. Start workers in your main server: initializeWorkers()');
    console.log('3. Use addJob() to queue background tasks');

    process.exit(0);
  } catch (error: any) {
    console.error('\n💥 Tests failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure REDIS_URL is set in .env');
    console.log('2. Check that your Upstash Redis instance is active');
    console.log('3. Verify network connectivity');

    process.exit(1);
  }
}

main();
