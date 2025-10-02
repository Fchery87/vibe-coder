import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import {
  GitCommit,
  GitBranch,
  GitTag,
  GitStatus,
  VersionControlConfig,
  ProjectSnapshot,
  CommitTemplate,
  SemanticCommitRule
} from '../types/version-control';

export class GitService {
  private git: SimpleGit;
  private config: VersionControlConfig;
  private repoPath: string;

  constructor(repositoryPath: string, config?: Partial<VersionControlConfig>) {
    this.repoPath = repositoryPath;
    this.git = simpleGit(repositoryPath);

    this.config = {
      repositoryPath,
      author: {
        name: 'Vibe Coder',
        email: 'ai@vibecoder.dev'
      },
      defaultBranch: 'main',
      autoCommit: true,
      semanticCommits: true,
      commitTemplates: this.getDefaultCommitTemplates(),
      backupOnMajorChanges: true,
      ...config
    };
  }

  /**
   * Initialize a new Git repository
   */
  async initializeRepository(): Promise<void> {
    try {
      // Check if already a git repository
      const isRepo = await this.git.checkIsRepo();

      if (!isRepo) {
        await this.git.init();
        await this.git.addConfig('user.name', this.config.author.name);
        await this.git.addConfig('user.email', this.config.author.email);

        // Create initial commit
        const hasFiles = fs.readdirSync(this.repoPath).length > 0;
        if (hasFiles) {
          await this.git.add('.');
          await this.git.commit('feat: initial project setup');
        }
      }
    } catch (error) {
      throw new Error(`Failed to initialize repository: ${error}`);
    }
  }

  /**
   * Check repository status
   */
  async getStatus(): Promise<GitStatus> {
    try {
      const status = await this.git.status();
      const branchSummary = await this.git.branch();

      return {
        isClean: status.isClean(),
        staged: status.staged.map((file: string) => ({
          path: file,
          status: 'added' as const,
          additions: 0,
          deletions: 0
        })),
        unstaged: status.modified.map((file: string) => ({
          path: file,
          status: 'modified' as const,
          additions: 0,
          deletions: 0
        })),
        untracked: status.not_added,
        branch: status.current || 'main',
        ahead: status.ahead,
        behind: status.behind
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error}`);
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(limit: number = 50): Promise<GitCommit[]> {
    try {
      const logs = await this.git.log({ maxCount: limit });

      return logs.all.map((log: any) => ({
        id: log.hash.substring(0, 8),
        hash: log.hash,
        message: log.message,
        author: log.author_name,
        email: log.author_email,
        timestamp: new Date(log.date),
        files: [], // Would need separate call to get file changes
        parents: [], // Simplified for now
        branch: 'main' // Would need to determine current branch context
      }));
    } catch (error) {
      throw new Error(`Failed to get commit history: ${error}`);
    }
  }

  /**
   * Get all branches
   */
  async getBranches(): Promise<GitBranch[]> {
    try {
      const branchSummary = await this.git.branch();
      const currentBranch = branchSummary.current;

      const branches: GitBranch[] = [];

      // Local branches
      for (const [branchName, branchInfo] of Object.entries(branchSummary.branches)) {
        if (!branchName.includes('remotes/')) {
          branches.push({
            name: branchName,
            isCurrent: branchName === currentBranch,
            isRemote: false,
            commitHash: (branchInfo as any).commit || ''
          });
        }
      }

      // Remote branches
      for (const [branchName, branchInfo] of Object.entries(branchSummary.branches)) {
        if (branchName.includes('remotes/')) {
          const cleanName = branchName.replace('remotes/', '');
          branches.push({
            name: cleanName,
            isCurrent: false,
            isRemote: true,
            commitHash: (branchInfo as any).commit || '',
            upstream: branchName
          });
        }
      }

      return branches;
    } catch (error) {
      throw new Error(`Failed to get branches: ${error}`);
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkoutBranch(branchName, this.config.defaultBranch);
    } catch (error) {
      throw new Error(`Failed to create branch: ${error}`);
    }
  }

  /**
   * Switch to a branch
   */
  async switchBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkout(branchName);
    } catch (error) {
      throw new Error(`Failed to switch branch: ${error}`);
    }
  }

  /**
   * Generate semantic commit message using AI
   */
  async generateSemanticCommit(
    changes: string[],
    context?: string
  ): Promise<CommitTemplate> {
    try {
      // Analyze changes to determine commit type
      const analysis = await this.analyzeChanges(changes, context);

      return {
        type: analysis.type,
        description: this.generateDescription(changes, analysis),
        body: context ? `Context: ${context}` : undefined,
        breaking: analysis.breaking,
        issues: analysis.issues
      };
    } catch (error) {
      // Fallback to basic commit
      return {
        type: 'feat',
        description: 'Update project files',
        body: context
      };
    }
  }

  /**
   * Commit changes with semantic message
   */
  async commitChanges(
    files: string[],
    template: CommitTemplate,
    context?: string
  ): Promise<string> {
    try {
      // Add files to staging
      if (files.length > 0) {
        await this.git.add(files);
      } else {
        await this.git.add('.');
      }

      // Generate semantic commit message
      const commitMessage = this.formatCommitMessage(template, context);

      const result = await this.git.commit(commitMessage);

      return result.commit || '';
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error}`);
    }
  }

  /**
   * Create a project snapshot/checkpoint
   */
  async createSnapshot(name: string, description?: string): Promise<ProjectSnapshot> {
    try {
      const status = await this.getStatus();
      if (!status.isClean) {
        throw new Error('Cannot create snapshot with uncommitted changes');
      }

      const currentCommit = await this.git.revparse(['HEAD']);
      const files = await this.getProjectFiles();

      const snapshot: ProjectSnapshot = {
        id: `snapshot-${Date.now()}`,
        name,
        description: description || `Snapshot created at ${new Date().toISOString()}`,
        timestamp: new Date(),
        commitHash: currentCommit,
        files,
        metadata: {
          language: 'typescript', // Would detect from project
          framework: 'react', // Would detect from project
          dependencies: {}, // Would read from package.json
          fileCount: files.length,
          totalSize: files.reduce((sum, file) => sum + file.size, 0)
        }
      };

      return snapshot;
    } catch (error) {
      throw new Error(`Failed to create snapshot: ${error}`);
    }
  }

  /**
   * Restore from a snapshot
   */
  async restoreSnapshot(snapshot: ProjectSnapshot): Promise<void> {
    try {
      // Checkout the snapshot's commit
      await this.git.checkout(snapshot.commitHash);

      // Restore files from snapshot
      for (const file of snapshot.files) {
        const filePath = path.join(this.repoPath, file.path);
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, file.content, 'utf8');
      }

      // Commit the restoration
      await this.git.add('.');
      await this.git.commit(`restore: ${snapshot.name} - ${snapshot.description}`);
    } catch (error) {
      throw new Error(`Failed to restore snapshot: ${error}`);
    }
  }

  /**
   * Get project files at current state
   */
  private async getProjectFiles(): Promise<ProjectSnapshot['files']> {
    const files: ProjectSnapshot['files'] = [];

    try {
      const scanDirectory = async (dir: string, relativePath: string = '') => {
        const items = await fs.promises.readdir(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const relativeFilePath = path.join(relativePath, item);
          const stat = await fs.promises.stat(fullPath);

          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            await scanDirectory(fullPath, relativeFilePath);
          } else if (stat.isFile() && this.shouldIncludeFile(item)) {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            files.push({
              path: relativeFilePath,
              content,
              language: this.detectLanguage(item),
              size: stat.size,
              lastModified: stat.mtime
            });
          }
        }
      };

      await scanDirectory(this.repoPath);
    } catch (error) {
      console.error('Error scanning project files:', error);
    }

    return files;
  }

  /**
   * Analyze changes to determine semantic commit type
   */
  private async analyzeChanges(changes: string[], context?: string): Promise<{
    type: CommitTemplate['type'];
    breaking: boolean;
    issues: string[];
  }> {
    // Simple heuristic-based analysis
    const fileTypes = changes.map(file => {
      const ext = path.extname(file).toLowerCase();
      if (['.md', '.txt', '.rst'].includes(ext)) return 'docs';
      if (['.test.', '.spec.'].some(pattern => file.includes(pattern))) return 'test';
      if (['.css', '.scss', '.less'].includes(ext)) return 'style';
      if (['package.json', 'tsconfig.json', 'webpack.config.'].some(pattern => file.includes(pattern))) return 'chore';
      return 'feat';
    });

    const hasBreaking = context?.toLowerCase().includes('breaking') || false;
    const hasFix = fileTypes.includes('test') || context?.toLowerCase().includes('fix');

    let type: CommitTemplate['type'] = 'feat';
    if (hasFix) type = 'fix';
    else if (fileTypes.includes('docs')) type = 'docs';
    else if (fileTypes.includes('style')) type = 'style';
    else if (fileTypes.includes('test')) type = 'test';

    return {
      type,
      breaking: hasBreaking,
      issues: [] // Would extract issue numbers from context
    };
  }

  /**
   * Generate commit description
   */
  private generateDescription(changes: string[], analysis: any): string {
    const fileCount = changes.length;
    const typeLabels: Record<string, string> = {
      feat: 'add',
      fix: 'fix',
      docs: 'update',
      style: 'improve',
      refactor: 'refactor',
      test: 'add',
      chore: 'update'
    };

    const action = typeLabels[analysis.type] || 'update';

    if (fileCount === 1) {
      return `${action} ${path.basename(changes[0])}`;
    } else {
      return `${action} ${fileCount} files`;
    }
  }

  /**
   * Format semantic commit message
   */
  private formatCommitMessage(template: CommitTemplate, context?: string): string {
    let message = `${template.type}`;

    if (template.scope) {
      message += `(${template.scope})`;
    }

    message += `: ${template.description}`;

    if (template.breaking) {
      message += '\n\nBREAKING CHANGE: ';
    }

    if (template.body) {
      message += `\n\n${template.body}`;
    }

    if (context && !template.body) {
      message += `\n\n${context}`;
    }

    if (template.issues && template.issues.length > 0) {
      message += `\n\nCloses: ${template.issues.join(', ')}`;
    }

    return message;
  }

  /**
   * Get default commit templates
   */
  private getDefaultCommitTemplates(): CommitTemplate[] {
    return [
      {
        type: 'feat',
        description: 'Add new feature',
        scope: 'feature'
      },
      {
        type: 'fix',
        description: 'Fix bug or issue',
        scope: 'bug'
      },
      {
        type: 'docs',
        description: 'Update documentation',
        scope: 'docs'
      },
      {
        type: 'style',
        description: 'Improve code style or formatting',
        scope: 'style'
      },
      {
        type: 'refactor',
        description: 'Refactor existing code',
        scope: 'refactor'
      },
      {
        type: 'test',
        description: 'Add or update tests',
        scope: 'test'
      },
      {
        type: 'chore',
        description: 'Maintenance or configuration changes',
        scope: 'config'
      }
    ];
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.json': 'json',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml'
    };

    return languageMap[ext] || 'plaintext';
  }

  /**
   * Check if file should be included in snapshots
   */
  private shouldIncludeFile(filename: string): boolean {
    const excludePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
      '*.log',
      '.DS_Store',
      'Thumbs.db'
    ];

    return !excludePatterns.some(pattern => filename.includes(pattern));
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      return await this.git.revparse(['--abbrev-ref', 'HEAD']);
    } catch (error) {
      return this.config.defaultBranch;
    }
  }

  /**
   * Check if repository exists and is valid
   */
  async isValidRepository(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get repository configuration
   */
  getConfig(): VersionControlConfig {
    return { ...this.config };
  }

  /**
   * Update repository configuration
   */
  updateConfig(newConfig: Partial<VersionControlConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}