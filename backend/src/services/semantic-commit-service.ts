import { CommitTemplate, CommitAnalysis, SemanticCommitRule } from '../types/version-control';
import { ProviderManager } from './provider-manager';
import { ModelRegistryService } from './model-registry';

export class SemanticCommitService {
  private commitRules: SemanticCommitRule[] = [
    {
      type: 'feat',
      description: 'A new feature',
      scope: 'feature'
    },
    {
      type: 'fix',
      description: 'A bug fix',
      scope: 'bug'
    },
    {
      type: 'docs',
      description: 'Documentation only changes',
      scope: 'documentation'
    },
    {
      type: 'style',
      description: 'Changes that do not affect the meaning of the code',
      scope: 'formatting'
    },
    {
      type: 'refactor',
      description: 'A code change that neither fixes a bug nor adds a feature',
      scope: 'code'
    },
    {
      type: 'test',
      description: 'Adding missing tests or correcting existing tests',
      scope: 'testing'
    },
    {
      type: 'chore',
      description: 'Changes to the build process or auxiliary tools',
      scope: 'maintenance'
    }
  ];

  constructor(
    private providerManager: ProviderManager,
    private modelRegistry: ModelRegistryService
  ) {}

  /**
   * Analyze file changes to determine semantic commit type
   */
  async analyzeChanges(
    changedFiles: string[],
    diffContent?: string
  ): Promise<CommitAnalysis> {
    try {
      // Use AI to analyze the changes and determine commit type
      const analysis = await this.performAIAnalysis(changedFiles, diffContent);

      return {
        type: analysis.type,
        scope: analysis.scope,
        breaking: analysis.breaking,
        issues: analysis.issues,
        confidence: analysis.confidence,
        suggestions: analysis.suggestions
      };
    } catch (error) {
      console.error('AI analysis failed, using heuristic analysis:', error);
      return this.performHeuristicAnalysis(changedFiles, diffContent);
    }
  }

  /**
   * Generate semantic commit message
   */
  async generateCommitMessage(
    changedFiles: string[],
    context?: string,
    diffContent?: string
  ): Promise<CommitTemplate> {
    const analysis = await this.analyzeChanges(changedFiles, diffContent);

    // Generate description based on file types and changes
    const description = await this.generateDescription(changedFiles, analysis, context);

    return {
      type: analysis.type,
      scope: analysis.scope,
      description,
      body: context,
      breaking: analysis.breaking,
      issues: analysis.issues
    };
  }

  /**
   * Validate semantic commit message format
   */
  validateCommitMessage(commitMessage: string): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check basic format: type(scope): description
    const commitRegex = /^(\w+)(\(.+\))?:\s(.+)/;
    const match = commitMessage.match(commitRegex);

    if (!match) {
      errors.push('Commit message must follow format: type(scope): description');
      suggestions.push('Use: feat: add new feature');
    } else {
      const [, type, scope, description] = match;

      // Validate type
      const validTypes = this.commitRules.map(rule => rule.type);
      if (!validTypes.includes(type as any)) {
        errors.push(`Invalid commit type '${type}'. Valid types: ${validTypes.join(', ')}`);
      }

      // Validate description
      if (description.length < 10) {
        suggestions.push('Description should be more descriptive (at least 10 characters)');
      }

      if (description.length > 100) {
        suggestions.push('Description should be concise (under 100 characters)');
      }

      // Check for imperative mood
      if (description && !this.isImperative(description)) {
        suggestions.push('Use imperative mood in description (e.g., "add" not "added")');
      }
    }

    // Check message length
    if (commitMessage.length > 120) {
      suggestions.push('Keep first line under 120 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * Get available commit types and their descriptions
   */
  getCommitTypes(): SemanticCommitRule[] {
    return [...this.commitRules];
  }

  /**
   * Suggest commit message based on file changes
   */
  suggestCommitMessage(changedFiles: string[]): string {
    const fileTypes = this.categorizeFiles(changedFiles);

    if (fileTypes.test.length > 0) {
      return 'test: add tests for new functionality';
    }

    if (fileTypes.docs.length > 0) {
      return 'docs: update documentation';
    }

    if (fileTypes.style.length > 0) {
      return 'style: improve code formatting';
    }

    if (fileTypes.config.length > 0) {
      return 'chore: update configuration files';
    }

    return 'feat: implement new functionality';
  }

  /**
   * AI-powered analysis of changes
   */
  private async performAIAnalysis(
    changedFiles: string[],
    diffContent?: string
  ): Promise<CommitAnalysis> {
    const prompt = `
Analyze the following code changes and determine the appropriate semantic commit type:

Changed Files:
${changedFiles.map(file => `- ${file}`).join('\n')}

${diffContent ? `Diff Content:
${diffContent}
` : ''}

Please respond with JSON in this format:
{
  "type": "feat|fix|docs|style|refactor|test|chore",
  "scope": "optional scope",
  "breaking": false,
  "issues": ["#123"],
  "confidence": 0.9,
  "suggestions": ["suggestion1", "suggestion2"]
}

Choose the most appropriate commit type based on the changes.`;

    try {
      const result = await this.providerManager.generateCode('openai', 'gpt-4o', prompt);

      // Parse JSON response
      const analysis = JSON.parse(result);

      return {
        type: analysis.type || 'feat',
        scope: analysis.scope,
        breaking: analysis.breaking || false,
        issues: analysis.issues || [],
        confidence: analysis.confidence || 0.5,
        suggestions: analysis.suggestions || []
      };
    } catch (error) {
      throw new Error(`AI analysis failed: ${error}`);
    }
  }

  /**
   * Heuristic-based analysis when AI is unavailable
   */
  private performHeuristicAnalysis(
    changedFiles: string[],
    diffContent?: string
  ): CommitAnalysis {
    const fileTypes = this.categorizeFiles(changedFiles);

    let type: CommitTemplate['type'] = 'feat';
    let scope: string | undefined;
    let breaking = false;
    const issues: string[] = [];

    // Extract issue numbers from commit message or branch name
    if (diffContent) {
      const issueMatches = diffContent.match(/#\d+/g);
      if (issueMatches) {
        issues.push(...issueMatches);
      }
    }

    // Determine type based on file categories
    if (fileTypes.test.length > 0 && fileTypes.code.length === 0) {
      type = 'test';
      scope = 'test';
    } else if (fileTypes.docs.length > 0 && fileTypes.code.length === 0) {
      type = 'docs';
      scope = 'docs';
    } else if (fileTypes.style.length > 0) {
      type = 'style';
      scope = 'style';
    } else if (fileTypes.config.length > 0) {
      type = 'chore';
      scope = 'config';
    } else if (fileTypes.refactor.length > 0) {
      type = 'refactor';
      scope = 'code';
    } else if (fileTypes.fix.length > 0) {
      type = 'fix';
      scope = 'bug';
    } else {
      type = 'feat';
      scope = 'feature';
    }

    // Check for breaking changes
    if (diffContent) {
      breaking = /breaking|break|major/.test(diffContent.toLowerCase());
    }

    return {
      type,
      scope,
      breaking,
      issues,
      confidence: 0.7,
      suggestions: [`Use '${type}' for this type of change`]
    };
  }

  /**
   * Generate commit description
   */
  private async generateDescription(
    changedFiles: string[],
    analysis: CommitAnalysis,
    context?: string
  ): Promise<string> {
    try {
      const fileCount = changedFiles.length;
      const primaryFile = changedFiles[0];

      if (fileCount === 1) {
        const filename = primaryFile.split('/').pop() || primaryFile;
        return `${this.getActionVerb(analysis.type)} ${filename}`;
      } else {
        return `${this.getActionVerb(analysis.type)} ${fileCount} files`;
      }
    } catch (error) {
      return `${analysis.type} changes`;
    }
  }

  /**
   * Get action verb for commit type
   */
  private getActionVerb(type: string): string {
    const verbs: Record<string, string> = {
      feat: 'add',
      fix: 'fix',
      docs: 'update',
      style: 'improve',
      refactor: 'refactor',
      test: 'add',
      chore: 'update'
    };

    return verbs[type] || 'update';
  }

  /**
   * Categorize files by type
   */
  private categorizeFiles(files: string[]): {
    code: string[];
    test: string[];
    docs: string[];
    style: string[];
    config: string[];
    refactor: string[];
    fix: string[];
  } {
    return files.reduce((categories, file) => {
      const filename = file.toLowerCase();
      const ext = filename.split('.').pop();

      if (filename.includes('.test.') || filename.includes('.spec.') || ext === 'test') {
        categories.test.push(file);
      } else if (['.md', '.txt', '.rst', '.adoc'].includes(`.${ext}`)) {
        categories.docs.push(file);
      } else if (['.css', '.scss', '.less', '.styl'].includes(`.${ext}`)) {
        categories.style.push(file);
      } else if (['package.json', 'tsconfig.json', 'webpack.config.', 'rollup.config.', 'vite.config.'].some(pattern => filename.includes(pattern))) {
        categories.config.push(file);
      } else {
        categories.code.push(file);
      }

      return categories;
    }, {
      code: [] as string[],
      test: [] as string[],
      docs: [] as string[],
      style: [] as string[],
      config: [] as string[],
      refactor: [] as string[],
      fix: [] as string[]
    });
  }

  /**
   * Check if description is in imperative mood
   */
  private isImperative(description: string): boolean {
    const imperativeVerbs = [
      'add', 'create', 'implement', 'update', 'fix', 'remove', 'delete',
      'improve', 'refactor', 'optimize', 'simplify', 'enhance', 'extend',
      'modify', 'change', 'edit', 'revise', 'correct', 'adjust', 'set',
      'configure', 'enable', 'disable', 'integrate', 'merge', 'split'
    ];

    const words = description.toLowerCase().split(' ');
    return imperativeVerbs.includes(words[0]);
  }

  /**
   * Add custom commit rule
   */
  addCommitRule(rule: SemanticCommitRule): void {
    this.commitRules.push(rule);
  }

  /**
   * Remove commit rule
   */
  removeCommitRule(type: string): void {
    this.commitRules = this.commitRules.filter(rule => rule.type !== type);
  }
}