# Vibe Coder

🚀 **AI-Powered Development Environment** - A modern, full-stack development platform that combines the power of multiple AI models with an intuitive, VS Code-inspired interface.

![Vibe Coder](https://img.shields.io/badge/Vibe%20Coder-1.0.0-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=flat-square&logo=tailwind-css)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)

## ✨ Features

### 🤖 Multi-Model AI Integration
- **Claude (Anthropic)** - Advanced reasoning and code generation
- **GPT-4 (OpenAI)** - Versatile AI assistance
- **Gemini (Google)** - Fast and efficient responses
- **xAI Grok** - Innovative AI solutions
- **Supernova** - Specialized AI models

### 🎨 Modern UI/UX Design
- **Glassmorphism Design** - Modern frosted glass effects
- **Dark Theme** - Professional developer-focused interface
- **Responsive Layout** - Works seamlessly on desktop and mobile
- **Smooth Animations** - Fluid transitions and micro-interactions

### 🛠️ Development Tools
- **Monaco Editor** - VS Code-quality code editing experience
- **Live Preview** - Real-time code execution and visualization
- **Terminal Integration** - Built-in console with log monitoring
- **File Tree** - Project file navigation and management
- **Command Palette** - Quick actions with ⌘K / Ctrl+K

### 📱 Cross-Platform Export
- **React Native/Expo** - Mobile app generation
- **Flutter** - Cross-platform mobile development
- **Web Applications** - Modern web app deployment

### 🔧 Advanced Features
- **Code Quality Analysis** - Linting and testing integration
- **Version Control** - Git integration with checkpoint system
- **Collaborative Sharing** - Shareable preview links
- **Performance Monitoring** - Token usage and cost tracking

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vibe-coder.git
   cd vibe-coder
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install frontend dependencies
   cd frontend && npm install && cd ..

   # Install backend dependencies
   cd backend && npm install && cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment file
   cp .env.local.example .env.local

   # Add your API keys
   # Edit .env.local with your AI provider API keys
   ```

4. **Start Development Servers**
   ```bash
   # Start both frontend and backend
   npm run dev

   # Or start individually:
   # Frontend: cd frontend && npm run dev
   # Backend: cd backend && npm run start
   ```

5. **Open in Browser**
   - Frontend: http://localhost:3003
   - Backend API: http://localhost:3001

## 📁 Project Structure

```
vibe-coder/
├── frontend/                 # Next.js React application
│   ├── app/                 # App Router pages and components
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utility functions
│   └── public/              # Static assets
├── backend/                 # Node.js/Express API server
│   ├── src/                 # TypeScript source files
│   ├── services/            # AI provider integrations
│   └── routes/              # API endpoints
├── mobile-companion/        # React Native mobile app
│   ├── src/                 # Mobile app source
│   └── assets/              # Mobile assets
└── docs/                    # Documentation and guides
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# AI Provider API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
XAI_API_KEY=your_xai_key

# Application Settings
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3003
```

### AI Model Configuration

Configure available models in `backend/src/config/models.json`:

```json
{
  "providers": {
    "openai": {
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "default": "gpt-4"
    },
    "anthropic": {
      "models": ["claude-3-opus", "claude-3-sonnet"],
      "default": "claude-3-opus"
    }
  }
}
```

## 🎯 Usage

### Basic Code Generation
1. Open the application in your browser
2. Enter a natural language description in the prompt input
3. Select your preferred AI model and routing mode
4. Click "Generate Code" or press Ctrl+Enter
5. View the generated code in the editor
6. Test it in the live preview panel

### Advanced Features
- **Command Palette**: Press ⌘K / Ctrl+K for quick actions
- **File Navigation**: Use the file tree to explore project structure
- **Version Control**: Create checkpoints to save progress
- **Export Options**: Generate mobile apps or web deployments
- **Quality Checks**: Run linting and testing on generated code

## 🏗️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start only frontend
npm run dev:backend      # Start only backend

# Building
cd frontend && npm run build    # Build frontend for production
cd backend && npm run build     # Build backend for production

# Testing
cd backend && npm test          # Run backend tests
```

### Code Quality

```bash
# Linting
cd frontend && npm run lint
cd backend && npm run lint

# Type checking
cd frontend && npm run type-check
cd backend && npm run type-check
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and test thoroughly
4. Commit with conventional commits: `git commit -m "feat: add new feature"`
5. Push to your fork and create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - The React framework for production
- **Monaco Editor** - VS Code's editor component
- **Tailwind CSS** - Utility-first CSS framework
- **AI Providers** - Claude, GPT, Gemini, and Grok for powering the AI features

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/vibe-coder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/vibe-coder/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/vibe-coder/wiki)

---

**Made with ❤️ by the Vibe Coder team**

Transform your ideas into code with the power of AI. Start building something amazing today! 🚀