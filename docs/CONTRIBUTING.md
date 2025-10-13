# Contributing to Vibe Coder

Thank you for your interest in contributing to Vibe Coder! We welcome contributions from developers of all skill levels. This document provides guidelines and information to help you get started.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `main`
4. **Make your changes** and test thoroughly
5. **Submit a Pull Request** with a clear description

## 📋 Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git
- Basic knowledge of React, Next.js, and TypeScript

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/vibe-coder.git
cd vibe-coder

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Start development servers
npm run dev
```

## 🏗️ Project Structure

```
vibe-coder/
├── frontend/                 # Next.js React application
│   ├── app/                 # App Router pages and components
│   │   ├── components/      # UI components
│   │   ├── lib/            # Utilities and hooks
│   │   └── globals.css     # Global styles
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── services/       # AI provider integrations
│   │   ├── routes/         # API endpoints
│   │   └── types/          # TypeScript definitions
└── mobile-companion/        # React Native mobile app
```

## 🎯 Types of Contributions

### 🐛 Bug Fixes
- Fix reported bugs and issues
- Improve error handling and edge cases
- Fix UI/UX inconsistencies

### ✨ New Features
- Add new AI model integrations
- Implement new UI components
- Enhance existing functionality

### 📚 Documentation
- Improve README and documentation
- Add code comments and JSDoc
- Create tutorials and guides

### 🧪 Testing
- Write unit tests for components
- Add integration tests for API endpoints
- Improve test coverage

### 🎨 UI/UX Improvements
- Enhance visual design and user experience
- Improve accessibility and responsive design
- Add new themes and customization options

## 📝 Coding Standards

### TypeScript/React Guidelines
- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Use functional components with hooks
- Implement proper error boundaries

### Code Style
- Use ESLint and Prettier configurations
- Follow conventional commit messages
- Write descriptive variable and function names
- Add JSDoc comments for complex functions

### File Naming
- Use PascalCase for React components
- Use camelCase for utilities and hooks
- Use kebab-case for file names

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests (when implemented)
cd frontend && npm test
```

### Test Coverage
- Aim for 80%+ test coverage
- Test both happy path and error scenarios
- Include integration tests for critical flows

## 📋 Pull Request Process

### Before Submitting
1. **Test your changes** thoroughly
2. **Update documentation** if needed
3. **Add tests** for new functionality
4. **Ensure no linting errors**
5. **Test on multiple browsers/devices**

### PR Template
```markdown
## Description
Brief description of the changes made

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots of UI changes

## Checklist
- [ ] Code follows project standards
- [ ] Tests are included
- [ ] Documentation is updated
- [ ] No linting errors
```

### Commit Messages
Follow conventional commit format:
```
feat: add new AI model integration
fix: resolve memory leak in editor component
docs: update API documentation
test: add unit tests for user authentication
```

## 🔧 Development Workflow

### Branch Naming
- `feature/description-of-feature`
- `bugfix/issue-description`
- `docs/update-documentation`
- `test/add-new-tests`

### Code Review Process
1. **Automated Checks**: CI/CD runs tests and linting
2. **Peer Review**: At least one maintainer reviews the code
3. **Approval**: PR is approved and merged
4. **Deployment**: Changes are automatically deployed

## 🐛 Reporting Issues

### Bug Reports
When reporting bugs, please include:
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Browser and OS** information
- **Screenshots** if applicable
- **Console errors** or logs

### Feature Requests
For new features, please provide:
- **Use case** and problem it solves
- **Proposed solution** or implementation
- **Alternatives considered**
- **Mockups or examples** if applicable

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check the wiki for detailed guides

## 📄 License

By contributing to Vibe Coder, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- Repository contributors list
- Changelog for significant contributions
- Project documentation

Thank you for contributing to Vibe Coder! 🚀