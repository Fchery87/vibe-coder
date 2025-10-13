import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import prettier from 'prettier';
import babelPlugin from 'prettier/plugins/babel';
import estreePlugin from 'prettier/plugins/estree';
import htmlPlugin from 'prettier/plugins/html';
import markdownPlugin from 'prettier/plugins/markdown';
import postcssPlugin from 'prettier/plugins/postcss';
import typescriptPlugin from 'prettier/plugins/typescript';
import yamlPlugin from 'prettier/plugins/yaml';

const PRETTIER_PLUGINS: prettier.Plugin[] = [
  babelPlugin,
  estreePlugin,
  htmlPlugin,
  markdownPlugin,
  postcssPlugin,
  typescriptPlugin,
  yamlPlugin
];

const PRETTIER_OPTIONS = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5' as const,
  printWidth: 100
};

interface StreamMessage {
  type:
    | 'FILE_OPEN'
    | 'APPEND'
    | 'FILE_CLOSE'
    | 'COMPLETE'
    | 'ERROR'
    | 'LOG'
    | 'ANSWER';
  path?: string;
  text?: string;
  message?: string;
  chunk?: string;
  title?: string;
  section?: string;
  items?: Array<string | { label?: string; value?: string; text?: string }>;
  kind?: string;
}

// Backend API URL - adjust if your backend runs on a different port
// Use 127.0.0.1 instead of localhost to avoid DNS/network issues in Next.js
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3001';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

class MockStreamingGenerator {
  private files: Array<{ path: string; content: string }> = [];
  private prepared = false;

  constructor(private readonly prompt: string) {}

  private async formatContent(content: string, filePath: string): Promise<string> {
    const normalized = this.normalizeLineEndings(content);
    const parser = this.getParserForPath(filePath);

    if (!parser) {
      return this.ensureTrailingNewline(normalized);
    }

    try {
      const formatted = await prettier.format(normalized, {
        parser,
        plugins: PRETTIER_PLUGINS,
        semi: PRETTIER_OPTIONS.semi,
        singleQuote: parser === 'html' ? false : PRETTIER_OPTIONS.singleQuote,
        trailingComma: PRETTIER_OPTIONS.trailingComma,
        tabWidth: this.getTabWidth(parser),
        printWidth: PRETTIER_OPTIONS.printWidth
      });

      return this.ensureTrailingNewline(formatted);
    } catch (error) {
      console.warn('Failed to format ' + filePath + ':', error);
      return this.ensureTrailingNewline(normalized);
    }
  }

  private getParserForPath(filePath: string): prettier.BuiltInParserName | undefined {
    const ext = filePath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'babel';
      case 'json':
        return 'json';
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
      case 'scss':
      case 'less':
        return 'css';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'yml':
      case 'yaml':
        return 'yaml';
      default:
        return undefined;
    }
  }

  private getTabWidth(parser: prettier.BuiltInParserName): number {
    if (parser === 'markdown' || parser === 'yaml') {
      return 2;
    }

    return 2;
  }

  private ensureTrailingNewline(content: string): string {
    return content.endsWith('\n') ? content : content + '\n';
  }

  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n');
  }

  private getFormattedLines(content: string): string[] {
    return this.ensureTrailingNewline(this.normalizeLineEndings(content)).split('\n');
  }

  async prepare() {
    const rawFiles = this.getMockFiles();
    this.files = await Promise.all(
      rawFiles.map(async (file) => ({
        path: file.path,
        content: await this.formatContent(file.content, file.path)
      }))
    );
    this.prepared = true;
  }

  private getMockFiles(): Array<{ path: string; content: string }> {
    const promptLower = this.prompt.toLowerCase();

    if (promptLower.includes('react')) {
      return [
        {
          path: 'src/components/TodoApp.jsx',
          content: 'import React, { useState } from \'react\';\n\nfunction TodoApp() {\n  const [todos, setTodos] = useState([]);\n  const [inputValue, setInputValue] = useState(\'\');\n\n  const addTodo = () => {\n    if (inputValue.trim()) {\n      setTodos([\n        ...todos,\n        {\n          id: Date.now(),\n          text: inputValue,\n          completed: false\n        }\n      ]);\n      setInputValue(\'\');\n    }\n  };\n\n  const toggleTodo = (id) => {\n    setTodos(\n      todos.map((todo) =>\n        todo.id === id\n          ? {\n              ...todo,\n              completed: !todo.completed\n            }\n          : todo\n      )\n    );\n  };\n\n  const deleteTodo = (id) => {\n    setTodos(todos.filter((todo) => todo.id !== id));\n  };\n\n  return (\n    <div className="todo-container">\n      <h1>Todo Application</h1>\n\n      <div className="input-section">\n        <input\n          type="text"\n          value={inputValue}\n          onChange={(e) => setInputValue(e.target.value)}\n          placeholder="Enter a todo item..."\n        />\n        <button onClick={addTodo}>Add Todo</button>\n      </div>\n\n      <ul className="todo-list">\n        {todos.map((todo) => (\n          <li key={todo.id}>\n            <input\n              type="checkbox"\n              checked={todo.completed}\n              onChange={() => toggleTodo(todo.id)}\n            />\n            <span className={todo.completed ? \'completed\' : \'\'}>\n              {todo.text}\n            </span>\n            <button onClick={() => deleteTodo(todo.id)}>Delete</button>\n          </li>\n        ))}\n      </ul>\n    </div>\n  );\n}\n\nexport default TodoApp;'
        },
        {
          path: 'src/App.jsx',
          content: 'import React from \'react\';\nimport TodoApp from \'./components/TodoApp\';\n\nfunction App() {\n  return (\n    <div className="App">\n      <TodoApp />\n    </div>\n  );\n}\n\nexport default App;'
        },
        {
          path: 'src/index.jsx',
          content: 'import React from \'react\';\nimport ReactDOM from \'react-dom\';\nimport App from \'./App\';\n\nReactDOM.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n  document.getElementById(\'root\')\n);'
        }
      ];
    }

    if (promptLower.includes('python') || promptLower.includes('card game')) {
      return [
        {
          path: 'card_game.py',
          content: '# Simple Card Game in Python\nimport random\nimport time\n\nclass Card:\n    def __init__(self, suit, rank):\n        self.suit = suit\n        self.rank = rank\n\n    def __str__(self):\n        return f"{self.rank} of {self.suit}"\n\nclass Deck:\n    def __init__(self):\n        suits = [\'Hearts\', \'Diamonds\', \'Clubs\', \'Spades\']\n        ranks = [\'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'10\',\n                \'Jack\', \'Queen\', \'King\', \'Ace\']\n        self.cards = [Card(suit, rank) for suit in suits for rank in ranks]\n        self.shuffle()\n\n    def shuffle(self):\n        random.shuffle(self.cards)\n\n    def deal(self):\n        return self.cards.pop() if self.cards else None\n\ndef play_card_game():\n    print("Welcome to the Card Game!")\n    print("Drawing cards...")\n\n    deck = Deck()\n    player_card = deck.deal()\n    computer_card = deck.deal()\n\n    print(f"Your card: {player_card}")\n    print(f"Computer\'s card: {computer_card}")\n\n    # Simple comparison (higher rank wins)\n    player_rank = get_card_value(player_card.rank)\n    computer_rank = get_card_value(computer_card.rank)\n\n    if player_rank > computer_rank:\n        print("You win! 🎉")\n    elif computer_rank > player_rank:\n        print("Computer wins! 🤖")\n    else:\n        print("It\'s a tie! 🤝")\n\ndef get_card_value(rank):\n    values = {\n        \'2\': 2, \'3\': 3, \'4\': 4, \'5\': 5, \'6\': 6, \'7\': 7, \'8\': 8, \'9\': 9, \'10\': 10,\n        \'Jack\': 11, \'Queen\': 12, \'King\': 13, \'Ace\': 14\n    }\n    return values.get(rank, 0)\n\nif __name__ == "__main__":\n    play_card_game()'
        }
      ];
    }

    if (promptLower.includes('ping pong') || promptLower.includes('pong')) {
      return [
        {
          path: 'index.html',
          content: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta\n      name="viewport"\n      content="width=device-width, initial-scale=1.0"\n    />\n    <title>Ping Pong Game</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <div class="game-container">\n      <h1>Ping Pong Game</h1>\n      <div class="game-info">\n        <div class="score">\n          <span>Player: <span id="playerScore">0</span></span>\n          <span>Computer: <span id="computerScore">0</span></span>\n        </div>\n        <button id="startButton">Start Game</button>\n      </div>\n      <canvas id="gameCanvas" width="800" height="400"></canvas>\n    </div>\n    <script src="script.js"></script>\n  </body>\n</html>'
        },
        {
          path: 'styles.css',
          content: '/* Ping Pong Game Styles */\n.game-container {\n  max-width: 800px;\n  margin: 0 auto;\n  text-align: center;\n  font-family: Arial, sans-serif;\n}\n\n.game-container h1 {\n  color: #333;\n  margin-bottom: 20px;\n}\n\n.game-info {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 20px;\n  padding: 0 20px;\n}\n\n.score {\n  display: flex;\n  gap: 40px;\n}\n\n.score span {\n  font-size: 18px;\n  font-weight: bold;\n}\n\n#startButton {\n  padding: 10px 20px;\n  background: #4caf50;\n  color: white;\n  border: none;\n  border-radius: 5px;\n  cursor: pointer;\n  font-size: 16px;\n}\n\n#startButton:hover {\n  background: #45a049;\n}\n\n#gameCanvas {\n  border: 2px solid #333;\n  background: #000;\n  display: block;\n  margin: 0 auto;\n}'
        },
        {
          path: 'script.js',
          content: '// Ping Pong Game Logic\nconst canvas = document.getElementById(\'gameCanvas\');\nconst ctx = canvas.getContext(\'2d\');\nconst startButton = document.getElementById(\'startButton\');\nconst playerScoreElement = document.getElementById(\'playerScore\');\nconst computerScoreElement = document.getElementById(\'computerScore\');\n\n// Game variables\nlet ball = {\n  x: canvas.width / 2,\n  y: canvas.height / 2,\n  radius: 10,\n  speed: 5,\n  dx: 5,\n  dy: 5\n};\n\nlet player = {\n  x: 0,\n  y: canvas.height / 2 - 50,\n  width: 10,\n  height: 100,\n  speed: 8,\n  score: 0\n};\n\nlet computer = {\n  x: canvas.width - 10,\n  y: canvas.height / 2 - 50,\n  width: 10,\n  height: 100,\n  speed: 6,\n  score: 0\n};\n\nlet gameRunning = false;\n\n// Draw functions\nfunction drawBall() {\n  ctx.beginPath();\n  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);\n  ctx.fillStyle = \'#fff\';\n  ctx.fill();\n  ctx.closePath();\n}\n\nfunction drawPaddle(x, y, width, height) {\n  ctx.fillStyle = \'#fff\';\n  ctx.fillRect(x, y, width, height);\n}\n\nfunction drawScore() {\n  ctx.fillStyle = \'#fff\';\n  ctx.font = \'24px Arial\';\n  ctx.textAlign = \'center\';\n  ctx.fillText(player.score, canvas.width / 4, 50);\n  ctx.fillText(computer.score, (3 * canvas.width) / 4, 50);\n}\n\nfunction drawCenterLine() {\n  ctx.setLineDash([5, 15]);\n  ctx.beginPath();\n  ctx.moveTo(canvas.width / 2, 0);\n  ctx.lineTo(canvas.width / 2, canvas.height);\n  ctx.strokeStyle = \'#fff\';\n  ctx.stroke();\n  ctx.setLineDash([]);\n}\n\n// Game functions\nfunction updateBall() {\n  ball.x += ball.dx;\n  ball.y += ball.dy;\n\n  // Ball collision with top and bottom walls\n  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {\n    ball.dy = -ball.dy;\n  }\n\n  // Ball collision with paddles\n  if (\n    ball.x - ball.radius < player.x + player.width &&\n    ball.y > player.y &&\n    ball.y < player.y + player.height\n  ) {\n    ball.dx = -ball.dx;\n    ball.speed += 0.5;\n  }\n\n  if (\n    ball.x + ball.radius > computer.x &&\n    ball.y > computer.y &&\n    ball.y < computer.y + computer.height\n  ) {\n    ball.dx = -ball.dx;\n    ball.speed += 0.5;\n  }\n\n  // Ball goes off screen\n  if (ball.x < 0) {\n    computer.score++;\n    computerScoreElement.textContent = computer.score;\n    resetBall();\n  } else if (ball.x > canvas.width) {\n    player.score++;\n    playerScoreElement.textContent = player.score;\n    resetBall();\n  }\n}\n\nfunction updateComputer() {\n  const computerCenter = computer.y + computer.height / 2;\n  const ballCenter = ball.y;\n\n  if (ballCenter < computerCenter - 20) {\n    computer.y -= computer.speed;\n  } else if (ballCenter > computerCenter + 20) {\n    computer.y += computer.speed;\n  }\n\n  // Keep paddle in bounds\n  if (computer.y < 0) computer.y = 0;\n  if (computer.y + computer.height > canvas.height) {\n    computer.y = canvas.height - computer.height;\n  }\n}\n\nfunction resetBall() {\n  ball.x = canvas.width / 2;\n  ball.y = canvas.height / 2;\n  ball.dx = -ball.dx;\n  ball.speed = 5;\n}\n\nfunction gameLoop() {\n  if (!gameRunning) return;\n\n  ctx.clearRect(0, 0, canvas.width, canvas.height);\n\n  drawCenterLine();\n  drawBall();\n  drawPaddle(player.x, player.y, player.width, player.height);\n  drawPaddle(computer.x, computer.y, computer.width, computer.height);\n  drawScore();\n\n  updateBall();\n  updateComputer();\n\n  requestAnimationFrame(gameLoop);\n}\n\n// Event listeners\ndocument.addEventListener(\'keydown\', (e) => {\n  if (e.key === \'ArrowUp\') {\n    player.y -= player.speed;\n  } else if (e.key === \'ArrowDown\') {\n    player.y += player.speed;\n  }\n\n  // Keep player paddle in bounds\n  if (player.y < 0) player.y = 0;\n  if (player.y + player.height > canvas.height) {\n    player.y = canvas.height - player.height;\n  }\n});\n\nstartButton.addEventListener(\'click\', () => {\n  if (!gameRunning) {\n    gameRunning = true;\n    startButton.textContent = \'Restart Game\';\n    gameLoop();\n  } else {\n    // Reset game\n    player.score = 0;\n    computer.score = 0;\n    playerScoreElement.textContent = \'0\';\n    computerScoreElement.textContent = \'0\';\n    resetBall();\n    gameRunning = true;\n    gameLoop();\n  }\n});\n\n// Initialize game\nresetBall();'
        }
      ];
    }

    return [
      {
        path: 'index.html',
        content: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta\n      name="viewport"\n      content="width=device-width, initial-scale=1.0"\n    />\n    <title>Generated App</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <div class="container">\n      <h1>Welcome to Your Generated App</h1>\n      <p>\n        This application was generated based on your request:\n        "' + this.prompt + '"\n      </p>\n      <div class="content">\n        <button onclick="showMessage()">Click me!</button>\n        <p id="message" class="hidden">\n          Hello from your generated app! 🚀\n        </p>\n      </div>\n    </div>\n    <script src="script.js"></script>\n  </body>\n</html>'
      },
      {
        path: 'styles.css',
        content: '/* Generated App Styles */\n.container {\n  max-width: 800px;\n  margin: 0 auto;\n  padding: 40px 20px;\n  text-align: center;\n  font-family:\n    -apple-system,\n    BlinkMacSystemFont,\n    \'Segoe UI\',\n    Roboto,\n    sans-serif;\n}\n\nh1 {\n  color: #333;\n  margin-bottom: 20px;\n  font-size: 2.5rem;\n}\n\n.content {\n  margin-top: 40px;\n}\n\nbutton {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n  border: none;\n  padding: 12px 24px;\n  font-size: 16px;\n  border-radius: 8px;\n  cursor: pointer;\n  transition: transform 0.2s ease;\n}\n\nbutton:hover {\n  transform: translateY(-2px);\n}\n\n.hidden {\n  display: none;\n}\n\n#message {\n  margin-top: 20px;\n  padding: 15px;\n  background: #f0f8ff;\n  border-radius: 8px;\n  color: #333;\n  font-size: 18px;\n}'
      },
      {
        path: 'script.js',
        content: `function showMessage() {
  const message = document.getElementById('message');
  message.classList.remove('hidden');

  // Animate the message
  message.style.animation = 'fadeInUp 0.5s ease-out';
}

// Add some interactivity
document.addEventListener('DOMContentLoaded', function () {
  console.log('Generated app loaded successfully!');

  // Add click animation to button
  const button = document.querySelector('button');
  button.addEventListener('click', function () {
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.style.transform = 'scale(1)';
    }, 150);
  });
});

// CSS Animation (injected via JavaScript)
const style = document.createElement('style');
style.textContent = [
  '@keyframes fadeInUp {',
  '  from {',
  '    opacity: 0;',
  '    transform: translateY(20px);',
  '  }',
  '  to {',
  '    opacity: 1;',
  '    transform: translateY(0);',
  '  }',
  '}',
  ''
].join('\\n');
document.head.appendChild(style);`
      }
    ];
  }

  async *generateStream(): AsyncGenerator<StreamMessage> {
    if (!this.prepared) {
      throw new Error('Streaming generator must be prepared before use');
    }

    for (let i = 0; i < this.files.length; i++) {
      const file = this.files[i];

      yield { type: 'FILE_OPEN', path: file.path };

      const lines = this.getFormattedLines(file.content);

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const isLastLine = lineIndex === lines.length - 1;
        const line = lines[lineIndex];

        if (isLastLine && line === '') {
          continue;
        }

        const chunk = isLastLine ? line : line + '\n';

        yield {
          type: 'APPEND',
          path: file.path,
          text: chunk
        };

        const delay = Math.random() * 100 + 50;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      yield { type: 'FILE_CLOSE', path: file.path };

      if (i < this.files.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    yield { type: 'COMPLETE' };
  }

}

interface RepoContext {
  packageName: string;
  scripts: string[];
  envKeys: string[];
  hasNext: boolean;
}

class AnswerModeGenerator {
  private readonly promptLower: string;

  constructor(private readonly prompt: string) {
    this.promptLower = prompt.toLowerCase();
  }

  private async loadContext(): Promise<RepoContext> {
    const context: RepoContext = {
      packageName: 'this project',
      scripts: [],
      envKeys: [],
      hasNext: false,
    };

    try {
      const pkgRaw = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8');
      const pkgJson = JSON.parse(pkgRaw);
      context.packageName = pkgJson.name || context.packageName;
      context.scripts = Object.keys(pkgJson.scripts || {});
      context.hasNext = Boolean(pkgJson.dependencies?.next || pkgJson.devDependencies?.next);
    } catch (error) {
      console.warn('[AnswerMode] Unable to read package.json:', error);
    }

    try {
      const envRaw = await fs.readFile(path.join(process.cwd(), '.env.example'), 'utf-8');
      context.envKeys = envRaw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => line.split('=')[0]);
    } catch (error) {
      console.warn('[AnswerMode] No .env.example found or unreadable:', error);
    }

    return context;
  }

  private isVercelQuestion(): boolean {
    return this.promptLower.includes('vercel');
  }

  private buildVercelSections(context: RepoContext): StreamMessage[] {
    const sections: StreamMessage[] = [];
    const buildCommand = context.scripts.includes('build') ? 'npm run build' : 'npm run build';
    const devCommand = context.scripts.includes('dev') ? 'npm run dev' : 'npm run dev';
    const envSummary =
      context.envKeys.length > 0
        ? `Environment variables to configure: ${context.envKeys.slice(0, 6).join(', ')}${
            context.envKeys.length > 6 ? ', ...' : ''
          }`
        : 'Review .env.example for required environment variables';

    sections.push({
      type: 'LOG',
      kind: 'overview',
      title: 'Overview',
      text: `Deploy the ${context.hasNext ? 'Next.js' : 'web'} workspace to Vercel using either the GitHub integration or the Vercel CLI.`,
    });

    sections.push({
      type: 'LOG',
      kind: 'prerequisites',
      title: 'Prerequisites',
      items: [
        'Vercel account with access to the desired team or personal scope',
        'Node.js 18 or newer and npm installed locally',
        'Install the Vercel CLI globally: npm install -g vercel',
        envSummary,
      ],
    });

    sections.push({
      type: 'LOG',
      kind: 'steps',
      title: 'Steps - GitHub Integration',
      items: [
        'Push your local branch to GitHub so Vercel can import it',
        'In Vercel, click "Add New" -> "Project" and import the repository',
        'Accept the detected Next.js defaults (framework: Next.js, output: .vercel/output)',
        'Add environment variables from .env.example in the Vercel dashboard',
        'Deploy the project and monitor build logs until they finish',
        'Verify the preview URL and promote to Production when ready',
      ],
    });

    sections.push({
      type: 'LOG',
      kind: 'steps',
      title: 'Steps - Vercel CLI',
      items: [
        'npm install -g vercel',
        'vercel login',
        `vercel --prod  # choose ${context.packageName}`,
        'vercel env pull .env.local  # optional: sync env vars locally',
        'vercel deploy --prod  # create a production deployment when ready',
      ],
    });

    const vercelJson = `{
  "buildCommand": "${buildCommand}",
  "framework": "nextjs"
}`;

    sections.push({
      type: 'LOG',
      kind: 'config',
      title: 'Config & Commands',
      items: [
        `vercel.json (optional):\n${vercelJson}`,
        `Build command: ${buildCommand}`,
        `Dev command: ${devCommand}`,
        envSummary,
      ],
    });

    sections.push({
      type: 'LOG',
      kind: 'validation',
      title: 'Validation',
      items: [
        'Monitor the Vercel build logs for warnings or failing steps',
        'Open the assigned preview URL and smoke-test critical flows',
        'Confirm environment variables resolved correctly in the deployment',
      ],
    });

    sections.push({
      type: 'LOG',
      kind: 'nextSteps',
      title: 'Next Steps',
      items: [
        'Enable GitHub check integration to surface deployment status on pull requests',
        'Configure custom domains and preview URL naming',
        'Enable Vercel Analytics or Speed Insights as needed',
      ],
    });

    sections.push({
      type: 'ANSWER',
      chunk:
        'Tip: keep your Vercel project linked to GitHub so every pull request receives a preview URL automatically. Use `vercel env ls` to double-check secrets before promoting to production.\n',
    });

    return sections;
  }

  private buildGenericSections(context: RepoContext): StreamMessage[] {
    return [
      {
        type: 'LOG',
        kind: 'overview',
        title: 'Overview',
        text: `Guidance mode summarises actionable steps for: "${this.prompt}"`,
      },
      {
        type: 'LOG',
        kind: 'context',
        title: 'Repository Notes',
        items: [
          `Package: ${context.packageName}`,
          context.scripts.length
            ? `Available scripts: ${context.scripts.join(', ')}`
            : 'No npm scripts detected',
          context.envKeys.length
            ? `Environment variables: ${context.envKeys.join(', ')}`
            : 'Define required environment variables in Settings',
        ],
      },
      {
        type: 'ANSWER',
        chunk:
          'Review the repo README and existing npm scripts to adapt these steps to your request. Ask again with more specifics to receive a tailored runbook.\n',
      },
    ];
  }

  async *generateStream(): AsyncGenerator<StreamMessage> {
    const context = await this.loadContext();
    const sections = this.isVercelQuestion()
      ? this.buildVercelSections(context)
      : this.buildGenericSections(context);

    for (const section of sections) {
      yield section;
      await delay(80);
    }

    yield { type: 'COMPLETE', kind: 'answer' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model, provider, routingMode, mode } = body;

    if (!prompt) {
      return new Response('Prompt is required', { status: 400 });
    }

    console.log('[Stream API] Generating code with backend API', { prompt: prompt.substring(0, 50), model, provider });

    const modeType = typeof mode === 'string' ? mode.toLowerCase() : 'build';

    if (modeType === 'answer') {
      const generator = new AnswerModeGenerator(prompt);
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const message of generator.generateStream()) {
              controller.enqueue('data: ' + JSON.stringify(message) + '\n\n');
            }
          } catch (error: any) {
            controller.enqueue(
              'data: ' +
                JSON.stringify({
                  type: 'ERROR',
                  message: error?.message || 'Failed to generate answer response',
                }) +
                '\n\n'
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Call backend API to generate code with streaming enabled
    let backendResponse: Response;
    try {
      backendResponse = await fetch(`${BACKEND_URL}/llm/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
          activeProvider: provider,
          routingMode: routingMode || 'single-model',
          streaming: true  // Enable thinking mode streaming
        }),
        // Increase timeout to 60 seconds for AI generation
        signal: AbortSignal.timeout(60000)
      });
    } catch (fetchError: any) {
      console.error('[Stream API] Failed to connect to backend:', fetchError.message);
      return new Response(
        JSON.stringify({
          error: 'Backend server not running',
          details: `Cannot connect to backend at ${BACKEND_URL}. Please start the backend server with: cd backend && npm start`,
          hint: 'Make sure your backend server is running on port 3001'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!backendResponse.ok) {
      let errorData: any;
      try {
        errorData = await backendResponse.json();
      } catch {
        errorData = { error: 'Backend returned an error', status: backendResponse.status };
      }
      return new Response(
        JSON.stringify({ error: errorData.error || 'Backend API error', details: errorData }),
        {
          status: backendResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if response is streaming (SSE)
    const contentType = backendResponse.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      // Backend is streaming - pass through thinking events and parse final code
      console.log('[Stream API] Backend is streaming, processing events...');

      let generatedCode = '';
      let completeData: any = null;

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const reader = backendResponse.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (!reader) {
              throw new Error('No reader available');
            }

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

                    // Forward THINKING events directly
                    if (data.type === 'THINKING') {
                      console.log('[Frontend Proxy] Forwarding THINKING event:', data);
                      controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
                    }
                    // Store COMPLETE event data
                    else if (data.type === 'COMPLETE') {
                      completeData = data;
                      generatedCode = data.code || '';
                    }
                    // Forward ERROR events
                    else if (data.type === 'ERROR') {
                      controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
                      controller.close();
                      return;
                    }
                  } catch (e) {
                    console.warn('[Stream API] Failed to parse SSE line:', line);
                  }
                }
              }

              // Keep incomplete line in buffer
              buffer = lines[lines.length - 1];
            }

            if (!generatedCode || !completeData) {
              throw new Error('No code generated from backend stream');
            }

            console.log('[Stream API] Code generated successfully, length:', generatedCode.length);

            // Parse the generated code to create file structure
            const files = await parseGeneratedCodeIntoFiles(generatedCode, prompt);

            // Format all files with Prettier
            const formattedFiles = await Promise.all(
              files.map(async (file) => ({
                ...file,
                content: await formatContent(file.content, file.path)
              }))
            );

            console.log('[Stream API] Created', formattedFiles.length, 'files for streaming');

            // Stream the files to the client
            for (const file of formattedFiles) {
              // Send FILE_OPEN event
              controller.enqueue('data: ' + JSON.stringify({ type: 'FILE_OPEN', path: file.path }) + '\n\n');

              // Split content into lines and stream them
              const lines = file.content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const isLastLine = i === lines.length - 1;
                const line = lines[i];

                // Skip empty last lines
                if (isLastLine && line === '') continue;

                const chunk = isLastLine ? line : line + '\n';

                // Send APPEND event with path so StreamingEditor knows which file to append to
                controller.enqueue('data: ' + JSON.stringify({ type: 'APPEND', path: file.path, text: chunk }) + '\n\n');

                // Add realistic delay for streaming effect
                await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
              }

              // Send FILE_CLOSE event
              controller.enqueue('data: ' + JSON.stringify({ type: 'FILE_CLOSE', path: file.path }) + '\n\n');

              // Delay between files
              await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Send COMPLETE event with metadata
            controller.enqueue('data: ' + JSON.stringify({
              type: 'COMPLETE',
              metadata: completeData.metadata,
              budget: completeData.budget
            }) + '\n\n');

          } catch (error: any) {
            console.error('[Stream API] Error during streaming:', error);
            controller.enqueue('data: ' + JSON.stringify({ type: 'ERROR', message: error?.message || 'Unknown error' }) + '\n\n');
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        }
      });
    }

    // Fallback: non-streaming response
    const result = await backendResponse.json();
    const generatedCode = result.code;

    if (!generatedCode) {
      return new Response(JSON.stringify({ error: 'No code generated' }), { status: 500 });
    }

    console.log('[Stream API] Code generated successfully (non-streaming), length:', generatedCode.length);

    // Parse the generated code to create file structure
    const files = await parseGeneratedCodeIntoFiles(generatedCode, prompt);

    // Format all files with Prettier
    const formattedFiles = await Promise.all(
      files.map(async (file) => ({
        ...file,
        content: await formatContent(file.content, file.path)
      }))
    );

    console.log('[Stream API] Created', formattedFiles.length, 'files for streaming');

    // Stream the files to the client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const file of formattedFiles) {
            // Send FILE_OPEN event
            controller.enqueue('data: ' + JSON.stringify({ type: 'FILE_OPEN', path: file.path }) + '\n\n');

            // Split content into lines and stream them
            const lines = file.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const isLastLine = i === lines.length - 1;
              const line = lines[i];

              // Skip empty last lines
              if (isLastLine && line === '') continue;

              const chunk = isLastLine ? line : line + '\n';

              // Send APPEND event with path so StreamingEditor knows which file to append to
              controller.enqueue('data: ' + JSON.stringify({ type: 'APPEND', path: file.path, text: chunk }) + '\n\n');

              // Add realistic delay for streaming effect
              await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
            }

            // Send FILE_CLOSE event
            controller.enqueue('data: ' + JSON.stringify({ type: 'FILE_CLOSE', path: file.path }) + '\n\n');

            // Delay between files
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Send COMPLETE event
          controller.enqueue('data: ' + JSON.stringify({ type: 'COMPLETE' }) + '\n\n');
        } catch (error: any) {
          console.error('[Stream API] Error during streaming:', error);
          controller.enqueue('data: ' + JSON.stringify({ type: 'ERROR', message: error?.message || 'Unknown error' }) + '\n\n');
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  } catch (error: any) {
    console.error('[Stream API] Error:', error);
    return new Response('Error: ' + (error?.message || 'Unknown error'), { status: 500 });
  }
}

// Helper function to format content with Prettier
async function formatContent(content: string, filePath: string): Promise<string> {
  const normalized = content.replace(/\r\n/g, '\n');
  const parser = getParserForPath(filePath);

  if (!parser) {
    return content.endsWith('\n') ? content : content + '\n';
  }

  try {
    const formatted = await prettier.format(normalized, {
      parser,
      plugins: PRETTIER_PLUGINS,
      semi: PRETTIER_OPTIONS.semi,
      singleQuote: parser === 'html' ? false : PRETTIER_OPTIONS.singleQuote,
      trailingComma: PRETTIER_OPTIONS.trailingComma,
      tabWidth: parser === 'markdown' || parser === 'yaml' ? 2 : 2,
      printWidth: PRETTIER_OPTIONS.printWidth
    });

    return formatted.endsWith('\n') ? formatted : formatted + '\n';
  } catch (error) {
    console.warn('Failed to format ' + filePath + ':', error);
    return content.endsWith('\n') ? content : content + '\n';
  }
}

function getParserForPath(filePath: string): prettier.BuiltInParserName | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'babel';
    case 'json':
      return 'json';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'yml':
    case 'yaml':
      return 'yaml';
    default:
      return undefined;
  }
}

// Helper function to parse generated code into files
async function parseGeneratedCodeIntoFiles(
  code: string,
  prompt: string
): Promise<Array<{ path: string; content: string }>> {
  // First, try to extract code from markdown code blocks
  const markdownCodeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  const codeBlocks = Array.from(code.matchAll(markdownCodeBlockRegex));

  if (codeBlocks.length > 0) {
    console.log('[parseGeneratedCode] Found', codeBlocks.length, 'markdown code blocks');
    const files: Array<{ path: string; content: string }> = [];

    // Look for file path indicators before code blocks
    const lines = code.split('\n');

    for (let i = 0; i < codeBlocks.length; i++) {
      const block = codeBlocks[i];
      const language = block[1] || 'txt';
      const content = block[2].trim();

      console.log('[parseGeneratedCode] Block', i, '- Language:', language, 'Content length:', content.length);

      // Skip empty blocks
      if (!content) {
        console.log('[parseGeneratedCode] Skipping empty block', i);
        continue;
      }

      // Try to find a file path in the lines before this code block
      const blockIndex = code.indexOf(block[0]);
      const textBefore = code.substring(0, blockIndex);
      const linesBefore = textBefore.split('\n').slice(-10); // Look at last 10 lines for more context

      let filePath = '';

      // Look for patterns like "**1. `config.py`**" or "### app/models.py" or just "`filename.ext`"
      for (const line of linesBefore.reverse()) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Pattern 1: Filename in backticks with optional numbering/formatting
        // Examples: `config.py`, **1. `config.py`**, ### `app.js`
        let pathMatch = trimmed.match(/[`*#]*\s*(?:\d+[\.\)]\s*)?[`'"]*([a-zA-Z0-9_\-\/\.]+\.[a-zA-Z0-9]+)[`'"]*\s*[`*#]*/i);

        // Pattern 2: Markdown heading with filename
        // Examples: ## config.py, ### Create app/models.py
        if (!pathMatch) {
          pathMatch = trimmed.match(/^#{1,6}\s+(?:Create\s+|File:\s+)?([a-zA-Z0-9_\-\/\.]+\.[a-zA-Z0-9]+)/i);
        }

        // Pattern 3: "File:" or "Filename:" prefix
        // Examples: File: config.py, Filename: app.js
        if (!pathMatch) {
          pathMatch = trimmed.match(/^(?:File|Filename|Create|Add):\s*[`'"]*([a-zA-Z0-9_\-\/\.]+\.[a-zA-Z0-9]+)/i);
        }

        // Pattern 4: Plain filename at start of line (with numbering)
        // Examples: 1. config.py, 2) app.js
        if (!pathMatch) {
          pathMatch = trimmed.match(/^\d+[\.\)]\s+([a-zA-Z0-9_\-\/\.]+\.[a-zA-Z0-9]+)/);
        }

        if (pathMatch && pathMatch[1]) {
          filePath = pathMatch[1];
          console.log('[parseGeneratedCode] Found file path in line:', line.trim(), '→', pathMatch[1]);
          break;
        }
      }

      // If no path found, generate one based on language and content
      if (!filePath) {
        const ext = getExtensionForLanguage(language);
        // Try to generate a more meaningful name based on content
        filePath = generateMeaningfulFilename(content, language, i + 1);
        console.log('[parseGeneratedCode] No path found, generated:', filePath);
      }

      files.push({ path: filePath, content });
      console.log('[parseGeneratedCode] Added file:', filePath, 'with', content.length, 'chars');
    }

    if (files.length > 0) {
      console.log('[parseGeneratedCode] Extracted', files.length, 'files from markdown:', files.map(f => `${f.path} (${f.content.length} chars)`));
      return files;
    }
  }

  // Try to detect file markers in the generated code
  const fileMarkerRegex = /^(?:\/\/|#|<!--|\/\*)\s*(?:File|Filename|Path):\s*(.+?)(?:\s*(?:-->|\*\/))?\s*$/gim;
  const matches = Array.from(code.matchAll(fileMarkerRegex));

  if (matches.length > 0) {
    // Code has file markers - split by them
    const files: Array<{ path: string; content: string }> = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const filePath = match[1].trim();
      const startIndex = match.index! + match[0].length;
      const endIndex = i < matches.length - 1 ? matches[i + 1].index! : code.length;
      const fileContent = code.substring(startIndex, endIndex).trim();

      files.push({ path: filePath, content: fileContent });
    }

    return files;
  }

  // No file markers - infer structure from prompt and code
  const promptLower = prompt.toLowerCase();

  // Detect language/framework from code content
  if (code.includes('import React') || code.includes('from \'react\'') || code.includes('jsx')) {
    return inferReactStructure(code, promptLower);
  } else if (code.includes('<!DOCTYPE html>') || code.includes('<html')) {
    return inferHTMLStructure(code);
  } else if (code.includes('def ') || code.includes('import ') && code.includes(':')) {
    return inferPythonStructure(code, promptLower);
  }

  // Default: single file
  const ext = detectFileExtension(code);
  return [{ path: `generated.${ext}`, content: code }];
}

function inferReactStructure(code: string, promptLower: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  // Try to split by component definitions
  const componentRegex = /(?:^|\n)(?:export\s+)?(?:default\s+)?(?:function|class|const)\s+(\w+)/g;
  const components = Array.from(code.matchAll(componentRegex));

  if (components.length > 1) {
    // Multiple components - create separate files
    components.forEach((match, i) => {
      const componentName = match[1];
      const startIndex = match.index!;
      const endIndex = i < components.length - 1 ? components[i + 1].index! : code.length;
      const content = code.substring(startIndex, endIndex).trim();

      files.push({
        path: `src/components/${componentName}.jsx`,
        content
      });
    });
  } else {
    // Single component
    files.push({
      path: 'src/App.jsx',
      content: code
    });
  }

  return files;
}

function inferHTMLStructure(code: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  // Extract CSS if embedded
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    files.push({
      path: 'styles.css',
      content: styleMatch[1].trim()
    });
  }

  // Extract JavaScript if embedded
  const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    files.push({
      path: 'script.js',
      content: scriptMatch[1].trim()
    });
  }

  // Main HTML file
  files.push({
    path: 'index.html',
    content: code
  });

  return files;
}

function inferPythonStructure(code: string, promptLower: string): Array<{ path: string; content: string }> {
  // Detect if it's a single script or module
  const hasClasses = code.includes('class ');
  const fileName = promptLower.includes('game') ? 'game.py' : hasClasses ? 'main.py' : 'script.py';

  return [{
    path: fileName,
    content: code
  }];
}

function detectFileExtension(code: string): string {
  if (code.includes('import React') || code.includes('jsx')) return 'jsx';
  if (code.includes('import ') && code.includes('from ')) return 'js';
  if (code.includes('def ') || code.includes('import ')) return 'py';
  if (code.includes('<!DOCTYPE') || code.includes('<html')) return 'html';
  if (code.includes('function') || code.includes('const')) return 'js';
  return 'txt';
}

function getExtensionForLanguage(language: string): string {
  const langMap: Record<string, string> = {
    'python': 'py',
    'javascript': 'js',
    'typescript': 'ts',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'markdown': 'md',
    'sql': 'sql',
    'bash': 'sh',
    'shell': 'sh',
    'yaml': 'yml',
    'yml': 'yml'
  };

  return langMap[language.toLowerCase()] || language.toLowerCase() || 'txt';
}

// Generate a meaningful filename based on content analysis
function generateMeaningfulFilename(content: string, language: string, index: number): string {
  const ext = getExtensionForLanguage(language);

  // Try to infer filename from content patterns
  const lines = content.split('\n').slice(0, 20); // Look at first 20 lines

  // Python: Look for class or function names
  if (language === 'python' || ext === 'py') {
    const classMatch = content.match(/^class\s+(\w+)/m);
    if (classMatch) return `${classMatch[1].toLowerCase()}.py`;

    const funcMatch = content.match(/^def\s+(\w+)/m);
    if (funcMatch && funcMatch[1] !== 'main') return `${funcMatch[1]}.py`;
  }

  // JavaScript/TypeScript: Look for component, class, or export names
  if (['javascript', 'typescript', 'jsx', 'tsx'].includes(language) || ['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
    // React component
    const componentMatch = content.match(/(?:export\s+(?:default\s+)?)?(?:function|class|const)\s+([A-Z]\w+)/);
    if (componentMatch) {
      const name = componentMatch[1];
      return ext === 'jsx' || ext === 'tsx' ? `${name}.${ext}` : `${name}.js`;
    }
  }

  // HTML: Look for title
  if (language === 'html' || ext === 'html') {
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
      if (title && title !== 'document') return `${title}.html`;
    }
    return 'index.html';
  }

  // CSS: Look for common patterns
  if (language === 'css' || ext === 'css') {
    if (content.includes('@keyframes') || content.includes('animation')) return 'animations.css';
    if (content.includes('.btn') || content.includes('button')) return 'buttons.css';
    return 'styles.css';
  }

  // SQL: Look for table names
  if (language === 'sql' || ext === 'sql') {
    const createMatch = content.match(/CREATE\s+TABLE\s+(\w+)/i);
    if (createMatch) return `${createMatch[1].toLowerCase()}.sql`;
    return 'schema.sql';
  }

  // Default: Use generic naming with index
  const defaultNames: Record<string, string> = {
    'py': 'script',
    'js': 'script',
    'ts': 'script',
    'jsx': 'Component',
    'tsx': 'Component',
    'html': 'index',
    'css': 'styles',
    'json': 'config',
    'md': 'README',
    'sql': 'schema',
    'sh': 'script'
  };

  const baseName = defaultNames[ext] || 'file';
  return index === 1 ? `${baseName}.${ext}` : `${baseName}${index}.${ext}`;
}
