/**
 * Worker Registry
 *
 * Registers all background job workers
 * Import this file to start processing jobs
 */

import { registerWorker, JobType } from '../queue-manager';
import { codeGenerationWorker } from './code-generation-worker';
import { testExecutionWorker } from './test-execution-worker';
import { prCreationWorker } from './pr-creation-worker';
import { codebaseIndexingWorker } from './codebase-indexing-worker';

/**
 * Initialize all workers
 */
export function initializeWorkers(): void {
  console.log('🚀 Initializing background workers...');

  registerWorker(JobType.CODE_GENERATION, codeGenerationWorker);
  registerWorker(JobType.TEST_EXECUTION, testExecutionWorker);
  registerWorker(JobType.PR_CREATION, prCreationWorker);
  registerWorker(JobType.CODEBASE_INDEXING, codebaseIndexingWorker);

  console.log('✅ All workers initialized');
}

/**
 * Usage in your main server file:
 *
 * import { initializeWorkers } from './services/workers';
 *
 * // Start workers
 * initializeWorkers();
 */
