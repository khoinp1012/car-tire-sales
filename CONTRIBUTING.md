# Contributing

Thank you for your interest in this project! This guide will help you get started.

## Local Development Setup

See [README.md](README.md) for prerequisites and installation.

Quick start:
```bash
# Install Node (if needed)
nvm install --lts && nvm use --lts

# Install dependencies with legacy peer-deps
npm install --legacy-peer-deps

# Setup environment
cp .env.example .env
# Fill in your Appwrite credentials

# Start development
npm start
```

## Before Committing

Run these checks locally to ensure quality:

```bash
# TypeScript type-checking
npm run check

# Linting (may require fresh install)
npm run lint -- --fix

# Unit tests (if configured)
npm run test:ci
```

## Code Standards

- **TypeScript:** Use type annotations; avoid `any` where possible
- **Naming:** PascalCase for React components, camelCase for functions/variables
- **Comments:** Document complex logic; keep code self-explanatory
- **Commits:** Write clear, atomic commit messages (e.g., "feat: add thermal printer support")

## Pull Request Process

1. Fork or create a feature branch (`feature/short-description`)
2. Make changes with atomic commits
3. Run checks locally (`npm run check && npm run lint -- --fix && npm run test:ci`)
4. Push and open a PR against `main`
5. CI pipeline will validate automatically
6. Respond to feedback and iterate

## Common Tasks

### Adding a new screen
```bash
# Create screen component
touch app/new_feature.tsx  # Follow Expo Router conventions

# Add TypeScript types if needed
touch types/newFeature.ts
```

### Adding backend logic
```bash
# Create custom Appwrite function
mkdir -p functions/my-function
cd functions/my-function
npm init -y
# Add index.js with handler function
```

### Running tests
```bash
npm run test:ci       # CI mode (once)
npm run test          # Watch mode (for development)
```

## Reporting Issues

- Describe the bug/feature clearly
- Include steps to reproduce
- Mention your environment (Node version, OS, etc.)

## Questions?

- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Review existing code for patterns
- Open an issue or discussion

Happy coding! 🚀
