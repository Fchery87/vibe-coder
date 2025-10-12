/**
 * Jira REST API Client
 * Provides methods for interacting with Jira Cloud API
 * Documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
 */

interface JiraConfig {
  domain: string; // e.g., 'yourcompany.atlassian.net'
  email: string; // User email
  apiToken: string; // API token from Jira
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      statusCategory: {
        key: string;
        colorName: string;
      };
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    priority?: {
      name: string;
      iconUrl: string;
    };
    assignee?: {
      displayName: string;
      avatarUrls: {
        '48x48': string;
      };
    };
    reporter?: {
      displayName: string;
      avatarUrls: {
        '48x48': string;
      };
    };
    created: string;
    updated: string;
    project: {
      key: string;
      name: string;
    };
  };
}

interface JiraComment {
  id: string;
  author: {
    displayName: string;
    avatarUrls: {
      '48x48': string;
    };
  };
  body: string;
  created: string;
  updated: string;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrls: {
    '48x48': string;
  };
}

interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
    statusCategory: {
      key: string;
    };
  };
}

export class JiraClient {
  private config: JiraConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: JiraConfig) {
    this.config = config;
    this.baseUrl = `https://${config.domain}/rest/api/3`;
    // Basic auth with email:apiToken base64 encoded
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`;
  }

  /**
   * Make authenticated request to Jira API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all accessible projects
   */
  async getProjects(): Promise<JiraProject[]> {
    return this.request<JiraProject[]>('/project');
  }

  /**
   * Search for issues using JQL
   */
  async searchIssues(jql: string, maxResults: number = 50): Promise<{ issues: JiraIssue[]; total: number }> {
    const params = new URLSearchParams({
      jql,
      maxResults: maxResults.toString(),
      fields: 'summary,description,status,issuetype,priority,assignee,reporter,created,updated,project',
    });

    return this.request<{ issues: JiraIssue[]; total: number }>(`/search?${params}`);
  }

  /**
   * Get issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.request<JiraIssue>(`/issue/${issueKey}`);
  }

  /**
   * Create new issue
   */
  async createIssue(data: {
    projectKey: string;
    summary: string;
    description?: string;
    issueType?: string;
    priority?: string;
  }): Promise<JiraIssue> {
    const payload = {
      fields: {
        project: {
          key: data.projectKey,
        },
        summary: data.summary,
        description: data.description
          ? {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: data.description,
                    },
                  ],
                },
              ],
            }
          : undefined,
        issuetype: {
          name: data.issueType || 'Task',
        },
        priority: data.priority
          ? {
              name: data.priority,
            }
          : undefined,
      },
    };

    const result = await this.request<{ id: string; key: string }>('/issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Fetch the created issue to return full details
    return this.getIssue(result.key);
  }

  /**
   * Update issue
   */
  async updateIssue(
    issueKey: string,
    updates: {
      summary?: string;
      description?: string;
      assignee?: string;
    }
  ): Promise<void> {
    const payload: any = {
      fields: {},
    };

    if (updates.summary) {
      payload.fields.summary = updates.summary;
    }

    if (updates.description) {
      payload.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: updates.description,
              },
            ],
          },
        ],
      };
    }

    if (updates.assignee) {
      payload.fields.assignee = {
        id: updates.assignee,
      };
    }

    await this.request(`/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const result = await this.request<{ transitions: JiraTransition[] }>(`/issue/${issueKey}/transitions`);
    return result.transitions;
  }

  /**
   * Transition issue to new status
   */
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.request(`/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify({
        transition: {
          id: transitionId,
        },
      }),
    });
  }

  /**
   * Get comments for an issue
   */
  async getComments(issueKey: string): Promise<JiraComment[]> {
    const result = await this.request<{ comments: JiraComment[] }>(`/issue/${issueKey}/comment`);
    return result.comments;
  }

  /**
   * Add comment to issue
   */
  async addComment(issueKey: string, body: string): Promise<JiraComment> {
    const payload = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: body,
              },
            ],
          },
        ],
      },
    };

    return this.request<JiraComment>(`/issue/${issueKey}/comment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Link issue to external resource (e.g., PR)
   */
  async addRemoteLink(
    issueKey: string,
    link: {
      url: string;
      title: string;
      summary?: string;
      icon?: string;
    }
  ): Promise<void> {
    const payload = {
      object: {
        url: link.url,
        title: link.title,
        summary: link.summary,
        icon: link.icon
          ? {
              url16x16: link.icon,
            }
          : undefined,
      },
    };

    await this.request(`/issue/${issueKey}/remotelink`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get remote links for an issue
   */
  async getRemoteLinks(issueKey: string): Promise<any[]> {
    return this.request<any[]>(`/issue/${issueKey}/remotelink`);
  }
}

/**
 * Create Jira client from environment variables
 */
export function createJiraClient(): JiraClient | null {
  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!domain || !email || !apiToken) {
    return null;
  }

  return new JiraClient({ domain, email, apiToken });
}

export type { JiraIssue, JiraComment, JiraProject, JiraTransition, JiraConfig };
