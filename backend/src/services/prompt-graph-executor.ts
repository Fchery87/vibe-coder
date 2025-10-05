import { PromptGraph, PromptGraphNode, ExecutionContext, ExecutionStep, GeneratedFile, ValidationResult } from '../types/prompt-graph';
import { ModelRegistryService } from './model-registry';
import { RoutingService, RoutingContext } from './routing-service';
import { ProviderManager } from './provider-manager';
import { CodeQualityService } from './code-quality-service';
import { DiffValidationService } from './diff-validation-service';

export class PromptGraphExecutor {
  constructor(
    private modelRegistry: ModelRegistryService,
    private routingService: RoutingService,
    private providerManager: ProviderManager,
    private codeQualityService?: CodeQualityService,
    private diffValidationService?: DiffValidationService
  ) {}

  /**
   * Execute a complete prompt graph workflow
   */
  async executeWorkflow(
    userPrompt: string,
    options: {
      language?: string;
      framework?: string;
      complexity?: 'simple' | 'moderate' | 'complex';
      requirements?: string[];
      constraints?: string[];
    } = {}
  ): Promise<PromptGraph> {
    const startTime = Date.now();

    // Create execution context
    const context: ExecutionContext = {
      userPrompt,
      requirements: options.requirements || [],
      constraints: options.constraints || [],
      preferences: {
        language: options.language || 'typescript',
        framework: options.framework || 'react',
        complexity: options.complexity || 'moderate'
      },
      generatedFiles: [],
      executionHistory: []
    };

    // Generate the prompt graph
    const promptGraph = await this.generatePromptGraph(context);

    // Execute the workflow
    const result = await this.executePromptGraph(promptGraph, context);

    const executionTime = Date.now() - startTime;

    // Update final results
    result.output.metadata.executionTime = executionTime;
    result.output.metadata.totalCost = context.executionHistory.reduce((sum, step) => sum + step.cost, 0);
    result.output.metadata.totalTokens = context.executionHistory.reduce((sum, step) => sum + step.tokens, 0);
    result.output.metadata.modelsUsed = [...new Set(context.executionHistory.map(step => step.model))];

    return result;
  }

  /**
   * Generate a prompt graph based on user requirements
   */
  private async generatePromptGraph(context: ExecutionContext): Promise<PromptGraph> {
    const { userPrompt, preferences } = context;

    // Create nodes for the workflow
    const nodes: PromptGraphNode[] = [
      {
        id: 'analyze-requirements',
        type: 'plan',
        prompt: this.generatePlanningPrompt(userPrompt, preferences),
        maxTokens: 1000,
        temperature: 0.3
      },
      {
        id: 'design-architecture',
        type: 'plan',
        prompt: '{{PREV_RESPONSE}}\n\nBased on the analysis above, design a detailed architecture and file structure.',
        dependsOn: ['analyze-requirements'],
        maxTokens: 800,
        temperature: 0.4
      },
      {
        id: 'scaffold-structure',
        type: 'scaffold',
        prompt: '{{PREV_RESPONSE}}\n\nGenerate the basic file structure and skeleton code.',
        dependsOn: ['design-architecture'],
        maxTokens: 1500,
        temperature: 0.5
      },
      {
        id: 'implement-core',
        type: 'build',
        prompt: '{{PREV_RESPONSE}}\n\nImplement the core functionality with detailed business logic.',
        dependsOn: ['scaffold-structure'],
        maxTokens: 2000,
        temperature: 0.6
      },
      {
        id: 'add-features',
        type: 'build',
        prompt: '{{PREV_RESPONSE}}\n\nAdd additional features and enhancements.',
        dependsOn: ['implement-core'],
        maxTokens: 1500,
        temperature: 0.7
      },
      {
        id: 'validate-code',
        type: 'validate',
        prompt: '{{PREV_RESPONSE}}\n\nReview and validate the generated code for correctness and best practices.',
        dependsOn: ['add-features'],
        maxTokens: 1000,
        temperature: 0.2
      },
      {
        id: 'quality-check',
        type: 'quality',
        prompt: 'Run automated quality checks (linting and testing) on the generated code.',
        dependsOn: ['validate-code'],
        maxTokens: 500,
        temperature: 0.1
      },
      {
        id: 'diff-review',
        type: 'review',
        prompt: 'Perform secondary model review and diff validation of all changes.',
        dependsOn: ['quality-check'],
        maxTokens: 800,
        temperature: 0.2
      }
    ];

    return {
      id: `graph-${Date.now()}`,
      name: 'Standard Development Workflow',
      description: 'Complete development workflow from planning to validation',
      nodes,
      edges: this.generateEdges(nodes),
      input: {
        userPrompt,
        requirements: context.requirements,
        constraints: context.constraints,
        preferences
      },
      output: {
        files: [],
        summary: '',
        metadata: {
          totalTokens: 0,
          totalCost: 0,
          executionTime: 0,
          modelsUsed: []
        }
      }
    };
  }

  /**
   * Execute the prompt graph nodes in dependency order
   */
  private async executePromptGraph(graph: PromptGraph, context: ExecutionContext): Promise<PromptGraph> {
    const { nodes } = graph;

    // Execute nodes in topological order (respecting dependencies)
    const executedNodes = new Set<string>();
    const executionOrder = this.getExecutionOrder(nodes);

    for (const nodeId of executionOrder) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Check if all dependencies are satisfied
      if (node.dependsOn && !node.dependsOn.every(dep => executedNodes.has(dep))) {
        console.warn(`Skipping node ${nodeId} - dependencies not met`);
        continue;
      }

      try {
        context.currentNode = nodeId;
        const result = await this.executeNode(node, context, graph);

        if (result) {
          context.generatedFiles.push(...result.files);
          executedNodes.add(nodeId);
        }
      } catch (error) {
        console.error(`Error executing node ${nodeId}:`, error);
        // Continue with other nodes even if one fails
      }
    }

    // Update graph output
    graph.output.files = context.generatedFiles;
    graph.output.summary = this.generateSummary(context);

    return graph;
  }

  /**
   * Execute a single node in the prompt graph
   */
  private async executeNode(
    node: PromptGraphNode,
    context: ExecutionContext,
    graph: PromptGraph
  ): Promise<{ files: GeneratedFile[] } | null> {
    const startTime = Date.now();

    try {
      // Select model using single-model routing
      // (Note: Orchestrated mode has been simplified - now uses user-selected provider)
      const routingContext: RoutingContext = {
        mode: 'single-model',
        activeProvider: 'openai', // Default provider for graph execution
        allowFailover: true
      };

      const decision = await this.routingService.makeRoutingDecision(routingContext);

      // Generate prompt with context from previous nodes
      const enrichedPrompt = this.enrichPrompt(node.prompt, context, graph);

      // Execute with selected model
      const modelConfig = this.modelRegistry.getModel(decision.provider, decision.selectedModel);
      const response = await this.providerManager.generateCode(
        decision.provider,
        decision.selectedModel,
        enrichedPrompt,
        modelConfig || undefined
      );

      // Process response based on node type
      const result = await this.processNodeResponse(node, response, context);

      // Record execution step
      const tokens = Math.ceil(enrichedPrompt.length / 4) + Math.ceil(response.length / 4);
      const cost = this.modelRegistry.calculateCost(decision.provider, decision.selectedModel, tokens, 0);

      const step: ExecutionStep = {
        nodeId: node.id,
        type: node.type,
        model: decision.selectedModel,
        provider: decision.provider,
        prompt: enrichedPrompt,
        response,
        tokens,
        cost,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        success: true
      };

      context.executionHistory.push(step);

      return result;
    } catch (error) {
      // Record failed execution step
      const step: ExecutionStep = {
        nodeId: node.id,
        type: node.type,
        model: 'unknown',
        provider: 'unknown',
        prompt: node.prompt,
        response: '',
        tokens: 0,
        cost: 0,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      context.executionHistory.push(step);
      return null;
    }
  }

  /**
   * Process the response from a node execution
   */
  private async processNodeResponse(
    node: PromptGraphNode,
    response: string,
    context: ExecutionContext
  ): Promise<{ files: GeneratedFile[] }> {
    const files: GeneratedFile[] = [];

    switch (node.type) {
      case 'plan':
        // Planning nodes generate analysis and design docs
        files.push({
          path: 'PLAN.md',
          content: response,
          language: 'markdown',
          purpose: 'Project planning and analysis',
          nodeId: node.id
        });
        break;

      case 'scaffold':
        // Scaffold nodes generate basic file structures
        const scaffoldFiles = this.extractFilesFromResponse(response, context.preferences.language);
        files.push(...scaffoldFiles);
        break;

      case 'build':
        // Build nodes generate implementation code
        const buildFiles = this.extractFilesFromResponse(response, context.preferences.language);
        files.push(...buildFiles);
        break;

      case 'validate':
        // Validation nodes generate review reports
        files.push({
          path: 'VALIDATION.md',
          content: response,
          language: 'markdown',
          purpose: 'Code validation and review',
          nodeId: node.id
        });
        break;

      case 'quality':
        // Quality nodes run automated linting and testing
        if (this.codeQualityService) {
          const qualityFiles = context.generatedFiles.filter(f =>
            f.language === 'javascript' || f.language === 'typescript'
          );

          if (qualityFiles.length > 0) {
            // Run quality checks asynchronously (don't block the main flow)
            this.codeQualityService.generateQualityReport(qualityFiles)
              .then(report => {
                // Create quality report file
                const qualityReport = {
                  path: 'QUALITY_REPORT.md',
                  content: this.generateQualityReportContent(report),
                  language: 'markdown',
                  purpose: 'Automated code quality report',
                  nodeId: node.id
                };
                context.generatedFiles.push(qualityReport);
              })
              .catch(error => {
                console.error('Quality check failed:', error);
              });
          }
        }
        break;

      case 'review':
        // Review nodes perform diff validation with secondary model
        if (this.diffValidationService) {
          const originalFiles: GeneratedFile[] = []; // In a real implementation, you'd track original state
          const validationReport = await this.diffValidationService.validateChanges(originalFiles, context.generatedFiles);

          // Create validation report file
          files.push({
            path: 'DIFF_VALIDATION.md',
            content: this.generateValidationReportContent(validationReport),
            language: 'markdown',
            purpose: 'Secondary model diff validation report',
            nodeId: node.id
          });
        }
        break;
    }

    return { files };
  }

  /**
   * Extract file information from AI response
   */
  private extractFilesFromResponse(response: string, defaultLanguage: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Simple regex to extract code blocks with file paths
    const fileRegex = /```(\w+)?\s*file:\s*([^\n]+)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(response)) !== null) {
      const [, language, filePath, content] = match;
      files.push({
        path: filePath.trim(),
        content: content.trim(),
        language: language || this.mapLanguage(defaultLanguage),
        purpose: `Generated ${language || defaultLanguage} file`,
        nodeId: 'current'
      });
    }

    // If no explicit file blocks, create a default file
    if (files.length === 0) {
      files.push({
        path: `generated.${this.getFileExtension(defaultLanguage)}`,
        content: response,
        language: this.mapLanguage(defaultLanguage),
        purpose: 'Generated code file',
        nodeId: 'current'
      });
    }

    return files;
  }

  /**
   * Enrich prompt with context from previous executions
   */
  private enrichPrompt(basePrompt: string, context: ExecutionContext, graph: PromptGraph): string {
    let enriched = basePrompt;

    // Replace template variables
    enriched = enriched.replace(/\{\{PREV_RESPONSE\}\}/g, () => {
      const lastStep = context.executionHistory[context.executionHistory.length - 1];
      return lastStep ? lastStep.response : '';
    });

    // Add context information
    const contextInfo = `
User Requirements: ${context.requirements.join(', ')}
Constraints: ${context.constraints.join(', ')}
Preferences: ${JSON.stringify(context.preferences, null, 2)}
Previously Generated Files: ${context.generatedFiles.map(f => f.path).join(', ')}
`;

    return enriched + '\n\n' + contextInfo;
  }

  /**
   * Generate edges for the prompt graph (simple linear flow for now)
   */
  private generateEdges(nodes: PromptGraphNode[]) {
    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        from: nodes[i].id,
        to: nodes[i + 1].id
      });
    }
    return edges;
  }

  /**
   * Get execution order respecting dependencies
   */
  private getExecutionOrder(nodes: PromptGraphNode[]): string[] {
    // Simple topological sort - for now just return in definition order
    // In a full implementation, this would handle complex dependency graphs
    return nodes.map(node => node.id);
  }

  /**
   * Get appropriate capabilities for node type
   */
  private getCapabilitiesForNodeType(type: string): string[] {
    switch (type) {
      case 'plan':
        return ['analysis', 'planning'];
      case 'scaffold':
        return ['code-generation', 'text-generation'];
      case 'build':
        return ['code-generation', 'text-generation'];
      case 'validate':
        return ['analysis', 'code-generation'];
      case 'quality':
        return ['analysis', 'code-generation'];
      case 'review':
        return ['analysis', 'validation'];
      default:
        return ['text-generation'];
    }
  }

  /**
   * Get priority for node type
   */
  private getPriorityForNodeType(type: string): 'speed' | 'quality' | 'cost' {
    switch (type) {
      case 'plan':
        return 'quality';
      case 'scaffold':
        return 'quality';
      case 'build':
        return 'speed';
      case 'validate':
        return 'quality';
      case 'quality':
        return 'quality';
      case 'review':
        return 'quality';
      default:
        return 'quality';
    }
  }

  /**
   * Generate planning prompt
   */
  private generatePlanningPrompt(userPrompt: string, preferences: any): string {
    return `Analyze the following request and create a detailed development plan:

Request: ${userPrompt}

Target Language: ${preferences.language}
Target Framework: ${preferences.framework}
Complexity Level: ${preferences.complexity}

Please provide:
1. Detailed requirements analysis
2. Technical specifications
3. Architecture overview
4. Development approach
5. Success criteria

Be specific and actionable in your planning.`;
  }

  /**
   * Generate summary of execution
   */
  private generateSummary(context: ExecutionContext): string {
    const successfulSteps = context.executionHistory.filter(step => step.success).length;
    const totalCost = context.executionHistory.reduce((sum, step) => sum + step.cost, 0);
    const totalTokens = context.executionHistory.reduce((sum, step) => sum + step.tokens, 0);

    return `Execution Summary:
- Successful Steps: ${successfulSteps}/${context.executionHistory.length}
- Total Cost: $${totalCost.toFixed(4)}
- Total Tokens: ${totalTokens}
- Files Generated: ${context.generatedFiles.length}
- Models Used: ${[...new Set(context.executionHistory.map(step => step.model))].join(', ')}`;
  }

  /**
   * Map language to file extension
   */
  private getFileExtension(language: string): string {
    const extensions: { [key: string]: string } = {
      'typescript': 'ts',
      'javascript': 'js',
      'python': 'py',
      'java': 'java',
      'csharp': 'cs',
      'php': 'php',
      'ruby': 'rb',
      'go': 'go',
      'rust': 'rs'
    };
    return extensions[language] || 'txt';
  }

  /**
   * Map language for syntax highlighting
   */
  private mapLanguage(language: string): string {
    const mappings: { [key: string]: string } = {
      'typescript': 'typescript',
      'javascript': 'javascript',
      'python': 'python',
      'java': 'java',
      'csharp': 'csharp',
      'php': 'php',
      'ruby': 'ruby',
      'go': 'go',
      'rust': 'rust'
    };
    return mappings[language] || 'plaintext';
  }

  /**
   * Generate markdown content for quality report
   */
  private generateQualityReportContent(report: any): string {
    return `# Code Quality Report

## Overall Score: ${report.overall.score}/100
**Status:** ${report.overall.success ? '✅ PASSED' : '❌ FAILED'}
**Issues:** ${report.overall.issues}

## Linting Results
- **Errors:** ${report.lint.errorCount}
- **Warnings:** ${report.lint.warnings}
- **Status:** ${report.lint.success ? '✅ PASSED' : '❌ FAILED'}

${report.lint.errors.length > 0 ? '### Issues:\n' + report.lint.errors.map((e: any) =>
  `- **${e.severity.toUpperCase()}** ${e.file}:${e.line}:${e.column} - ${e.message} (${e.rule})`
).join('\n') : 'No linting issues found.'}

## Testing Results
- **Tests Run:** ${report.tests.tests}
- **Passed:** ${report.tests.passed}
- **Failed:** ${report.tests.failed}
- **Duration:** ${report.tests.duration}ms
- **Status:** ${report.tests.success ? '✅ PASSED' : '❌ FAILED'}

${report.tests.results.filter((r: any) => r.status === 'failed').length > 0 ?
  '### Failed Tests:\n' + report.tests.results.filter((r: any) => r.status === 'failed').map((r: any) =>
    `- **${r.testName}** - ${r.error}`
  ).join('\n') : 'All tests passed.'}

---
*Report generated automatically by Vibe Coder*
`;
  }

  /**
   * Generate markdown content for validation report
   */
  private generateValidationReportContent(report: any): string {
    return `# Diff Validation Report

## Overall Assessment: ${report.overall.status.toUpperCase()}
**Score:** ${report.overall.score}/100
**Risk Level:** ${report.overall.risk.toUpperCase()}
**Approved:** ${report.approved ? '✅ YES' : '❌ NO'}

## Summary
${report.overall.summary}

## File Analysis
${report.files.map((file: any) => `
### ${file.file}
- **Changes:** +${file.additions} -${file.deletions}
- **Complexity:** ${file.complexity.toUpperCase()}
- **Risk:** ${file.risk.toUpperCase()}
- **Summary:** ${file.summary}

${file.issues.length > 0 ? '**Issues:**\n' + file.issues.map((issue: any) =>
  `- **${issue.type.toUpperCase()}** ${issue.message}${issue.suggestion ? ` (Suggestion: ${issue.suggestion})` : ''}`
).join('\n') : 'No issues found.'}

${file.suggestions.length > 0 ? '**Suggestions:**\n' + file.suggestions.map((s: string) => `- ${s}`).join('\n') : ''}
`).join('\n')}

## Recommendations
${report.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

---
*Validation performed by secondary AI model*
`;
  }
}