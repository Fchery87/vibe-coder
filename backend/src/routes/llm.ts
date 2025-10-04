import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ModelRegistryService } from '../services/model-registry';
import { RoutingService, RoutingContext } from '../services/routing-service';
import { ProviderManager } from '../services/provider-manager';
import { PromptGraphExecutor } from '../services/prompt-graph-executor';
import { BudgetManager } from '../services/budget-manager';
import { SandboxService } from '../services/sandbox';
import { GitService } from '../services/git-service';
import { SemanticCommitService } from '../services/semantic-commit-service';
import { ExpoService, ExpoProjectConfig } from '../services/expo-service';
import { FlutterService, FlutterProjectConfig } from '../services/flutter-service';
import { CodeQualityService } from '../services/code-quality-service';
import { DiffValidationService } from '../services/diff-validation-service';

const router = Router();
const modelRegistry = new ModelRegistryService();
const routingService = new RoutingService(modelRegistry);
const providerManager = new ProviderManager(); // Temporarily disable cost optimizer
const budgetManager = new BudgetManager(modelRegistry);
const sandboxService = new SandboxService();
const gitService = new GitService('.');
const semanticCommitService = new SemanticCommitService(providerManager, modelRegistry);
const expoService = new ExpoService();
const flutterService = new FlutterService();
const codeQualityService = new CodeQualityService();
const diffValidationService = new DiffValidationService(providerManager, modelRegistry);
const promptGraphExecutor = new PromptGraphExecutor(modelRegistry, routingService, providerManager, codeQualityService, diffValidationService);

// Store for active executions (in production, use Redis or database)
const activeExecutions = new Map<string, any>();

const validateGenerateRequest = [
  body('prompt').isString().notEmpty().withMessage('Prompt must be a non-empty string.'),
  body('model').optional().isString().withMessage('Model must be a string.'),
  body('routingMode').optional().isIn([
    'manual',
    'heuristic',
    'cost-aware',
    'orchestrated',
    'single-model'
  ]).withMessage('Invalid routing mode.'),
  body('capabilities').optional().isArray().withMessage('Capabilities must be an array.'),
  body('capabilities.*').optional().isString().withMessage('Capabilities must be an array of strings.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority.'),
  body('maxCost').optional().isNumeric().withMessage('Max cost must be a number.'),
  body('activeProvider').optional().isString().withMessage('Active provider must be a string.'),
  body('allowFailover').optional().isBoolean().withMessage('Allow failover must be a boolean.'),
];

router.post('/generate', validateGenerateRequest, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { prompt, model, routingMode, capabilities, priority, maxCost, activeProvider, allowFailover } = req.body;

  try {
    console.log('[/llm/generate] request received', {
      routingMode,
      model,
      activeProvider,
      promptLength: typeof prompt === 'string' ? prompt.length : 0
    });
    let targetModel = 'gpt-4o';
    let targetProvider = 'openai';

    // 1) If client provided a model, always honor it and skip routing
    if (typeof model === 'string' && model.trim().length > 0) {
      const [provider, modelName] = model.includes(':') ? model.split(':', 2) : [(activeProvider || 'openai'), model];
      targetProvider = provider.toLowerCase();
      targetModel = modelName;
    } else if (routingMode === 'single-model') {
      // 2) Single-model mode without explicit model: build a sensible default from activeProvider
      const provider = (activeProvider || 'openai').toLowerCase();
      targetProvider = provider;
      if (provider === 'xai') targetModel = 'grok-code-fast-1';
      else if (provider === 'openai') targetModel = 'gpt-4o';
      else if (provider === 'anthropic') targetModel = 'claude-3.5-sonnet';
      else if (provider === 'google') targetModel = 'gemini-2.5';
      else targetModel = 'gpt-4o';
    } else if (routingMode && routingMode !== 'manual') {
      // 3) Otherwise use routing service
      const context: RoutingContext = {
        mode: routingMode as any,
        capabilities,
        priority,
        maxCost,
        activeProvider,
        allowFailover
      };

      const decision = await routingService.makeRoutingDecision(context);
      targetModel = decision.selectedModel;
      targetProvider = decision.provider;

      // Add routing decision to response headers for debugging
      res.set('X-Routing-Decision', JSON.stringify(decision));
    }

    console.log('[/llm/generate] resolved target', { targetProvider, targetModel });

    // Validate provider configuration
    const providerConfigured = providerManager.isProviderConfigured(targetProvider);
    if (!providerConfigured) {
      return res.status(422).json({
        error: 'Provider not configured',
        provider: targetProvider,
        hint: targetProvider === 'xai'
          ? 'Set XAI_API_KEY in .env.local'
          : targetProvider === 'openai'
            ? 'Set OPENAI_API_KEY in .env.local'
            : targetProvider === 'anthropic'
              ? 'Set ANTHROPIC_API_KEY in .env.local'
              : targetProvider === 'google'
                ? 'Set GOOGLE_API_KEY in .env.local'
                : 'Check provider setup'
      });
    }

    // Validate model availability for provider
    const availableModels = providerManager.getProviderModels(targetProvider);
    if (!availableModels.includes(targetModel)) {
      return res.status(422).json({
        error: 'Model not supported for provider',
        provider: targetProvider,
        model: targetModel,
        availableModels
      });
    }

    // Validate model registry entry exists
    const modelConfig = modelRegistry.getModel(targetProvider, targetModel);
    if (!modelConfig) {
      return res.status(422).json({
        error: 'Missing model registry entry',
        provider: targetProvider,
        model: targetModel
      });
    }

    // Generate code using the selected provider and model
    let result;
    let isMock = false;
    try {
      console.log('[/llm/generate] calling providerManager.generateCode');
      result = await providerManager.generateCode(targetProvider, targetModel, prompt, modelConfig);
      console.log('[/llm/generate] provider call succeeded');
    } catch (error) {
      console.log('[/llm/generate] provider call failed, using mock response for demo', error instanceof Error ? error.message : String(error));
      isMock = true;

      // Mock response for demo purposes when APIs are not available
      if (targetProvider === 'ollama') {
        result = `// Mock response: Ollama is not running locally
// To use Ollama, install and start the Ollama service first
function addNumbers(a, b) {
  return a + b;
}

console.log(addNumbers(5, 3)); // Output: 8`;
      } else if (targetProvider === 'xai') {
        result = `// Mock response: XAI API credits exhausted
// To use XAI, add credits to your account
const greetUser = (name) => {
  return \`Hello, \${name}! Welcome to the application.\`;
};

console.log(greetUser("World")); // Output: Hello, World! Welcome to the application.`;
      } else if (targetProvider === 'openai') {
        result = `// Mock response: OpenAI API key not configured
// To use OpenAI, add your OPENAI_API_KEY to .env.local
const createTodoApp = () => {
  const todos = [];
  const addTodo = (text) => todos.push({ text, completed: false });
  const toggleTodo = (index) => todos[index].completed = !todos[index].completed;
  const getTodos = () => todos;

  return { addTodo, toggleTodo, getTodos };
};

const app = createTodoApp();
app.addTodo("Learn AI programming");
app.addTodo("Build amazing apps");
console.log("Todos:", app.getTodos());`;
      } else if (targetProvider === 'anthropic') {
        result = `// Mock response: Anthropic API key not configured
// To use Anthropic, add your ANTHROPIC_API_KEY to .env.local
class WeatherService {
  constructor() {
    this.weatherData = {
      'New York': { temp: 72, condition: 'Sunny' },
      'London': { temp: 15, condition: 'Cloudy' },
      'Tokyo': { temp: 25, condition: 'Rainy' }
    };
  }

  getWeather(city) {
    return this.weatherData[city] || { temp: 20, condition: 'Unknown' };
  }

  getAllCities() {
    return Object.keys(this.weatherData);
  }
}

const weather = new WeatherService();
console.log("Weather in New York:", weather.getWeather("New York"));
console.log("Available cities:", weather.getAllCities());`;
      } else {
        result = `// Mock response: API service unavailable
// Generated code would appear here when the service is available
console.log("Hello from AI-generated code!");`;
      }
    }

    console.log('[/llm/generate] using response', {
      resultType: typeof result,
      resultLength: result ? result.length : 0
    });

    if (!result) {
      throw new Error('No response generated from model');
    }

    // Calculate and record usage (simplified - in real implementation would track actual tokens)
    const estimatedTokens = Math.ceil(prompt.length / 4) + Math.ceil(result.length / 4);
    const estimatedCost = modelRegistry.calculateCost(targetProvider, targetModel, estimatedTokens, 0);

    // Check budget before recording usage
    const budgetCheck = await budgetManager.checkRequestBudget(targetProvider, targetModel, estimatedTokens, estimatedCost);

    if (!budgetCheck.allowed) {
      return res.status(429).json({
        error: 'Budget limit exceeded',
        reason: budgetCheck.reason,
        wouldExceed: budgetCheck.wouldExceed,
        alerts: budgetCheck.alerts
      });
    }

    // Record usage in both model registry and budget manager
    modelRegistry.recordUsage(targetProvider, targetModel, estimatedTokens, 0, estimatedCost);
    const newAlerts = budgetManager.recordUsage(targetProvider, targetModel, estimatedTokens, 0, estimatedCost);

    // Return result with metadata
    res.json({
      code: result,
      metadata: {
        model: targetModel,
        provider: targetProvider,
        estimatedTokens,
        estimatedCost,
        routingMode: routingMode || 'manual',
        mock: isMock
      },
      budget: {
        alerts: newAlerts,
        status: {
          daily: budgetManager.getBudgetStatus('daily'),
          weekly: budgetManager.getBudgetStatus('weekly'),
          monthly: budgetManager.getBudgetStatus('monthly')
        }
      }
    });
  } catch (error) {
    console.error('LLM generation error:', error);
    res.status(500).json({
      error: 'Failed to generate code',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// New endpoint to get available models and routing options
router.get('/models', async (req: Request, res: Response) => {
  try {
    const providers = modelRegistry.getProviders();
    const routingModes = modelRegistry.getRoutingModes();
    const usageStats = modelRegistry.getUsageStats();

    res.json({
      providers,
      routingModes,
      usageStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get model information' });
  }
});

// Endpoint to get usage statistics
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const { provider, model } = req.query;
    const usageStats = modelRegistry.getUsageStats(
      provider as string,
      model as string
    );

    res.json(usageStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

// Endpoint to get provider status and available models
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = modelRegistry.getProviders();
    const allModels = providerManager.getAllModels();
    const providerStatuses = providerManager.getAvailableProviders().map(provider => ({
      name: provider,
      status: providerManager.getProviderStatus(provider),
      models: providerManager.getProviderModels(provider)
    }));

    res.json({
      providers,
      providerStatuses,
      allModels,
      routingModes: modelRegistry.getRoutingModes()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get provider information' });
  }
});

// Endpoint to test provider connectivity
router.post('/test-provider', async (req: Request, res: Response) => {
  try {
    const { providerName } = req.body;

    if (!providerName) {
      return res.status(400).json({ error: 'Provider name is required' });
    }

    const testResult = await providerManager.testProvider(providerName);
    res.json({
      provider: providerName,
      ...testResult
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test provider',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cost optimization endpoints

// Get optimization status and statistics
router.get('/optimization/status', async (req: Request, res: Response) => {
  try {
    const routingStats = routingService.getRoutingStats();
    const costOptimizer = (providerManager as any).costOptimizer;

    res.json({
      routing: routingStats,
      costOptimization: costOptimizer ? costOptimizer.getOptimizationStats() : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get optimization status' });
  }
});

// Configure optimization settings
router.put('/optimization/config', async (req: Request, res: Response) => {
  try {
    const { routing, costOptimization } = req.body;

    if (routing) {
      routingService.configureOptimization(routing);
    }

    if (costOptimization) {
      const costOptimizer = (providerManager as any).costOptimizer;
      if (costOptimizer) {
        costOptimizer.configure(costOptimization);
      }
    }

    res.json({
      success: true,
      message: 'Optimization settings updated'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update optimization settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint to execute prompt graph workflow
router.post('/execute-workflow', async (req: Request, res: Response) => {
  try {
    const { prompt, language, framework, complexity, requirements, constraints } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start execution asynchronously
    const executionPromise = promptGraphExecutor.executeWorkflow(prompt, {
      language,
      framework,
      complexity,
      requirements,
      constraints
    });

    // Store the execution promise (in production, use proper job queue)
    activeExecutions.set(executionId, {
      status: 'running',
      startTime: Date.now(),
      promise: executionPromise
    });

    // Execute and respond
    const result = await executionPromise;

    // Update execution status
    activeExecutions.set(executionId, {
      status: 'completed',
      result,
      endTime: Date.now()
    });

    res.json({
      executionId,
      status: 'completed',
      result
    });

  } catch (error) {
    console.error('Workflow execution error:', error);
    res.status(500).json({
      error: 'Failed to execute workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint to get execution status
router.get('/execution/:executionId', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const execution = activeExecutions.get(executionId);

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (execution.status === 'running') {
      res.json({
        executionId,
        status: 'running',
        startTime: execution.startTime
      });
    } else {
      res.json({
        executionId,
        status: 'completed',
        result: execution.result,
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.endTime - execution.startTime
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get execution status' });
  }
});

// Endpoint to get all active executions
router.get('/executions', async (req: Request, res: Response) => {
  try {
    const executions = Array.from(activeExecutions.entries()).map(([id, exec]) => ({
      executionId: id,
      status: exec.status,
      startTime: exec.startTime,
      endTime: exec.endTime,
      duration: exec.endTime ? exec.endTime - exec.startTime : undefined
    }));

    res.json({ executions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get executions' });
  }
});

// Endpoint to cancel execution
router.delete('/execution/:executionId', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const removed = activeExecutions.delete(executionId);

    if (!removed) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({ success: true, message: 'Execution cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});
// Budget management endpoints

// Get budget status for all periods
router.get('/budget/status', async (req: Request, res: Response) => {
  try {
    const status = {
      daily: budgetManager.getBudgetStatus('daily'),
      weekly: budgetManager.getBudgetStatus('weekly'),
      monthly: budgetManager.getBudgetStatus('monthly')
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get budget status' });
  }
});

// Get budget configuration
router.get('/budget/config', async (req: Request, res: Response) => {
  try {
    const config = budgetManager.getBudgetConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get budget configuration' });
  }
});

// Update budget configuration
router.put('/budget/config', async (req: Request, res: Response) => {
  try {
    const newConfig = req.body;
    budgetManager.updateBudgetConfig(newConfig);

    res.json({
      success: true,
      config: budgetManager.getBudgetConfig()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update budget configuration' });
  }
});

// Get usage analytics
router.get('/budget/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = budgetManager.getUsageAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get usage analytics' });
  }
});

// Get active budget alerts
router.get('/budget/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = budgetManager.getActiveAlerts();
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get budget alerts' });
  }
});

// Acknowledge budget alert
router.post('/budget/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const acknowledged = budgetManager.acknowledgeAlert(alertId);

    if (!acknowledged) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Reset budget for a period
router.post('/budget/reset/:period', async (req: Request, res: Response) => {
  try {
    const { period } = req.params;
    if (!['daily', 'weekly', 'monthly'].includes(period as string)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    budgetManager.resetBudget(period as any);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset budget' });
  }
});

// Sandbox execution endpoints

// Execute code in sandbox
router.post('/sandbox/execute', async (req: Request, res: Response) => {
  try {
    const { code, files, mainFile, timeout, allowNetwork, allowFileSystem } = req.body;

    if (!code && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Code or files are required' });
    }

    const config = {
      timeout: timeout || 10000,
      allowNetwork: allowNetwork || false,
      allowFileSystem: allowFileSystem || false
    };

    let result;
    if (files && files.length > 0) {
      result = await sandboxService.executeProject(files, mainFile, config);
    } else {
      result = await sandboxService.executeCode(code, undefined, config);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Sandbox execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test code with test cases
router.post('/sandbox/test', async (req: Request, res: Response) => {
  try {
    const { code, testCases } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const testResults = await sandboxService.testCode(code, testCases);

    res.json(testResults);
  } catch (error) {
    res.status(500).json({
      error: 'Code testing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get sandbox configuration
router.get('/sandbox/config', async (req: Request, res: Response) => {
  try {
    const config = sandboxService.getConfig();
    const securityPolicy = sandboxService.getSecurityPolicy();

    res.json({
      config,
      securityPolicy
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sandbox configuration' });
  }
});

// Update sandbox configuration
router.put('/sandbox/config', async (req: Request, res: Response) => {
  try {
    const { config, securityPolicy } = req.body;

    if (config) {
      sandboxService.updateConfig(config);
    }

    if (securityPolicy) {
      sandboxService.updateSecurityPolicy(securityPolicy);
    }

    res.json({
      success: true,
      config: sandboxService.getConfig(),
      securityPolicy: sandboxService.getSecurityPolicy()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sandbox configuration' });
  }
});

// Version control endpoints

// Initialize Git repository
router.post('/git/init', async (req: Request, res: Response) => {
  try {
    await gitService.initializeRepository();
    res.json({ success: true, message: 'Git repository initialized' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to initialize Git repository',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Git status
router.get('/git/status', async (req: Request, res: Response) => {
  try {
    const status = await gitService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get Git status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get commit history
router.get('/git/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await gitService.getCommitHistory(limit);
    res.json({ commits: history });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get commit history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get branches
router.get('/git/branches', async (req: Request, res: Response) => {
  try {
    const branches = await gitService.getBranches();
    res.json({ branches });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get branches',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create branch
router.post('/git/branches', async (req: Request, res: Response) => {
  try {
    const { branchName } = req.body;

    if (!branchName) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    await gitService.createBranch(branchName);
    res.json({ success: true, branch: branchName });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create branch',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate semantic commit message
router.post('/git/commit/generate', async (req: Request, res: Response) => {
  try {
    const { files, context } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Files are required' });
    }

    const commitTemplate = await semanticCommitService.generateCommitMessage(files, context);
    res.json({ commitTemplate });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate commit message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Commit changes
router.post('/git/commit', async (req: Request, res: Response) => {
  try {
    const { files, template, context } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Files are required' });
    }

    if (!template) {
      return res.status(400).json({ error: 'Commit template is required' });
    }

    const commitHash = await gitService.commitChanges(files, template, context);
    res.json({
      success: true,
      commitHash,
      message: 'Changes committed successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to commit changes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create project snapshot
router.post('/git/snapshot', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Snapshot name is required' });
    }

    const snapshot = await gitService.createSnapshot(name, description);
    res.json({ snapshot });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create snapshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Restore from project snapshot
router.post('/git/snapshot/restore', async (req: Request, res: Response) => {
  try {
    const { snapshot } = req.body;

    if (!snapshot) {
      return res.status(400).json({ error: 'Snapshot data is required' });
    }

    await gitService.restoreSnapshot(snapshot);
    res.json({
      success: true,
      message: `Restored to snapshot: ${snapshot.name}`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to restore snapshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get semantic commit types
router.get('/git/commit-types', async (req: Request, res: Response) => {
  try {
    const commitTypes = semanticCommitService.getCommitTypes();
    res.json({ commitTypes });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get commit types',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate commit message
router.post('/git/validate-message', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Commit message is required' });
    }

    const validation = semanticCommitService.validateCommitMessage(message);
    res.json(validation);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate commit message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Expo project export endpoints

// Create Expo project from generated code
router.post('/expo/export', async (req: Request, res: Response) => {
  try {
    const { code, config } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (!config || !config.name || !config.slug) {
      return res.status(400).json({ error: 'Project config with name and slug is required' });
    }

    const result = await expoService.createExpoProject(code, config);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to export to Expo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start Expo development server
router.post('/expo/start', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const result = await expoService.startDevServer(projectPath);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start Expo dev server',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export project as APK/IPA
router.post('/expo/build', async (req: Request, res: Response) => {
  try {
    const { projectPath, platform } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    if (!['android', 'ios'].includes(platform)) {
      return res.status(400).json({ error: 'Platform must be android or ios' });
    }

    const result = await expoService.exportProject(projectPath, platform as 'android' | 'ios');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to build Expo project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Convert snapshot to Expo project
router.post('/expo/snapshot-to-project', async (req: Request, res: Response) => {
  try {
    const { snapshot, config } = req.body;

    if (!snapshot) {
      return res.status(400).json({ error: 'Snapshot is required' });
    }

    if (!config || !config.name || !config.slug) {
      return res.status(400).json({ error: 'Project config with name and slug is required' });
    }

    const result = await expoService.snapshotToExpoProject(snapshot, config);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to convert snapshot to Expo project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Flutter project export endpoints

// Create Flutter project from generated code
router.post('/flutter/export', async (req: Request, res: Response) => {
  try {
    const { code, config } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (!config || !config.name || !config.org) {
      return res.status(400).json({ error: 'Project config with name and org is required' });
    }

    const result = await flutterService.createFlutterProject(code, config);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to export to Flutter',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Build Flutter app for Android
router.post('/flutter/build-apk', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const result = await flutterService.buildApk(projectPath);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to build APK',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Build Flutter app for iOS
router.post('/flutter/build-ipa', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const result = await flutterService.buildIpa(projectPath);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to build IPA',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run Flutter web server for preview
router.post('/flutter/web-preview', async (req: Request, res: Response) => {
  try {
    const { projectPath, port } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const result = await flutterService.runWebServer(projectPath, port || 8080);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start web preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Convert snapshot to Flutter project
router.post('/flutter/snapshot-to-project', async (req: Request, res: Response) => {
  try {
    const { snapshot, config } = req.body;

    if (!snapshot) {
      return res.status(400).json({ error: 'Snapshot is required' });
    }

    if (!config || !config.name || !config.org) {
      return res.status(400).json({ error: 'Project config with name and org is required' });
    }

    const result = await flutterService.snapshotToFlutterProject(snapshot, config);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to convert snapshot to Flutter project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Code quality endpoints

// Run linting on code
router.post('/quality/lint', async (req: Request, res: Response) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    const result = await codeQualityService.lintCode(files);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to run linting',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run tests on code
router.post('/quality/test', async (req: Request, res: Response) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    const result = await codeQualityService.runTests(files);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to run tests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate comprehensive code quality report
router.post('/quality/report', async (req: Request, res: Response) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    const result = await codeQualityService.generateQualityReport(files);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate quality report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Diff validation endpoints

// Validate changes with secondary model review
router.post('/validation/diff', async (req: Request, res: Response) => {
  try {
    const { originalFiles, newFiles, context } = req.body;

    if (!newFiles || !Array.isArray(newFiles)) {
      return res.status(400).json({ error: 'New files array is required' });
    }

    const result = await diffValidationService.validateChanges(
      originalFiles || [],
      newFiles,
      context
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to perform diff validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Full workflow with prompt graph executor and diff validation
router.post('/workflow/generate', async (req: Request, res: Response) => {
  const { prompt, language, framework, complexity, requirements, constraints } = req.body;

  try {
    // Execute the complete workflow with diff validation
    const result = await promptGraphExecutor.executeWorkflow(prompt, {
      language: language || 'typescript',
      framework: framework || 'react',
      complexity: complexity || 'moderate',
      requirements: requirements || [],
      constraints: constraints || []
    });

    // Extract the final generated code for response
    const generatedFiles = result.output.files.filter(f =>
      f.language === 'javascript' || f.language === 'typescript' || f.language === 'python'
    );

    // Get the main generated file content
    const mainFile = generatedFiles.find(f => !f.path.includes('PLAN.md') && !f.path.includes('VALIDATION.md') && !f.path.includes('QUALITY_REPORT.md') && !f.path.includes('DIFF_VALIDATION.md'));
    const code = mainFile ? mainFile.content : '';

    // Calculate total cost and tokens
    const totalCost = result.output.metadata.totalCost;
    const totalTokens = result.output.metadata.totalTokens;

    // Check budget
    const budgetCheck = await budgetManager.checkRequestBudget('openai', 'gpt-4o', totalTokens, totalCost);
    if (!budgetCheck.allowed) {
      return res.status(429).json({
        error: 'Budget limit exceeded for workflow',
        reason: budgetCheck.reason,
        wouldExceed: budgetCheck.wouldExceed,
        alerts: budgetCheck.alerts
      });
    }

    // Record usage
    modelRegistry.recordUsage('openai', 'gpt-4o', totalTokens, 0, totalCost);

    res.json({
      code,
      files: result.output.files,
      summary: result.output.summary,
      metadata: result.output.metadata,
      workflow: {
        id: result.id,
        name: result.name,
        nodes: result.nodes.length,
        executionTime: result.output.metadata.executionTime
      }
    });
  } catch (error) {
    console.error('Workflow generation failed:', error);
    res.status(500).json({
      error: 'Failed to execute workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
"" 
