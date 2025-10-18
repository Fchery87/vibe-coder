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

    const targetProvider = agent?.provider || 'anthropic';
    const targetModel = agent?.model || 'claude-3-5-sonnet-20241022';

    const generationResult = await generateCodeWithProviderManager(
      prompt,
      targetProvider,
      targetModel
    );

    await job.updateProgress(70);

    // Step 5: Save results
    const result = {
      code: generationResult.code,
      model: generationResult.model,
      provider: generationResult.provider,
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
  providerName: string,
  modelName: string
): Promise<{ code: string; provider: string; model: string }> {
  try {
    let selectedProvider = providerName.toLowerCase();
    let selectedModel = modelName;
    let modelConfig = modelRegistry.getModel(selectedProvider, selectedModel) ?? undefined;

    // Ensure the selected provider is available; fall back to the first configured provider otherwise
    if (!providerManager.isProviderConfigured(selectedProvider)) {
      const availableProviders = providerManager.getAvailableProviders();
      if (!availableProviders.length) {
        throw new Error('No configured LLM providers are available for code generation');
      }

      const fallbackProvider = availableProviders[0];
      console.warn(
        `Provider "${providerName}" is not configured. Falling back to "${fallbackProvider}".`
      );

      selectedProvider = fallbackProvider;
      const fallbackModels = providerManager.getProviderModels(fallbackProvider);
      selectedModel = fallbackModels[0] || selectedModel;
      modelConfig = modelRegistry.getModel(fallbackProvider, selectedModel) ?? modelConfig;
    }

    console.log(`Generating code with ${selectedProvider}/${selectedModel}`);

    const tryGenerate = async (provider: string, model: string) => {
      return await providerManager.generateCode(
        provider,
        model,
        prompt,
        modelConfig ?? undefined
      );
    };

    try {
      const code = await tryGenerate(selectedProvider, selectedModel);
      return { code, provider: selectedProvider, model: selectedModel };
    } catch (error: any) {
      if (isAuthenticationError(error)) {
        const fallbackProvider = providerManager
          .getAvailableProviders()
          .find(provider => provider !== selectedProvider);

        if (fallbackProvider) {
          console.warn(
            `Authentication failed for ${selectedProvider}. Retrying with fallback provider ${fallbackProvider}.`
          );

          const fallbackModels = providerManager.getProviderModels(fallbackProvider);
          if (!fallbackModels.length) {
            throw new Error(
              `Provider "${fallbackProvider}" does not have any models configured for fallback use.`
            );
          }

          const fallbackModel = fallbackModels[0];
          const fallbackConfig =
            modelRegistry.getModel(fallbackProvider, fallbackModel) ?? undefined;

          const code = await providerManager.generateCode(
            fallbackProvider,
            fallbackModel,
            prompt,
            fallbackConfig
          );

          return { code, provider: fallbackProvider, model: fallbackModel };
        }
      }

      throw error;
    }
  } catch (error: any) {
    console.error('LLM generation error:', error.message);
    throw new Error(`Code generation failed: ${error.message}`);
  }
}

function isAuthenticationError(error: any): boolean {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  return (
    error?.response?.status === 401 ||
    message.includes('authentication_error') ||
    message.includes('invalid x-api-key') ||
    message.includes('invalid api key') ||
    message.includes('status code 401')
  );
}
