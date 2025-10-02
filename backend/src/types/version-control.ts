export interface GitCommit {
  id: string;
  hash: string;
  message: string;
  author: string;
  email: string;
  timestamp: Date;
  files: GitFileChange[];
  parents: string[];
  branch: string;
  tags?: string[];
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  previousPath?: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  commitHash: string;
  upstream?: string;
}

export interface GitTag {
  name: string;
  message?: string;
  commitHash: string;
  timestamp: Date;
  author: string;
}

export interface GitStatus {
  isClean: boolean;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  branch: string;
  ahead: number;
  behind: number;
}

export interface SemanticCommitRule {
  type: string;
  description: string;
  scope?: string;
  body?: string;
  breaking?: boolean;
  issues?: string[];
}

export interface CommitTemplate {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  scope?: string;
  description: string;
  body?: string;
  breaking?: boolean;
  issues?: string[];
}

export interface ProjectSnapshot {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  commitHash: string;
  files: ProjectFile[];
  metadata: {
    language: string;
    framework: string;
    dependencies: Record<string, string>;
    fileCount: number;
    totalSize: number;
  };
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: Date;
}

export interface VersionControlConfig {
  repositoryPath: string;
  author: {
    name: string;
    email: string;
  };
  defaultBranch: string;
  autoCommit: boolean;
  semanticCommits: boolean;
  commitTemplates: CommitTemplate[];
  backupOnMajorChanges: boolean;
}

export interface CommitAnalysis {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  scope?: string;
  breaking: boolean;
  issues: string[];
  confidence: number;
  suggestions: string[];
}

export interface DiffAnalysis {
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
    complexity: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
    summary: string;
  }>;
  overall: {
    totalAdditions: number;
    totalDeletions: number;
    complexity: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
    summary: string;
  };
}