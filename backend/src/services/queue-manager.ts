import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import prisma from './database';

/**
 * Queue Manager for Background Job Processing
 *
 * Handles asynchronous tasks like:
 * - Code generation
 * - Test execution
 * - PR creation
 * - Codebase indexing
 */

// Redis connection for BullMQ
// BullMQ requires ioredis, so we convert Upstash REST URL to Redis URL
function getRedisConnection(): Redis {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;

  if (!restUrl) {
    throw new Error('UPSTASH_REDIS_REST_URL not found in environment variables');
  }

  // Extract hostname and password from REST URL
  // Format: https://endpoint.upstash.io
  const url = new URL(restUrl);
  const hostname = url.hostname;
  const password = process.env.UPSTASH_REDIS_REST_TOKEN || '';

  // Create ioredis connection with TLS
  return new Redis({
    host: hostname,
    port: 6379,
    password: password,
    tls: {
      rejectUnauthorized: false, // Upstash requires this
    },
    maxRetriesPerRequest: null, // BullMQ requirement
    enableReadyCheck: false,
    enableOfflineQueue: false,
  });
}

const connection = getRedisConnection();

// Job type definitions
export enum JobType {
  CODE_GENERATION = 'code-generation',
  TEST_EXECUTION = 'test-execution',
  PR_CREATION = 'pr-creation',
  CODEBASE_INDEXING = 'codebase-indexing',
}

export enum JobPriority {
  LOW = 10,
  MEDIUM = 5,
  HIGH = 1,
  CRITICAL = 0,
}

// Job data interfaces
export interface CodeGenerationJob {
  taskId: string;
  userId: string;
  prompt: string;
  projectId: string;
  agentId?: string;
}

export interface TestExecutionJob {
  taskId: string;
  userId: string;
  projectId: string;
  testCommand: string;
  files?: string[];
}

export interface PRCreationJob {
  taskId: string;
  userId: string;
  projectId: string;
  commitId: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
}

export interface CodebaseIndexingJob {
  projectId: string;
  userId: string;
  files?: string[];
  fullReindex?: boolean;
}

export type JobData =
  | CodeGenerationJob
  | TestExecutionJob
  | PRCreationJob
  | CodebaseIndexingJob;

// Queue instances
const queues = new Map<JobType, Queue>();

// Worker instances
const workers = new Map<JobType, Worker>();

// Queue event listeners
const queueEvents = new Map<JobType, QueueEvents>();

/**
 * Initialize a queue for a specific job type
 */
function getQueue(jobType: JobType): Queue {
  if (!queues.has(jobType)) {
    const queue = new Queue(jobType, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 172800, // Keep failed jobs for 48 hours
        },
      },
    });

    queues.set(jobType, queue);

    // Set up queue events
    const events = new QueueEvents(jobType, { connection });
    queueEvents.set(jobType, events);

    events.on('completed', async ({ jobId }) => {
      console.log(`✅ Job ${jobId} completed in queue ${jobType}`);
    });

    events.on('failed', async ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} failed in queue ${jobType}:`, failedReason);
    });

    events.on('progress', async ({ jobId, data }) => {
      console.log(`⏳ Job ${jobId} progress:`, data);
    });
  }

  return queues.get(jobType)!;
}

/**
 * Add a job to the queue
 */
export async function addJob<T extends JobData>(
  jobType: JobType,
  data: T,
  options?: {
    priority?: JobPriority;
    delay?: number;
    jobId?: string;
  }
): Promise<Job<T>> {
  const queue = getQueue(jobType);

  const job = await queue.add(jobType, data, {
    priority: options?.priority ?? JobPriority.MEDIUM,
    delay: options?.delay,
    jobId: options?.jobId,
  });

  // Update task status in database (if task exists)
  if ('taskId' in data) {
    try {
      await prisma.task.update({
        where: { id: data.taskId },
        data: { status: 'IN_PROGRESS' },
      });
    } catch (error) {
      // Task doesn't exist in database - that's okay for testing
      console.log(`Note: Task ${data.taskId} not found in database`);
    }
  }

  console.log(`📋 Job ${job.id} added to queue ${jobType}`);
  return job as Job<T>;
}

/**
 * Get job status
 */
export async function getJobStatus(
  jobType: JobType,
  jobId: string
): Promise<any> {
  const queue = getQueue(jobType);
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;
  const returnvalue = job.returnvalue;
  const failedReason = job.failedReason;

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    state,
    progress,
    result: returnvalue,
    error: failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

/**
 * Cancel a job
 */
export async function cancelJob(
  jobType: JobType,
  jobId: string
): Promise<boolean> {
  const queue = getQueue(jobType);
  const job = await queue.getJob(jobId);

  if (job) {
    await job.remove();
    return true;
  }

  return false;
}

/**
 * Register a worker to process jobs
 */
export function registerWorker(
  jobType: JobType,
  processor: (job: Job<any>) => Promise<any>
): Worker {
  if (workers.has(jobType)) {
    console.warn(`Worker for ${jobType} already registered`);
    return workers.get(jobType)!;
  }

  const worker = new Worker(
    jobType,
    async (job: Job<any>) => {
      console.log(`🔨 Processing job ${job.id} (${jobType})`);

      try {
        // Update job progress
        await job.updateProgress(0);

        // Execute the processor
        const result = await processor(job);

        // Update task in database if applicable (and if it exists)
        if ('taskId' in job.data) {
          try {
            await prisma.task.update({
              where: { id: job.data.taskId },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                result: result,
              },
            });
          } catch (error) {
            // Task doesn't exist - log but don't fail the job
            console.log(`Note: Task ${job.data.taskId} not in database`);
          }
        }

        await job.updateProgress(100);
        return result;
      } catch (error: any) {
        console.error(`Error processing job ${job.id}:`, error);

        // Update task in database if applicable (and if it exists)
        if ('taskId' in job.data) {
          try {
            await prisma.task.update({
              where: { id: job.data.taskId },
              data: {
                status: 'FAILED',
                errorMessage: error.message,
              },
            });
          } catch (dbError) {
            // Task doesn't exist - log but don't fail the job
            console.log(`Note: Task ${job.data.taskId} not in database`);
          }
        }

        throw error;
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 jobs concurrently per worker
      limiter: {
        max: 100, // Max jobs per duration
        duration: 60000, // 1 minute
      },
    }
  );

  workers.set(jobType, worker);

  worker.on('completed', (job) => {
    console.log(`✅ Worker completed job ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Worker failed job ${job?.id}:`, err.message);
  });

  return worker;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(jobType: JobType) {
  const queue = getQueue(jobType);

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    jobType,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Pause a queue
 */
export async function pauseQueue(jobType: JobType): Promise<void> {
  const queue = getQueue(jobType);
  await queue.pause();
  console.log(`⏸️  Queue ${jobType} paused`);
}

/**
 * Resume a queue
 */
export async function resumeQueue(jobType: JobType): Promise<void> {
  const queue = getQueue(jobType);
  await queue.resume();
  console.log(`▶️  Queue ${jobType} resumed`);
}

/**
 * Clean up old jobs from queue
 */
export async function cleanQueue(
  jobType: JobType,
  grace: number = 86400000 // 24 hours in ms
): Promise<void> {
  const queue = getQueue(jobType);
  await queue.clean(grace, 1000, 'completed');
  await queue.clean(grace * 2, 1000, 'failed');
  console.log(`🧹 Queue ${jobType} cleaned`);
}

/**
 * Gracefully shut down all queues and workers
 */
export async function shutdownQueues(): Promise<void> {
  console.log('Shutting down queues and workers...');

  // Close all workers
  for (const [type, worker] of workers.entries()) {
    await worker.close();
    console.log(`Worker ${type} closed`);
  }

  // Close all queue events
  for (const [type, events] of queueEvents.entries()) {
    await events.close();
    console.log(`Queue events ${type} closed`);
  }

  // Close all queues
  for (const [type, queue] of queues.entries()) {
    await queue.close();
    console.log(`Queue ${type} closed`);
  }

  // Close Redis connection
  await connection.quit();
  console.log('Redis connection closed');
}

/**
 * Example Usage: Code Generation Worker
 *
 * import { registerWorker, JobType } from './services/queue-manager';
 *
 * registerWorker(JobType.CODE_GENERATION, async (job) => {
 *   const { taskId, prompt, agentId } = job.data;
 *
 *   // Update progress
 *   await job.updateProgress(25);
 *
 *   // Generate code using LLM
 *   const code = await generateCode(prompt, agentId);
 *
 *   await job.updateProgress(75);
 *
 *   // Save to database
 *   await saveGeneratedCode(taskId, code);
 *
 *   return { code, taskId };
 * });
 */

/**
 * Example Usage: Adding a Job
 *
 * import { addJob, JobType, JobPriority } from './services/queue-manager';
 *
 * const job = await addJob(
 *   JobType.CODE_GENERATION,
 *   {
 *     taskId: '123',
 *     userId: 'user-456',
 *     prompt: 'Build authentication',
 *     projectId: 'proj-789',
 *   },
 *   {
 *     priority: JobPriority.HIGH,
 *   }
 * );
 *
 * console.log('Job added:', job.id);
 */
