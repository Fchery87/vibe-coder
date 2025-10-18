import { Job } from 'bullmq';
import { CodeGenerationJob } from '../queue-manager';
import prisma from '../database';
import { ProviderManager } from '../provider-manager';
import { ModelRegistryService } from '../model-registry';

/**
 * Code Generation Worker
 *
 * Processes code generation tasks using your existing LLM provider system
 */

const providerManager = new ProviderManager();
const modelRegistry = new ModelRegistryService();

export async function codeGenerationWorker(
  job: Job<CodeGenerationJob>
): Promise<any> {
  const { taskId, userId, prompt, projectId, agentId } = job.data;

  console.log(`🤖 Generating code for task ${taskId}`);

  try {
    // Step 1: Load task details (if exists in database)
    await job.updateProgress(10);
    let task, agent, project;

    try {
      task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          project: true,
          user: true,
        },
      });

      if (task) {
        project = task.project;

        // Step 2: Select or create agent
        await job.updateProgress(20);
        if (agentId) {
          agent = await prisma.agent.findUnique({ where: { id: agentId } });
        } else {
          // Use default general agent
          agent = await prisma.agent.findFirst({
            where: { type: 'GENERAL', isActive: true },
          });
        }

        // Step 3: Create execution record
        await job.updateProgress(30);
        await prisma.execution.create({
          data: {
            taskId,
            agentId: agent?.id || 'default-agent',
            userId,
            status: 'RUNNING',
            input: {
              prompt,
              projectId,
            },
          },
        });
      }
    } catch (dbError) {
      // Task doesn't exist in database - continue with job anyway
      console.log('Note: Task not in database, proceeding with code generation');
    }

    // Step 4: Generate code using your existing LLM services
    await job.updateProgress(40);

    const generatedCode = await generateCodeWithProviderManager(
      prompt,
      agent?.model || 'claude-3-5-sonnet-20241022',
      agent?.provider || 'anthropic'
    );

    await job.updateProgress(70);

    // Step 5: Save results
    const result = {
      code: generatedCode,
      model: agent?.model || 'claude-3-5-sonnet-20241022',
      provider: agent?.provider || 'anthropic',
      metadata: {
        agentId: agent?.id || 'default',
        taskId,
      },
    };

    await job.updateProgress(90);
    console.log(`✅ Code generation completed for task ${taskId}`);
    return result;
  } catch (error: any) {
    console.error(`❌ Code generation failed for task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Generate code using your existing ProviderManager
 */
async function generateCodeWithProviderManager(
  prompt: string,
  model: string,
  provider: string
): Promise<string> {
  try {
    console.log(`Generating code with ${provider}/${model}`);

    // Use your existing provider manager to call the LLM
    const response = await providerManager.generateCode({
      prompt,
      model,
      provider,
      maxTokens: 4096,
      temperature: 0.7,
    });

    return response.code || response.text || JSON.stringify(response);
  } catch (error: any) {
    console.error('LLM generation error:', error.message);
    throw new Error(`Code generation failed: ${error.message}`);
  }
}
