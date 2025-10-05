import { NextRequest } from 'next/server';

interface StreamMessage {
  type: 'FILE_OPEN' | 'APPEND' | 'FILE_CLOSE' | 'COMPLETE' | 'ERROR';
  path?: string;
  text?: string;
  message?: string;
}

class MockStreamingGenerator {
  private files: Array<{ path: string; content: string }> = [];
  private currentFileIndex = 0;

  constructor(private prompt: string) {
    this.generateMockFiles();
  }

  private generateMockFiles() {
    // Generate different file types based on prompt
    if (this.prompt.toLowerCase().includes('react')) {
      this.files = [
        {
          path: 'src/components/TodoApp.jsx',
          content: `import React, { useState } from 'react';

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: inputValue,
        completed: false
      }]);
      setInputValue('');
    }
  };

  return (
    <div className="todo-container">
      <h1>Todo Application</h1>
      <div className="input-section">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter a todo item..."
        />
        <button onClick={addTodo}>Add Todo</button>
      </div>
      <ul className="todo-list">
        {todos.map(todo => (
          <li key={todo.id}>
            <span>{todo.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoApp;`
        },
        {
          path: 'src/App.jsx',
          content: `import React from 'react';
import TodoApp from './components/TodoApp';

function App() {
  return (
    <div className="App">
      <TodoApp />
    </div>
  );
}

export default App;`
        }
      ];
    } else if (this.prompt.toLowerCase().includes('ping pong') || this.prompt.toLowerCase().includes('pong')) {
      this.files = [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Ping Pong Game</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Ping Pong Game</h1>
        <canvas id="gameCanvas" width="800" height="400"></canvas>
        <div class="controls">
            <button id="startBtn">Start Game</button>
            <div class="score">Score: <span id="score">0</span></div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          path: 'styles.css',
          content: `/* Game Styles */
.container {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    font-family: Arial, sans-serif;
}

#gameCanvas {
    border: 2px solid #333;
    background: #000;
    margin: 20px 0;
}

.controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
}

button {
    padding: 10px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.score {
    font-size: 18px;
    font-weight: bold;
}`
        },
        {
          path: 'script.js',
          content: `// Simple Ping Pong Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const scoreElement = document.getElementById('score');

// Game state
let gameRunning = false;
let score = 0;

// Simple game loop
function gameLoop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw game elements
    ctx.fillStyle = '#fff';
    ctx.fillRect(10, canvas.height / 2 - 50, 10, 100); // Left paddle
    ctx.fillRect(canvas.width - 20, canvas.height / 2 - 50, 10, 100); // Right paddle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, Math.PI * 2);
    ctx.fill(); // Ball

    requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', () => {
    gameRunning = !gameRunning;
    startBtn.textContent = gameRunning ? 'Stop Game' : 'Start Game';

    if (gameRunning) {
        gameLoop();
    }
});`
        }
      ];
    } else {
      // Default multi-file generation
      this.files = [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Generated App</h1>
        <p>This application was generated based on your request: ${this.prompt}</p>

        <div class="content">
            <button onclick="showMessage()">Click me!</button>
            <p id="message" class="hidden">Hello from your generated app! 🚀</p>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`
        },
        {
          path: 'styles.css',
          content: `/* Generated App Styles */
.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
    color: #333;
    margin-bottom: 20px;
    font-size: 2.5rem;
}

.content {
    margin-top: 40px;
}

button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s ease;
}

button:hover {
    transform: translateY(-2px);
}

.hidden {
    display: none;
}

#message {
    margin-top: 20px;
    padding: 15px;
    background: #f0f8ff;
    border-radius: 8px;
    color: #333;
    font-size: 18px;
}`
        },
        {
          path: 'script.js',
          content: `// Generated App JavaScript
function showMessage() {
    const message = document.getElementById('message');
    message.classList.remove('hidden');

    // Animate the message
    message.style.animation = 'fadeInUp 0.5s ease-out';
}

// Add some interactivity
document.addEventListener('DOMContentLoaded', function() {
    console.log('Generated app loaded successfully!');

    // Add click animation to button
    const button = document.querySelector('button');
    button.addEventListener('click', function() {
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
    });
});

// CSS Animation (injected via JavaScript)
const style = document.createElement('style');
style.textContent = /*css*/\`
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
\`;
document.head.appendChild(style);`
        }
      ];
    }
  }

  async *generateStream(): AsyncGenerator<StreamMessage> {
    for (let i = 0; i < this.files.length; i++) {
      const file = this.files[i];

      // Send FILE_OPEN event
      yield { type: 'FILE_OPEN', path: file.path };

      // Stream the file content line by line with small delays
      const lines = file.content.split('\n');

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        // Add the line to the file content
        yield {
          type: 'APPEND',
          path: file.path,
          text: line + (lineIndex < lines.length - 1 ? '\n' : '')
        };

        // Small delay to create streaming effect (50-150ms per line)
        const delay = Math.random() * 100 + 50;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Send FILE_CLOSE event
      yield { type: 'FILE_CLOSE', path: file.path };

      // Small pause between files
      if (i < this.files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Send COMPLETE event
    yield { type: 'COMPLETE' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response('Prompt is required', { status: 400 });
    }

    // Create mock generator
    const generator = new MockStreamingGenerator(prompt);

    // Return SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const message of generator.generateStream()) {
            // Format message for SSE
            let data = '';
            switch (message.type) {
              case 'FILE_OPEN':
                data = `FILE_OPEN ${message.path}`;
                break;
              case 'APPEND':
                data = `APPEND ${message.text}`;
                break;
              case 'FILE_CLOSE':
                data = `FILE_CLOSE ${message.path}`;
                break;
              case 'COMPLETE':
                data = 'COMPLETE';
                break;
              case 'ERROR':
                data = `ERROR ${message.message}`;
                break;
            }

            controller.enqueue(`data: ${data}\n\n`);
          }
        } catch (error: any) {
          controller.enqueue(`data: ERROR ${error?.message || 'Unknown error'}\n\n`);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return new Response(`Error: ${error?.message || 'Unknown error'}`, { status: 500 });
  }
}