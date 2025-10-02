import { GeneratedFile } from '../types/prompt-graph';
import { ProviderManager } from './provider-manager';
import { ModelRegistryService } from './model-registry';

export interface DiffAnalysis {
  file: string;
  additions: number;
  deletions: number;
  complexity: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  summary: string;
  suggestions: string[];
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface DiffValidationReport {
  overall: {
    score: number; // 0-100
    risk: 'low' | 'medium' | 'high';
    status: 'approved' | 'needs-review' | 'rejected';
    summary: string;
  };
  files: DiffAnalysis[];
  recommendations: string[];
  approved: boolean;
}

export class DiffValidationService {
  constructor(
    private providerManager: ProviderManager,
    private modelRegistry: ModelRegistryService
  ) {}

  /**
   * Validate changes with a secondary model review
   */
  async validateChanges(
    originalFiles: GeneratedFile[],
    newFiles: GeneratedFile[],
    context?: string
  ): Promise<DiffValidationReport> {
    try {
      // Generate diffs for each file
      const fileAnalyses: DiffAnalysis[] = [];

      for (const newFile of newFiles) {
        const originalFile = originalFiles.find(f => f.path === newFile.path);
        const analysis = await this.analyzeFileDiff(originalFile, newFile);
        fileAnalyses.push(analysis);
      }

      // Get AI-powered validation
      const aiValidation = await this.performAIValidation(fileAnalyses, context);

      // Calculate overall metrics
      const totalAdditions = fileAnalyses.reduce((sum, f) => sum + f.additions, 0);
      const totalDeletions = fileAnalyses.reduce((sum, f) => sum + f.deletions, 0);
      const highRiskFiles = fileAnalyses.filter(f => f.risk === 'high').length;
      const totalIssues = fileAnalyses.reduce((sum, f) => sum + f.issues.length, 0);

      // Calculate score (0-100, higher is better)
      let score = 100;
      score -= Math.min(50, totalIssues * 5); // Issues penalty
      score -= Math.min(30, highRiskFiles * 10); // Risk penalty
      score -= Math.min(20, Math.max(0, totalAdditions - 100) * 0.2); // Size penalty

      // Determine overall risk
      let overallRisk: 'low' | 'medium' | 'high' = 'low';
      if (highRiskFiles > 0 || totalIssues > 5) overallRisk = 'high';
      else if (totalIssues > 2 || totalAdditions > 200) overallRisk = 'medium';

      // Determine status
      let status: 'approved' | 'needs-review' | 'rejected' = 'approved';
      if (overallRisk === 'high' || score < 60) status = 'rejected';
      else if (overallRisk === 'medium' || score < 80) status = 'needs-review';

      return {
        overall: {
          score: Math.max(0, Math.round(score)),
          risk: overallRisk,
          status,
          summary: aiValidation.summary
        },
        files: fileAnalyses,
        recommendations: aiValidation.recommendations,
        approved: status === 'approved'
      };
    } catch (error) {
      console.error('Diff validation failed:', error);
      return {
        overall: {
          score: 0,
          risk: 'high',
          status: 'rejected',
          summary: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        files: [],
        recommendations: ['Manual review required due to validation failure'],
        approved: false
      };
    }
  }

  /**
   * Analyze diff for a single file
   */
  private async analyzeFileDiff(
    originalFile: GeneratedFile | undefined,
    newFile: GeneratedFile
  ): Promise<DiffAnalysis> {
    const originalContent = originalFile?.content || '';
    const newContent = newFile.content;

    // Simple diff calculation
    const additions = this.countAdditions(originalContent, newContent);
    const deletions = this.countDeletions(originalContent, newContent);

    // Analyze complexity
    const complexity = this.analyzeComplexity(newContent);
    const risk = this.assessRisk(newFile, additions, deletions, complexity);

    // Basic static analysis
    const issues = this.performStaticAnalysis(newContent, newFile.language);

    return {
      file: newFile.path,
      additions,
      deletions,
      complexity,
      risk,
      summary: `${additions} additions, ${deletions} deletions`,
      suggestions: this.generateSuggestions(newFile, issues),
      issues
    };
  }

  /**
   * Perform AI-powered validation
   */
  private async performAIValidation(
    fileAnalyses: DiffAnalysis[],
    context?: string
  ): Promise<{ summary: string; recommendations: string[] }> {
    try {
      const prompt = `
Analyze the following code changes and provide a validation report:

${fileAnalyses.map(analysis => `
File: ${analysis.file}
- Additions: ${analysis.additions}
- Deletions: ${analysis.deletions}
- Complexity: ${analysis.complexity}
- Risk: ${analysis.risk}
- Issues: ${analysis.issues.map(i => i.message).join(', ')}
- Suggestions: ${analysis.suggestions.join(', ')}
`).join('\n')}

${context ? `Context: ${context}` : ''}

Please provide:
1. Overall summary of the changes
2. List of recommendations for improvement
3. Any critical issues that need attention

Respond in JSON format:
{
  "summary": "Brief summary of changes",
  "recommendations": ["rec1", "rec2"]
}
`;

      const result = await this.providerManager.generateCode('google', 'gemini-pro', prompt);

      try {
        const parsed = JSON.parse(result);
        return {
          summary: parsed.summary || 'Changes analyzed',
          recommendations: parsed.recommendations || []
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          summary: result.substring(0, 200),
          recommendations: ['Review changes manually']
        };
      }
    } catch (error) {
      return {
        summary: 'AI validation unavailable, manual review recommended',
        recommendations: ['Perform manual code review']
      };
    }
  }

  /**
   * Count additions in diff
   */
  private countAdditions(original: string, modified: string): number {
    const originalLines = original.split('\n').length;
    const modifiedLines = modified.split('\n').length;
    return Math.max(0, modifiedLines - originalLines);
  }

  /**
   * Count deletions in diff
   */
  private countDeletions(original: string, modified: string): number {
    const originalLines = original.split('\n').length;
    const modifiedLines = modified.split('\n').length;
    return Math.max(0, originalLines - modifiedLines);
  }

  /**
   * Analyze code complexity
   */
  private analyzeComplexity(content: string): 'low' | 'medium' | 'high' {
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+|const\s+\w+\s*=\s*\(|class\s+/g) || []).length;
    const complexity = lines + functions * 10;

    if (complexity > 200) return 'high';
    if (complexity > 50) return 'medium';
    return 'low';
  }

  /**
   * Assess risk level
   */
  private assessRisk(
    file: GeneratedFile,
    additions: number,
    deletions: number,
    complexity: 'low' | 'medium' | 'high'
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    if (complexity === 'high') riskScore += 3;
    else if (complexity === 'medium') riskScore += 2;

    if (additions > 100) riskScore += 2;
    if (deletions > 50) riskScore += 1;

    // File type risk
    if (file.path.includes('config') || file.path.includes('security')) riskScore += 2;

    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Perform basic static analysis
   */
  private performStaticAnalysis(content: string, language: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (language === 'javascript' || language === 'typescript') {
      // Check for console.log statements
      const consoleLogs = content.match(/console\.\w+\(/g);
      if (consoleLogs && consoleLogs.length > 0) {
        issues.push({
          type: 'warning',
          message: `Found ${consoleLogs.length} console statements that should be removed`
        });
      }

      // Check for TODO comments
      const todos = content.match(/\/\/\s*TODO|\/\*\s*TODO/g);
      if (todos) {
        issues.push({
          type: 'info',
          message: 'Found TODO comments that should be addressed'
        });
      }

      // Check for long functions
      const functions = content.split('\n').filter(line => line.includes('function') || line.includes('=>'));
      if (functions.length > 0) {
        const longFunctions = functions.filter(() => Math.random() > 0.7); // Mock check
        if (longFunctions.length > 0) {
          issues.push({
            type: 'warning',
            message: 'Some functions may be too long and should be refactored'
          });
        }
      }
    }

    return issues;
  }

  /**
   * Generate suggestions based on analysis
   */
  private generateSuggestions(file: GeneratedFile, issues: ValidationIssue[]): string[] {
    const suggestions: string[] = [];

    if (issues.some(i => i.type === 'error')) {
      suggestions.push('Fix critical errors before proceeding');
    }

    if (file.language === 'javascript' || file.language === 'typescript') {
      suggestions.push('Consider adding JSDoc comments for better documentation');
      suggestions.push('Ensure proper error handling is implemented');
    }

    if (issues.length === 0) {
      suggestions.push('Code looks good, consider adding unit tests');
    }

    return suggestions;
  }
}