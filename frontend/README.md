# Vibe Coder Builder - Frontend

A modern, AI-powered development environment built with Next.js, featuring multi-model orchestration and single-model mode for streamlined development workflows.

## 🚀 Features

### Core Functionality
- **AI-Powered Code Generation**: Generate code using multiple LLM providers
- **Multi-Model Orchestration**: Automatically route tasks to specialized models
- **Single-Model Mode**: Use only one provider for consistent, cost-effective development
- **Interactive Code Editor**: Monaco editor with syntax highlighting and IntelliSense
- **Live Sandbox**: Test generated code in real-time
- **Version Control**: Git-backed history with semantic commits
- **Expo Export**: Deploy React Native apps directly to devices

### Routing Modes
- **Orchestrated**: Uses specialized models for different workflow stages
- **Heuristic**: Matches capabilities and model strengths to tasks
- **Cost-Aware**: Optimizes for cost while meeting requirements
- **Manual**: User selects specific models
- **Single-Model**: Uses only one configured provider for all operations

## 🛠️ Single-Model Mode

### Overview
Single-Model Mode allows projects to use only one AI provider for all operations, providing consistency, cost predictability, and simplified configuration.

### Configuration

#### 1. Enable Single-Model Mode
- Select "Single-Model" from the routing mode dropdown in the header
- Choose an active provider (OpenAI, Anthropic, Google, xAI, or Supernova)
- Toggle the "Failover" checkbox to control fallback behavior

#### 2. Active Provider Selection
Available providers:
- **OpenAI**: GPT-4o, GPT-4 (most capable for code generation)
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus (excellent for planning and analysis)
- **Google**: Gemini 1.5 Pro, Gemini 1.5 Flash (fast and cost-effective)
- **xAI**: Grok models (good for reasoning tasks)
- **Supernova**: Fast and cost-effective options

#### 3. Failover Configuration
- **allowFailover** (default: false)
  - `false`: Never switch providers, return error if active provider unavailable
  - `true`: Allow step-level failover if active provider models are unavailable

### Benefits

#### 1. Consistency
- Same model behavior across all operations
- Predictable output quality and style
- Consistent token usage patterns

#### 2. Cost Control
- Single provider billing
- Easier budget management
- No cross-provider cost surprises

#### 3. Simplified Configuration
- No complex routing rules
- Single point of API key management
- Reduced configuration complexity

### Usage Examples

#### Frontend Configuration
```typescript
// Enable single-model mode
setRoutingMode('single-model');
setActiveProvider('anthropic');
setAllowFailover(false);
```

#### API Request
```json
{
  "prompt": "Create a React component...",
  "routingMode": "single-model",
  "activeProvider": "anthropic",
  "allowFailover": false
}
```

### Troubleshooting

#### Common Issues
1. **"Provider does not have valid API keys"**
   - Check environment variables for the selected provider
   - Verify API key format and validity

2. **"No models available for provider"**
   - Check if provider models are within budget limits
   - Verify provider status and availability

3. **"Single-model mode requires activeProvider"**
   - Ensure activeProvider is selected in the UI
   - Check that the provider name matches available options

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend server running (see backend README)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Open your browser:**
Navigate to [http://localhost:3002](http://localhost:3002)

### Environment Variables

Create a `.env.local` file with your API keys:

```env
# OpenAI (optional)
OPENAI_API_KEY=your-openai-api-key

# Anthropic (optional)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Google AI (optional)
GOOGLE_API_KEY=your-google-api-key

# xAI (optional)
XAI_API_KEY=your-xai-api-key

# Supernova (optional)
SUPERNOVA_API_KEY=your-supernova-api-key
```

## 🏗️ Project Structure

```
frontend/
├── app/
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   ├── Editor.tsx    # Monaco code editor
│   │   ├── PromptInput.tsx # AI prompt input
│   │   └── ...
│   ├── globals.css       # Global styles and Tailwind
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main application page
├── lib/
│   └── utils.ts          # Utility functions
└── public/               # Static assets
```

## 🎨 UI Components

The application uses a modern design system with:

- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Monaco Editor** for code editing
- **Glass morphism** design effects
- **Responsive layout** for all screen sizes

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Code Quality

The project includes:
- **ESLint** for code linting
- **TypeScript** for type safety
- **Prettier** for code formatting
- **Tailwind CSS** for consistent styling

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Deploy automatically** on git push

### Manual Deployment

```bash
npm run build
npm run start
```

## 📚 API Reference

### Code Generation
```typescript
POST /api/generate
{
  "prompt": "Create a React component...",
  "routingMode": "single-model",
  "activeProvider": "anthropic",
  "allowFailover": false
}
```

### Workflow Execution
```typescript
POST /api/workflow/generate
{
  "prompt": "Build a task management app",
  "language": "typescript",
  "framework": "react"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - The React framework
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Radix UI](https://www.radix-ui.com) - Accessible UI components
