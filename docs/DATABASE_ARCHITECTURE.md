# Database Architecture

## Overview

Vibe Coder uses **Supabase** (PostgreSQL) with **Prisma ORM** for a robust, scalable database layer supporting all features in the implementation roadmap.

## Tech Stack

- **Database**: PostgreSQL 15+ (via Supabase)
- **ORM**: Prisma 6.x
- **Vector Search**: pgvector extension
- **Hosting**: Supabase (free tier)

## Schema Overview

The database is organized into 7 main domains:

### 1. Users & Authentication
```
users
├── id (uuid)
├── email (unique)
├── name
├── githubId
└── timestamps
```

Stores user accounts and authentication data. Ready for GitHub OAuth integration.

### 2. Projects & Repositories
```
projects
├── id (uuid)
├── name
├── repositoryUrl
├── githubRepoId
├── defaultBranch
├── userId → users
└── timestamps
```

Tracks GitHub repositories and project metadata.

### 3. Tasks & Execution
```
tasks
├── id (uuid)
├── title
├── description
├── prompt (full user input)
├── status (enum: PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
├── priority (enum: LOW, MEDIUM, HIGH, CRITICAL)
├── parentTaskId → tasks (for subtask hierarchies)
├── result (json)
├── projectId → projects
├── userId → users
└── timestamps
```

Core task management with support for:
- Task decomposition (parent/child relationships)
- Status tracking
- Priority management
- Rich JSON results

### 4. Agents & Execution (Phase 2)
```
agents
├── id (uuid)
├── name
├── type (enum: PLANNER, DATABASE, BACKEND, FRONTEND, REVIEWER, GENERAL)
├── capabilities (array)
├── model
├── provider
├── systemPrompt
└── timestamps

executions
├── id (uuid)
├── taskId → tasks
├── agentId → agents
├── status (enum)
├── input/output (json)
├── tokensUsed
├── cost
├── durationMs
├── userId → users
└── timestamps
```

Multi-agent orchestration system:
- Specialized agent types
- Execution tracking
- Cost monitoring
- Performance metrics

### 5. Git & Version Control
```
commits
├── id (uuid)
├── sha (unique)
├── message
├── author
├── branch
├── filesChanged
├── additions/deletions
├── projectId → projects
├── taskId → tasks
└── timestamp
```

Tracks all commits made by Vibe Coder with full git metadata.

### 6. Code Review
```
reviews
├── id (uuid)
├── commitId → commits
├── status (enum: PENDING, APPROVED, CHANGES_REQUESTED, COMMENTED)
├── summary
├── qualityScore
├── securityScore
├── issues (json array)
├── suggestions (json array)
└── timestamps
```

Automated code review results with:
- Quality and security scoring
- Issue tracking
- Improvement suggestions

### 7. Semantic Search (Phase 3)
```
code_embeddings
├── id (uuid)
├── filePath
├── chunkIndex
├── content
├── embedding (vector[3072]) ← pgvector
├── language
├── fileType
├── metadata (json)
├── commitSha
├── projectId → projects
└── timestamps
```

Vector embeddings for semantic code search:
- 3072-dimensional vectors (OpenAI text-embedding-3-large)
- Chunked file content
- Metadata filtering
- Version tracking via commit SHA

## Relationships Diagram

```
users
  ├─→ projects
  │     ├─→ tasks
  │     │     ├─→ executions
  │     │     ├─→ commits
  │     │     │     └─→ reviews
  │     │     └─→ tasks (subtasks)
  │     └─→ code_embeddings
  ├─→ tasks
  └─→ executions

agents
  └─→ executions
```

## Indexes

Optimized for common queries:

```sql
-- User lookups
users(email), users(githubId)

-- Project queries
projects(userId), projects(githubRepoId)

-- Task queries
tasks(projectId), tasks(userId), tasks(status), tasks(parentTaskId)

-- Execution queries
executions(taskId), executions(agentId), executions(userId), executions(status)

-- Commit lookups
commits(projectId), commits(taskId), commits(sha)

-- Reviews
reviews(commitId)

-- Semantic search (Phase 3)
code_embeddings(projectId), code_embeddings(filePath)
code_embeddings.embedding (IVFFlat vector index for similarity search)
```

## Data Flow Examples

### Task Creation & Execution

```typescript
// 1. User creates task
const task = await prisma.task.create({
  data: {
    title: 'Add authentication',
    prompt: 'Implement JWT-based authentication...',
    status: 'PENDING',
    priority: 'HIGH',
    projectId: 'project-123',
    userId: 'user-456',
  },
});

// 2. Multi-agent execution (Phase 2)
const plannerExecution = await prisma.execution.create({
  data: {
    taskId: task.id,
    agentId: 'planner-agent-id',
    status: 'RUNNING',
    userId: 'user-456',
  },
});

// 3. Task decomposition
const subtasks = await prisma.task.createMany({
  data: [
    {
      title: 'Design user schema',
      parentTaskId: task.id,
      projectId: 'project-123',
      userId: 'user-456',
      // ... other fields
    },
    {
      title: 'Create JWT endpoints',
      parentTaskId: task.id,
      projectId: 'project-123',
      userId: 'user-456',
      // ... other fields
    },
  ],
});

// 4. Record results
await prisma.execution.update({
  where: { id: plannerExecution.id },
  data: {
    status: 'COMPLETED',
    output: { subtasks: subtasks.length },
    tokensUsed: 1500,
    cost: 0.045,
    completedAt: new Date(),
  },
});
```

### Semantic Code Search (Phase 3)

```typescript
// 1. Index codebase
const files = ['src/auth.ts', 'src/user.ts', 'src/middleware.ts'];

for (const file of files) {
  const content = await fs.readFile(file, 'utf-8');
  const chunks = chunkCode(content, 512); // 512 token chunks

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);

    await prisma.codeEmbedding.create({
      data: {
        filePath: file,
        chunkIndex: i,
        content: chunks[i],
        embedding: embedding,
        language: 'typescript',
        projectId: 'project-123',
      },
    });
  }
}

// 2. Semantic search
const queryEmbedding = await generateEmbedding('authentication logic');

const results = await prisma.$queryRaw`
  SELECT
    file_path,
    content,
    1 - (embedding <=> ${queryEmbedding}::vector) as similarity
  FROM code_embeddings
  WHERE project_id = 'project-123'
  ORDER BY embedding <=> ${queryEmbedding}::vector
  LIMIT 10
`;
```

### Commit & Review Flow

```typescript
// 1. Create commit record
const commit = await prisma.commit.create({
  data: {
    sha: 'abc123def456',
    message: 'Add authentication endpoints',
    author: 'Claude Code',
    authorEmail: 'code@anthropic.com',
    branch: 'feat/authentication',
    filesChanged: 3,
    additions: 150,
    deletions: 20,
    projectId: 'project-123',
    taskId: task.id,
  },
});

// 2. Run automated review
const reviewResult = await runCodeReview(commit.sha);

const review = await prisma.review.create({
  data: {
    commitId: commit.id,
    status: 'APPROVED',
    summary: 'Code quality is excellent. No security issues found.',
    qualityScore: 0.92,
    securityScore: 0.95,
    issues: [],
    suggestions: [
      {
        type: 'optimization',
        message: 'Consider caching JWT validation',
        file: 'src/middleware.ts',
        line: 45,
      },
    ],
  },
});
```

## Migrations

All schema changes are tracked via Prisma migrations:

```bash
# Create new migration
npm run prisma:migrate -- --name add_feature_x

# Apply migrations (production)
npm run prisma:migrate -- deploy

# Reset database (dev only)
npm run prisma:migrate -- reset
```

Migration files are stored in `backend/prisma/migrations/`.

## Performance Considerations

### Query Optimization

1. **Use indexes** for frequently queried fields
2. **Select only needed fields**:
   ```typescript
   await prisma.user.findMany({
     select: { id: true, email: true }, // Not: return all fields
   });
   ```
3. **Use pagination** for large result sets
4. **Include relations strategically**:
   ```typescript
   await prisma.project.findMany({
     include: {
       tasks: {
         where: { status: 'IN_PROGRESS' }, // Filter relations
         take: 10, // Limit relations
       },
     },
   });
   ```

### Vector Search Optimization

1. **Chunk size**: 512-1024 tokens optimal
2. **Index type**: IVFFlat for < 1M vectors
3. **Similarity metric**: Cosine for code embeddings
4. **Filter before search**: Use metadata filters to reduce search space

### Connection Pooling

Supabase provides built-in connection pooling:

```typescript
// DATABASE_URL uses pgbouncer (pooled)
// DIRECT_URL bypasses pooling (for migrations)
```

Prisma automatically uses the correct connection.

## Security

### Row-Level Security (RLS)

Supabase supports RLS policies. Enable in Phase 6 for multi-tenancy:

```sql
-- Example: Users can only see their own projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);
```

For now, we handle security in application code.

### Best Practices

1. ✅ **Never expose service_role key** client-side
2. ✅ **Use environment variables** for credentials
3. ✅ **Validate input** before database queries
4. ✅ **Use parameterized queries** (Prisma does this automatically)
5. ✅ **Audit logs** for sensitive operations

## Backup & Recovery

Supabase free tier includes:
- ✅ Daily backups (7 days retention)
- ✅ Point-in-time recovery (paid plans)

For production:
1. Upgrade to Pro plan ($25/month)
2. Enable point-in-time recovery
3. Set up automated exports for long-term archival

## Monitoring

Track these metrics:

1. **Database size** (free tier: 500MB limit)
2. **Connection count** (monitor for leaks)
3. **Query performance** (slow query log)
4. **Bandwidth usage** (free tier: 2GB/month)

Access via Supabase Dashboard > Reports

## Scaling Plan

As usage grows:

| Stage | Database Size | Action |
|-------|--------------|--------|
| MVP | < 100MB | Free tier ✅ |
| Beta | 100-500MB | Free tier ✅ |
| Launch | 500MB-8GB | Upgrade to Pro ($25/month) |
| Growth | 8GB+ | Custom plan or self-host |

## Future Enhancements

### Phase 2: Multi-Agent
- ✅ Already schema-ready
- Add job queue (Redis/Upstash)
- Implement agent coordination logic

### Phase 3: Semantic Search
- ✅ Already schema-ready
- Enable pgvector extension
- Build embedding generation pipeline
- Create search API

### Phase 6: Enterprise
- Enable Row-Level Security
- Add audit logging tables
- Implement multi-tenancy
- Set up replication

## Resources

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

---

**Next Steps:**
1. Set up Supabase project (see `QUICK_START_SUPABASE.md`)
2. Run migrations: `npm run db:setup`
3. Explore schema: `npm run prisma:studio`
4. Build features using Prisma Client
