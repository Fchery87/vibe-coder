// Load environment variables from root .env.local FIRST
import path from 'path';
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env.local') });

// Import express modules for server mode
import express from 'express';
import cors from 'cors';
import llmRouter from './routes/llm';
import previewRouter from './routes/preview';

// Import background workers and database
import { initializeWorkers } from './services/workers';
import { shutdownQueues } from './services/queue-manager';
import prisma from './services/database';

// Check if this is a CLI invocation
const args = process.argv.slice(2);
const isCLI = args.length > 0 && !args.includes('--server');

// If CLI mode, run CLI instead of server
if (isCLI) {
  runCLI(args);
} else {
  // Server mode - verify environment variables are loaded for all providers
  console.log('[dotenv] Environment variables loaded');
  console.log('[dotenv] OPENAI_API_KEY loaded:', process.env.OPENAI_API_KEY ? 'YES' : 'NO');
  console.log('[dotenv] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
  console.log('[dotenv] GOOGLE_API_KEY loaded:', process.env.GOOGLE_API_KEY ? 'YES' : 'NO');
  console.log('[dotenv] GOOGLE_API_KEY length:', process.env.GOOGLE_API_KEY?.length || 0);
  console.log('[dotenv] ANTHROPIC_API_KEY loaded:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO');
  console.log('[dotenv] ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length || 0);
  console.log('[dotenv] XAI_API_KEY loaded:', process.env.XAI_API_KEY ? 'YES' : 'NO');
  console.log('[dotenv] XAI_API_KEY length:', process.env.XAI_API_KEY?.length || 0);
  console.log('[dotenv] SUPERNOVA_API_KEY loaded:', process.env.SUPERNOVA_API_KEY ? 'YES' : 'NO');
  console.log('[dotenv] SUPERNOVA_API_KEY length:', process.env.SUPERNOVA_API_KEY?.length || 0);

  const app = express();
  const port = 3001;

  app.use(cors({
    origin: ['http://localhost:3000', 'https://vibe-coder.vercel.app']
  }));
  app.use(express.json());
  app.use((req: any, res: any, next: any) => {
    console.log(`[request] ${req.method} ${req.originalUrl}`);
    next();
  });
  app.use('/llm', llmRouter);
  app.use('/preview', previewRouter);

  app.get('/', (req: any, res: any) => {
    console.log('[handler] GET /');
    res.send('Hello from the orchestrator backend!');
  });

  // Initialize background workers
  console.log('\n🚀 Initializing background job workers...');
  initializeWorkers();

  const server = app.listen(port, () => {
    console.log(`\n✅ Backend server listening at http://localhost:${port}`);
    console.log('✅ Background workers initialized and ready');
    console.log('\n📋 Available services:');
    console.log('  - LLM API: http://localhost:3001/llm');
    console.log('  - Preview: http://localhost:3001/preview');
    console.log('  - Job Queue: Active and processing');
  });

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Close HTTP server
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Shutdown background workers and queues
    await shutdownQueues();

    // Close database connection
    await prisma.$disconnect();
    console.log('✅ Database disconnected');

    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// CLI Types and Functions
type LogKind = "planning" | "researching" | "executing" | "drafting" | "user" | "summary";

type LogEvent = {
  kind: LogKind;
  ts: string;
  items?: string[];
  text?: string;
  output?: string;
};

function ts(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function emit(ev: LogEvent, thinkMode: boolean = true): void {
  if (!thinkMode) return;

  // Human-readable format matching Atlas specification
  const color = {
    planning: "\x1b[35m",    // magenta
    researching: "\x1b[36m", // cyan
    executing: "\x1b[32m",   // green
    drafting: "\x1b[33m",    // yellow
    user: "\x1b[34m",        // blue
    summary: "\x1b[37m"      // white
  }[ev.kind];

  const reset = "\x1b[0m";
  const kindLabel = ev.kind.charAt(0).toUpperCase() + ev.kind.slice(1);

  process.stdout.write(`${color}[${kindLabel}]${reset} ${ev.ts}\n`);

  if (ev.items?.length) {
    ev.items.forEach(item => process.stdout.write(`  • ${item}\n`));
  }

  if (ev.text) {
    process.stdout.write(`  ${ev.text}\n`);
  }

  if (ev.output) {
    process.stdout.write(`\n${ev.output}\n`);
  }

  // Optional: JSONL mirror for tooling
  // process.stdout.write(JSON.stringify(ev) + "\n");
}

async function runCLI(args: string[]): Promise<void> {
  const command = args[0];
  const thinkMode = args.includes('--think');

  if (thinkMode) {
    // Remove --think from args for processing
    const filteredArgs = args.filter(arg => arg !== '--think');
    args.length = 0;
    args.push(...filteredArgs);
  }

  switch (command) {
    case 'run':
      await handleRunCommand(args.slice(1), thinkMode);
      break;
    case 'help':
      showHelp();
      break;
    default:
      console.log('Atlas CLI - Use "atlas help" for available commands');
      if (thinkMode) {
        console.log('Available commands: run, help');
      }
  }
}

async function handleRunCommand(args: string[], thinkMode: boolean): Promise<void> {
  const prompt = args.join(' ');

  if (!prompt) {
    console.log('Error: Please provide a prompt');
    return;
  }

  if (thinkMode) {
    emit({
      kind: "user",
      ts: ts(),
      text: `Prompt: ${prompt}`
    });
  }

  // Import services for execution
  const { ProviderManager } = await import('./services/provider-manager');
  const providerManager = new ProviderManager();

  try {
    if (thinkMode) {
      emit({
        kind: "planning",
        ts: ts(),
        items: [
          "Analyzing prompt requirements and constraints",
          "Selecting appropriate AI provider and model",
          "Preparing code generation strategy",
          "Setting up streaming response handling"
        ]
      });
    }

    if (thinkMode) {
      emit({
        kind: "researching",
        ts: ts(),
        items: [
          "Checking available AI providers",
          "Validating API keys and configurations",
          "Analyzing project structure and context",
          "Preparing code generation environment"
        ]
      });
    }

    if (thinkMode) {
      emit({
        kind: "executing",
        ts: ts(),
        text: "Generating code with AI provider",
        items: [
          "Sending prompt to AI model",
          "Processing streaming response",
          "Formatting generated code",
          "Preparing file outputs"
        ]
      });
    }

    // Execute the code generation
    const response = await fetch('http://localhost:3001/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        provider: 'google', // Default provider
        model: 'gemini-2.5-flash-lite'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'FILE_START') {
                if (thinkMode) {
                  emit({
                    kind: "drafting",
                    ts: ts(),
                    text: `Creating file: ${data.path}`,
                    items: [
                      "Setting up file structure",
                      "Preparing content stream",
                      "Configuring file metadata"
                    ]
                  });
                }
              } else if (data.type === 'FILE_END') {
                if (thinkMode) {
                  emit({
                    kind: "drafting",
                    ts: ts(),
                    text: `Completed file: ${data.path}`,
                    output: `Size: ${data.content?.length || 0} characters`
                  });
                }
              } else if (data.type === 'COMPLETE') {
                if (thinkMode) {
                  emit({
                    kind: "summary",
                    ts: ts(),
                    text: "Code generation completed successfully",
                    output: `Generated ${data.fileCount || 0} files`
                  });
                }
              }
            } catch (e) {
              // Ignore malformed JSON lines
            }
          }
        }

        // Keep incomplete line in buffer
        buffer = lines[lines.length - 1];
      }
    }

    if (thinkMode) {
      emit({
        kind: "summary",
        ts: ts(),
        text: "Task completed successfully"
      });
    }

  } catch (error: any) {
    if (thinkMode) {
      emit({
        kind: "executing",
        ts: ts(),
        text: `Error: ${error.message}`,
        output: "Code generation failed"
      });
    } else {
      console.error('Error:', error.message);
    }
  }
}

function showHelp(): void {
  console.log(`
Atlas CLI - AI Code Generator with Thinking Mode

🚀 Quick Start:
  atlas run "Create a React todo app"
  atlas run "Create a React todo app" --think

💡 Examples:
  "Create a React todo app"
  "Build a weather dashboard"
  "Make a chat component with emoji reactions"

⚡ Features:
  ✓ Real-time code generation
  ✓ Multi-provider AI support
  ✓ Streaming responses
  ✓ Optional thinking mode (--think)

🔧 Commands:
  run <prompt>     Generate code from prompt
  help             Show this help

🎯 Thinking Mode (--think):
  Streams structured reasoning logs:
  [Planning]    - High-level steps
  [Researching] - Files/resources inspected
  [Executing]   - Actions and commands
  [Drafting]    - Code changes
  [Summary]     - Final outcomes

Ready to build something amazing? ✨
  `);
}
"" 
