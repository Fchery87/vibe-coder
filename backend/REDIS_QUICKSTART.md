# Redis & BullMQ Quick Reference

## Setup (One-Time)

1. **Get Redis URL**
   ```
   https://console.upstash.com/ → Create Database → Copy URL
   ```

2. **Add to .env**
   ```bash
   REDIS_URL=redis://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
   ```

3. **Install Packages**
   ```bash
   npm install
   ```

4. **Test Connection**
   ```bash
   npx ts-node test-queue.ts
   ```

## Initialize Workers (in your server)

```typescript
import { initializeWorkers } from './services/workers';

initializeWorkers(); // Start all background workers
```

## Add Jobs to Queue

```typescript
import { addJob, JobType, JobPriority } from './services/queue-manager';

// Code Generation
const job = await addJob(JobType.CODE_GENERATION, {
  taskId: '123',
  userId: 'user-id',
  prompt: 'Build auth system',
  projectId: 'proj-id',
}, { priority: JobPriority.HIGH });

// Test Execution
await addJob(JobType.TEST_EXECUTION, {
  taskId: '123',
  userId: 'user-id',
  projectId: 'proj-id',
  testCommand: 'npm test',
  files: ['./src/auth.test.ts'],
});

// PR Creation
await addJob(JobType.PR_CREATION, {
  taskId: '123',
  userId: 'user-id',
  projectId: 'proj-id',
  commitId: 'commit-id',
  title: 'Add authentication',
  description: 'Implements JWT auth',
  sourceBranch: 'feature/auth',
  targetBranch: 'main',
});

// Codebase Indexing (Phase 3)
await addJob(JobType.CODEBASE_INDEXING, {
  projectId: 'proj-id',
  userId: 'user-id',
  fullReindex: true,
});
```

## Check Job Status

```typescript
import { getJobStatus, JobType } from './services/queue-manager';

const status = await getJobStatus(JobType.CODE_GENERATION, jobId);

console.log(status.state);    // 'completed', 'failed', 'active', 'waiting'
console.log(status.progress); // 0-100
console.log(status.result);   // Job output
console.log(status.error);    // Error message if failed
```

## Queue Statistics

```typescript
import { getQueueStats, JobType } from './services/queue-manager';

const stats = await getQueueStats(JobType.CODE_GENERATION);

console.log(stats);
// {
//   jobType: 'code-generation',
//   waiting: 5,
//   active: 2,
//   completed: 100,
//   failed: 3,
//   delayed: 0,
//   total: 110
// }
```

## Caching with Redis

```typescript
import redis from './services/redis-client';

// Set cache (1 hour expiration)
await redis.set('key', 'value', 'EX', 3600);

// Get from cache
const value = await redis.get('key');

// Cache LLM response
const cacheKey = `llm:${model}:${hash(prompt)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const response = await callLLM(prompt);
await redis.set(cacheKey, JSON.stringify(response), 'EX', 3600);
```

## Rate Limiting

```typescript
import redis from './services/redis-client';

const key = `ratelimit:${userId}:${endpoint}`;
const count = await redis.incr(key);

if (count === 1) {
  await redis.expire(key, 60); // 60 second window
}

if (count > 100) {
  throw new Error('Rate limit: 100 requests per minute');
}
```

## Queue Management

```typescript
import { pauseQueue, resumeQueue, cleanQueue, JobType } from './services/queue-manager';

// Pause queue
await pauseQueue(JobType.CODE_GENERATION);

// Resume queue
await resumeQueue(JobType.CODE_GENERATION);

// Clean old jobs (older than 24 hours)
await cleanQueue(JobType.CODE_GENERATION, 86400000);
```

## Graceful Shutdown

```typescript
import { shutdownQueues } from './services/queue-manager';
import { disconnectRedis } from './services/redis-client';

process.on('SIGTERM', async () => {
  await shutdownQueues();
  await disconnectRedis();
  process.exit(0);
});
```

## Job Types

| Type | Use Case | Data Required |
|------|----------|---------------|
| `CODE_GENERATION` | LLM code generation | taskId, userId, prompt, projectId |
| `TEST_EXECUTION` | Run automated tests | taskId, userId, projectId, testCommand |
| `PR_CREATION` | Create GitHub PRs | taskId, userId, projectId, commitId, title, description, branches |
| `CODEBASE_INDEXING` | Generate embeddings | projectId, userId, files (optional) |

## Job Priorities

- `JobPriority.CRITICAL` (0) - Highest
- `JobPriority.HIGH` (1)
- `JobPriority.MEDIUM` (5) - Default
- `JobPriority.LOW` (10)

## Retry Configuration

- **Attempts:** 3
- **Backoff:** Exponential (1s, 2s, 4s)
- **Type:** Automatic on failure

## Performance Limits

- **Concurrency:** 5 jobs per worker
- **Rate Limit:** 100 jobs per minute
- **Test Timeout:** 5 minutes
- **Retention:** 24h (completed), 48h (failed)

## File Locations

```
backend/
├── src/services/
│   ├── redis-client.ts        ← Redis connection
│   ├── queue-manager.ts       ← Job queue management
│   └── workers/
│       ├── index.ts           ← Worker registry
│       ├── code-generation-worker.ts
│       ├── test-execution-worker.ts
│       ├── pr-creation-worker.ts
│       └── codebase-indexing-worker.ts
└── test-queue.ts              ← Test script
```

## Troubleshooting

**Connection Error:**
```bash
Error: ECONNREFUSED
```
→ Check `REDIS_URL` in .env

**Jobs Not Processing:**
```
Jobs stuck in 'waiting'
```
→ Run `initializeWorkers()` in server

**Memory Issues:**
```
Redis memory exceeded
```
→ Run `cleanQueue()` or upgrade Upstash tier

## Resources

- Setup Guide: `docs/PHASE_1_2_QUEUE_SETUP.md`
- Test Script: `npx ts-node test-queue.ts`
- BullMQ Docs: https://docs.bullmq.io/
- Upstash Console: https://console.upstash.com/
