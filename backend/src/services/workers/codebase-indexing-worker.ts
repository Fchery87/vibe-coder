import { Job } from 'bullmq';
import { CodebaseIndexingJob } from '../queue-manager';
import prisma from '../database';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Codebase Indexing Worker
 *
 * Generates embeddings for semantic search (Phase 3 feature)
 */
export async function codebaseIndexingWorker(
  job: Job<CodebaseIndexingJob>
): Promise<any> {
  const { projectId, userId, files, fullReindex } = job.data;

  console.log(`🔍 Indexing codebase for project ${projectId}`);

  try {
    // Step 1: Load project details
    await job.updateProgress(5);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Step 2: If full reindex, delete old embeddings
    if (fullReindex) {
      await job.updateProgress(10);
      await prisma.codeEmbedding.deleteMany({
        where: { projectId },
      });
      console.log('Deleted old embeddings for full reindex');
    }

    // Step 3: Get list of files to index
    await job.updateProgress(20);
    const filesToIndex = files || (await getAllProjectFiles(project));

    console.log(`Found ${filesToIndex.length} files to index`);

    // Step 4: Process files in batches
    const batchSize = 10;
    let processedCount = 0;

    for (let i = 0; i < filesToIndex.length; i += batchSize) {
      const batch = filesToIndex.slice(i, i + batchSize);

      await Promise.all(
        batch.map((file) => indexFile(projectId, file, job))
      );

      processedCount += batch.length;
      const progress = 20 + (processedCount / filesToIndex.length) * 70;
      await job.updateProgress(Math.floor(progress));
    }

    // Step 5: Return results
    const result = {
      projectId,
      filesIndexed: filesToIndex.length,
      fullReindex,
    };

    console.log(`✅ Indexed ${filesToIndex.length} files for project ${projectId}`);
    return result;
  } catch (error: any) {
    console.error(`❌ Codebase indexing failed for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Index a single file
 */
async function indexFile(
  projectId: string,
  filePath: string,
  job: Job
): Promise<void> {
  try {
    // Read file content
    const content = await readFileContent(filePath);

    // Skip if file is too large or binary
    if (!content || content.length > 100000) {
      return;
    }

    // Chunk the content (for large files)
    const chunks = chunkContent(content);

    // Generate embeddings for each chunk
    // TODO: Integrate with OpenAI or Cohere embeddings API
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);

      // Save to database using raw SQL for pgvector compatibility
      // Note: Prisma doesn't support pgvector's Unsupported type directly
      await prisma.$executeRaw`
        INSERT INTO code_embeddings (
          id, project_id, file_path, chunk_index, content,
          embedding, language, file_type, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${projectId}::uuid,
          ${filePath},
          ${i},
          ${chunks[i]},
          ${JSON.stringify(embedding)}::vector,
          ${detectLanguage(filePath)},
          ${detectFileType(filePath)},
          NOW(),
          NOW()
        )
        ON CONFLICT (project_id, file_path, chunk_index)
        DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          language = EXCLUDED.language,
          file_type = EXCLUDED.file_type,
          updated_at = NOW()
      `;
    }
  } catch (error: any) {
    console.error(`Error indexing file ${filePath}:`, error.message);
    // Don't throw - continue with other files
  }
}

/**
 * Get all project files
 */
async function getAllProjectFiles(project: any): Promise<string[]> {
  // TODO: Implement file discovery
  // Options:
  // 1. Clone from Git repository
  // 2. Use GitHub API to list files
  // 3. Read from local filesystem if CLI mode

  return [];
}

/**
 * Read file content
 */
async function readFileContent(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    return null;
  }
}

/**
 * Chunk content into smaller pieces
 */
function chunkContent(content: string, maxChunkSize: number = 512): string[] {
  const chunks: string[] = [];
  const lines = content.split('\n');

  let currentChunk = '';
  for (const line of lines) {
    if (currentChunk.length + line.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // TODO: Integrate with embedding API
  // Example using OpenAI:
  //
  // import OpenAI from 'openai';
  //
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  //
  // const response = await openai.embeddings.create({
  //   model: 'text-embedding-3-large',
  //   input: text,
  // });
  //
  // return response.data[0].embedding;

  // Placeholder: Return zero vector (3072 dimensions for OpenAI)
  return new Array(3072).fill(0);
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'c',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
  };

  return languageMap[ext] || 'unknown';
}

/**
 * Detect file type (component, service, test, etc.)
 */
function detectFileType(filePath: string): string {
  const filename = path.basename(filePath).toLowerCase();

  if (filename.includes('.test.') || filename.includes('.spec.')) {
    return 'test';
  }
  if (filename.includes('component')) {
    return 'component';
  }
  if (filename.includes('service')) {
    return 'service';
  }
  if (filename.includes('controller')) {
    return 'controller';
  }
  if (filename.includes('model')) {
    return 'model';
  }
  if (filename.includes('util') || filename.includes('helper')) {
    return 'utility';
  }

  return 'unknown';
}
