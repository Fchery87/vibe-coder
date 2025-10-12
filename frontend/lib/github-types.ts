export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    avatar_url: string;
    type: 'User' | 'Organization';
  };
  repository_selection: 'all' | 'selected';
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  description: string | null;
  default_branch: string;
  updated_at: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubCompareResponse {
  files: GitHubFile[];
  base_commit: {
    sha: string;
    commit: {
      message: string;
      author: {
        name: string;
        email: string;
        date: string;
      };
    };
  };
  commits: Array<{
    sha: string;
    commit: {
      message: string;
    };
  }>;
}

export interface GitHubFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  path?: string;
  line?: number;
  commit_id?: string;
  position?: number;
  original_position?: number;
  diff_hunk?: string;
  pull_request_review_id?: number;
}

export interface WorkspaceState {
  owner: string;
  repo: string;
  installationId: number;
  branch: string;
  baseBranch: string;
  headSha?: string;
  prNumber?: number;
}

export interface WebhookEvent {
  type: 'push' | 'pull_request' | 'issue_comment' | 'pull_request_review_comment' | 'check_suite' | 'check_run';
  action?: string;
  data: any;
  timestamp: string;
}

