import { Job } from 'bullmq';
import { TestExecutionJob } from '../queue-manager';
import prisma from '../database';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Test Execution Worker
 *
 * Runs automated tests for a project
 */
export async function testExecutionWorker(
  job: Job<TestExecutionJob>
): Promise<any> {
  const { taskId, userId, projectId, testCommand, files } = job.data;

  console.log(`🧪 Running tests for task ${taskId}`);

  try {
    // Step 1: Load project details
    await job.updateProgress(10);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Step 2: Prepare test command
    await job.updateProgress(20);
    let command = testCommand;
    if (files && files.length > 0) {
      // Run tests only for specific files
      command = `${testCommand} ${files.join(' ')}`;
    }

    console.log(`Executing: ${command}`);

    // Step 3: Execute tests
    await job.updateProgress(30);
    const startTime = Date.now();

    let output, error, exitCode;
    try {
      const result = await execAsync(command, {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      output = result.stdout;
      error = result.stderr;
      exitCode = 0;
    } catch (err: any) {
      output = err.stdout || '';
      error = err.stderr || err.message;
      exitCode = err.code || 1;
    }

    const duration = Date.now() - startTime;
    await job.updateProgress(80);

    // Step 4: Parse test results
    const results = parseTestResults(output, error, exitCode);

    // Step 5: Save results to database
    await job.updateProgress(90);
    const result = {
      passed: results.passed,
      failed: results.failed,
      total: results.total,
      duration,
      output,
      error: exitCode !== 0 ? error : undefined,
      exitCode,
    };

    console.log(
      `✅ Tests completed for task ${taskId}: ${results.passed}/${results.total} passed`
    );

    return result;
  } catch (error: any) {
    console.error(`❌ Test execution failed for task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Parse test results from output
 */
function parseTestResults(
  stdout: string,
  stderr: string,
  exitCode: number
): {
  passed: number;
  failed: number;
  total: number;
} {
  // Default result
  const result = {
    passed: 0,
    failed: 0,
    total: 0,
  };

  // Try to parse Jest output
  const jestMatch = stdout.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
  if (jestMatch) {
    result.passed = parseInt(jestMatch[1]);
    result.total = parseInt(jestMatch[2]);
    result.failed = result.total - result.passed;
    return result;
  }

  // Try to parse Mocha output
  const mochaMatch = stdout.match(/(\d+)\s+passing/);
  if (mochaMatch) {
    result.passed = parseInt(mochaMatch[1]);
    result.total = result.passed;
    return result;
  }

  // If we can't parse, use exit code
  if (exitCode === 0) {
    result.passed = 1;
    result.total = 1;
  } else {
    result.failed = 1;
    result.total = 1;
  }

  return result;
}
