/**
 * Database Usage Examples
 *
 * This file demonstrates how to use Prisma with Supabase
 * for common operations in Vibe Coder.
 *
 * Run examples:
 * npx ts-node src/examples/database-usage-examples.ts
 */

import prisma from '../services/database';

// ============================================
// 1. User Management
// ============================================

async function createUser(email: string, name: string) {
  const user = await prisma.user.create({
    data: {
      email,
      name,
    },
  });
  console.log('Created user:', user);
  return user;
}

async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      projects: true,
      tasks: {
        where: { status: 'IN_PROGRESS' },
        take: 5,
      },
    },
  });
  return user;
}

// ============================================
// 2. Project Management
// ============================================

async function createProject(userId: string, repoUrl: string) {
  const project = await prisma.project.create({
    data: {
      name: 'My Awesome Project',
      repositoryUrl: repoUrl,
      githubRepoId: 'github-123',
      defaultBranch: 'main',
      userId,
    },
  });
  console.log('Created project:', project);
  return project;
}

async function getUserProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      _count: {
        select: {
          tasks: true,
          commits: true,
        },
      },
    },
  });
  return projects;
}

// ============================================
// 3. Task Management
// ============================================

async function createTask(
  userId: string,
  projectId: string,
  title: string,
  prompt: string
) {
  const task = await prisma.task.create({
    data: {
      title,
      description: `Generated from prompt: ${prompt.substring(0, 100)}...`,
      prompt,
      status: 'PENDING',
      priority: 'MEDIUM',
      userId,
      projectId,
    },
    include: {
      project: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  console.log('Created task:', task);
  return task;
}

async function createTaskWithSubtasks(
  userId: string,
  projectId: string,
  mainTask: { title: string; prompt: string },
  subtasks: Array<{ title: string; prompt: string }>
) {
  // Create parent task
  const parent = await prisma.task.create({
    data: {
      title: mainTask.title,
      prompt: mainTask.prompt,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      userId,
      projectId,
    },
  });

  // Create subtasks
  const children = await prisma.task.createMany({
    data: subtasks.map((subtask) => ({
      title: subtask.title,
      prompt: subtask.prompt,
      status: 'PENDING',
      priority: 'MEDIUM',
      userId,
      projectId,
      parentTaskId: parent.id,
    })),
  });

  console.log(`Created parent task with ${children.count} subtasks`);

  // Return complete hierarchy
  return prisma.task.findUnique({
    where: { id: parent.id },
    include: {
      subtasks: true,
    },
  });
}

async function updateTaskStatus(taskId: string, status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED') {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      ...(status === 'COMPLETED' && { completedAt: new Date() }),
    },
  });
  return task;
}

async function getActiveTasksForUser(userId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: {
        in: ['PENDING', 'IN_PROGRESS'],
      },
    },
    include: {
      project: {
        select: {
          name: true,
        },
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });
  return tasks;
}

// ============================================
// 4. Agent & Execution Tracking (Phase 2)
// ============================================

async function createAgent(type: 'PLANNER' | 'BACKEND' | 'FRONTEND' | 'REVIEWER') {
  const agent = await prisma.agent.create({
    data: {
      name: `${type} Agent`,
      type,
      description: `Specialized agent for ${type.toLowerCase()} tasks`,
      capabilities: getCapabilitiesForType(type),
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      systemPrompt: `You are a specialized ${type.toLowerCase()} agent...`,
      isActive: true,
    },
  });
  return agent;
}

function getCapabilitiesForType(type: string): string[] {
  const capabilities: Record<string, string[]> = {
    PLANNER: ['task-decomposition', 'planning', 'coordination'],
    BACKEND: ['api-design', 'database-schema', 'business-logic'],
    FRONTEND: ['ui-components', 'styling', 'user-interaction'],
    REVIEWER: ['code-review', 'security-analysis', 'quality-check'],
  };
  return capabilities[type] || [];
}

async function trackExecution(
  taskId: string,
  agentId: string,
  userId: string
) {
  // Start execution
  const execution = await prisma.execution.create({
    data: {
      taskId,
      agentId,
      userId,
      status: 'RUNNING',
      input: {
        timestamp: new Date().toISOString(),
      },
    },
  });

  // Simulate work...
  const startTime = Date.now();

  // Update with results
  const updated = await prisma.execution.update({
    where: { id: execution.id },
    data: {
      status: 'COMPLETED',
      output: {
        result: 'Task completed successfully',
      },
      tokensUsed: 1500,
      cost: 0.045, // $0.045
      durationMs: Date.now() - startTime,
      completedAt: new Date(),
    },
  });

  return updated;
}

async function getExecutionMetrics(userId: string) {
  const metrics = await prisma.execution.groupBy({
    by: ['status'],
    where: { userId },
    _count: {
      id: true,
    },
    _sum: {
      tokensUsed: true,
      cost: true,
      durationMs: true,
    },
  });

  return metrics;
}

// ============================================
// 5. Git & Commit Tracking
// ============================================

async function recordCommit(
  projectId: string,
  taskId: string,
  commitData: {
    sha: string;
    message: string;
    author: string;
    branch: string;
    filesChanged: number;
    additions: number;
    deletions: number;
  }
) {
  const commit = await prisma.commit.create({
    data: {
      ...commitData,
      authorEmail: 'code@anthropic.com',
      projectId,
      taskId,
    },
  });
  return commit;
}

async function createCodeReview(commitId: string) {
  const review = await prisma.review.create({
    data: {
      commitId,
      status: 'APPROVED',
      summary: 'Code review completed. No major issues found.',
      qualityScore: 0.92,
      securityScore: 0.95,
      issues: [
        {
          type: 'warning',
          severity: 'low',
          message: 'Consider adding error handling',
          file: 'src/api.ts',
          line: 42,
        },
      ],
      suggestions: [
        {
          type: 'optimization',
          message: 'Use async/await instead of promises',
          file: 'src/database.ts',
          line: 15,
        },
      ],
    },
  });
  return review;
}

// ============================================
// 6. Complex Queries
// ============================================

async function getDashboardData(userId: string) {
  const [user, taskStats, recentActivity] = await Promise.all([
    // User profile with counts
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            projects: true,
            tasks: true,
            executions: true,
          },
        },
      },
    }),

    // Task statistics
    prisma.task.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        id: true,
      },
    }),

    // Recent activity
    prisma.task.findMany({
      where: { userId },
      include: {
        project: {
          select: { name: true },
        },
        executions: {
          select: {
            status: true,
            cost: true,
            completedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    user,
    taskStats,
    recentActivity,
  };
}

async function getProjectInsights(projectId: string) {
  const [project, topContributors, codeStats] = await Promise.all([
    // Project details
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            tasks: true,
            commits: true,
            codeEmbeddings: true,
          },
        },
      },
    }),

    // Top contributors (by commits)
    prisma.commit.groupBy({
      by: ['author'],
      where: { projectId },
      _count: {
        id: true,
      },
      _sum: {
        additions: true,
        deletions: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    }),

    // Code quality over time
    prisma.review.findMany({
      where: {
        commit: {
          projectId,
        },
      },
      select: {
        qualityScore: true,
        securityScore: true,
        createdAt: true,
        commit: {
          select: {
            sha: true,
            message: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return {
    project,
    topContributors,
    codeStats,
  };
}

// ============================================
// 7. Transactions (for complex operations)
// ============================================

async function completeTaskWithCommit(
  taskId: string,
  commitData: {
    sha: string;
    message: string;
    author: string;
    branch: string;
    filesChanged: number;
    additions: number;
    deletions: number;
  }
) {
  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Update task
    const task = await tx.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Create commit
    const commit = await tx.commit.create({
      data: {
        ...commitData,
        authorEmail: 'code@anthropic.com',
        projectId: task.projectId,
        taskId: task.id,
      },
    });

    // Create review
    const review = await tx.review.create({
      data: {
        commitId: commit.id,
        status: 'PENDING',
        summary: 'Automated review in progress...',
      },
    });

    return { task, commit, review };
  });

  console.log('Transaction completed:', result);
  return result;
}

// ============================================
// 8. Main Example Runner
// ============================================

async function runExamples() {
  try {
    console.log('🔄 Running database examples...\n');

    // 1. Create user
    console.log('1. Creating user...');
    const user = await createUser(
      'demo@vibecoder.com',
      'Demo User'
    );
    console.log('✅ User created:', user.id, '\n');

    // 2. Create project
    console.log('2. Creating project...');
    const project = await createProject(
      user.id,
      'https://github.com/demo/repo'
    );
    console.log('✅ Project created:', project.id, '\n');

    // 3. Create task with subtasks
    console.log('3. Creating task with subtasks...');
    const taskHierarchy = await createTaskWithSubtasks(
      user.id,
      project.id,
      {
        title: 'Implement authentication',
        prompt: 'Build JWT-based authentication system',
      },
      [
        { title: 'Design user schema', prompt: 'Create user table with fields' },
        { title: 'Create auth endpoints', prompt: 'Build login/register APIs' },
        { title: 'Add JWT middleware', prompt: 'Implement token validation' },
      ]
    );
    console.log('✅ Task hierarchy created:', taskHierarchy?.id, '\n');

    // 4. Track execution
    console.log('4. Creating agent and tracking execution...');
    const agent = await createAgent('BACKEND');
    const execution = await trackExecution(
      taskHierarchy!.id,
      agent.id,
      user.id
    );
    console.log('✅ Execution tracked:', execution.id, '\n');

    // 5. Get dashboard data
    console.log('5. Fetching dashboard data...');
    const dashboard = await getDashboardData(user.id);
    console.log('✅ Dashboard data:', {
      projects: dashboard.user?._count.projects,
      tasks: dashboard.user?._count.tasks,
      executions: dashboard.user?._count.executions,
      taskStats: dashboard.taskStats,
    });
    console.log('\n');

    console.log('🎉 All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}

// Export functions for use in other files
export {
  createUser,
  findUserByEmail,
  createProject,
  getUserProjects,
  createTask,
  createTaskWithSubtasks,
  updateTaskStatus,
  getActiveTasksForUser,
  createAgent,
  trackExecution,
  getExecutionMetrics,
  recordCommit,
  createCodeReview,
  getDashboardData,
  getProjectInsights,
  completeTaskWithCommit,
};
