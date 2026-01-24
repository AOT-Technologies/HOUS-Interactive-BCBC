# BC Building Code Interactive - Command Reference

Complete reference guide for all commands used in the BC Building Code Interactive Web Application monorepo.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Development Commands](#development-commands)
- [Build Commands](#build-commands)
- [Testing & Quality](#testing--quality)
- [Package Management](#package-management)
- [Turborepo Commands](#turborepo-commands)
- [Workspace-Specific Commands](#workspace-specific-commands)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### First Time Setup

```bash
# 1. Install dependencies
npx pnpm install

# 2. Start development server
npx pnpm dev

# 3. Open browser to http://localhost:3000
```

### Daily Development

```bash
# Start dev server
npx pnpm dev

# In another terminal, watch for type errors
npx pnpm --filter @bc-building-code/web type-check --watch
```

---

## Development Commands

### Start Development Server

```bash
# Run all apps in development mode (recommended)
npx pnpm dev

# Or use Turbo directly
npx turbo dev

# Run specific workspace only
npx pnpm --filter @bc-building-code/web dev
```

**What it does:**
- Starts Next.js development server on `http://localhost:3000`
- Enables hot module replacement (HMR)
- Shows real-time compilation errors
- Runs in watch mode

**When to use:**
- Active development
- Testing changes locally
- Debugging

---

## Build Commands

### Production Build

```bash
# Build all packages and apps
npx pnpm build

# Or use Turbo directly
npx turbo build

# Build specific workspace
npx pnpm --filter @bc-building-code/web build
```

**What it does:**
- Compiles TypeScript to JavaScript
- Optimizes and minifies code
- Generates static HTML/CSS/JS in `apps/web/out/`
- Creates production-ready bundle

**Output location:** `apps/web/out/`

**When to use:**
- Before deployment
- Testing production build locally
- Verifying bundle size

### Start Production Server

```bash
# Start production server (after build)
npx pnpm --filter @bc-building-code/web start
```

**Note:** For static export, you can serve the `out/` directory with any static file server.

### Generate Static Assets

```bash
# Run asset generation pipeline (when implemented)
npx pnpm generate-assets

# Or use Turbo
npx turbo generate-assets
```

**What it does:**
- Parses BCBC JSON source
- Generates FlexSearch indexes
- Creates navigation tree
- Extracts glossary and metadata
- Chunks content by section

**Output location:** `apps/web/public/data/`

---

## Testing & Quality

### Type Checking

```bash
# Type check all packages
npx pnpm type-check

# Type check specific workspace
npx pnpm --filter @bc-building-code/web type-check

# Watch mode (continuous type checking)
npx pnpm --filter @bc-building-code/web type-check --watch
```

**What it does:**
- Runs TypeScript compiler in check mode
- Reports type errors without emitting files
- Validates strict mode compliance

### Linting

```bash
# Lint all packages
npx pnpm lint

# Or use Turbo
npx turbo lint

# Lint specific workspace
npx pnpm --filter @bc-building-code/web lint

# Auto-fix linting issues
npx pnpm --filter @bc-building-code/web lint --fix
```

**What it does:**
- Runs ESLint on all source files
- Checks code quality and style
- Reports warnings and errors

### Code Formatting

```bash
# Check formatting (all files)
npx pnpm --filter @bc-building-code/web exec prettier --check .

# Format all files
npx pnpm --filter @bc-building-code/web exec prettier --write .

# Format specific file or directory
npx pnpm --filter @bc-building-code/web exec prettier --write app/
```

**What it does:**
- Formats code according to `.prettierrc` rules
- Ensures consistent code style
- Fixes formatting issues automatically

### Run All Quality Checks

```bash
# Complete quality check before committing
npx pnpm --filter @bc-building-code/web type-check && \
npx pnpm --filter @bc-building-code/web lint && \
npx pnpm --filter @bc-building-code/web exec prettier --check .
```

---

## Package Management

### Install Dependencies

```bash
# Install all dependencies (root + all workspaces)
npx pnpm install

# Install in specific workspace
npx pnpm --filter @bc-building-code/web install

# Add dependency to specific workspace
npx pnpm --filter @bc-building-code/web add <package-name>

# Add dev dependency
npx pnpm --filter @bc-building-code/web add -D <package-name>

# Add dependency to root
npx pnpm add -w <package-name>
```

### Update Dependencies

```bash
# Update all dependencies
npx pnpm update

# Update specific package
npx pnpm update <package-name>

# Update to latest versions (interactive)
npx pnpm update --interactive --latest
```

### Remove Dependencies

```bash
# Remove from specific workspace
npx pnpm --filter @bc-building-code/web remove <package-name>

# Remove from root
npx pnpm remove -w <package-name>
```

### List Dependencies

```bash
# List all dependencies
npx pnpm list

# List dependencies for specific workspace
npx pnpm --filter @bc-building-code/web list

# List outdated dependencies
npx pnpm outdated
```

---

## Turborepo Commands

### Basic Turbo Commands

```bash
# Run task across all workspaces
npx turbo <task-name>

# Examples:
npx turbo dev
npx turbo build
npx turbo lint
npx turbo generate-assets
```

### Turbo with Filters

```bash
# Run task for specific workspace
npx turbo build --filter=@bc-building-code/web

# Run task for multiple workspaces
npx turbo build --filter=@bc-building-code/web --filter=@bc-building-code/ui

# Run task and its dependencies
npx turbo build --filter=@bc-building-code/web...
```

### Cache Management

```bash
# Clear Turbo cache
npx turbo clean

# Run without cache (force rebuild)
npx turbo build --force

# Run with cache info
npx turbo build --summarize
```

### Dry Run & Debugging

```bash
# See what Turbo will run (dry run)
npx turbo build --dry-run

# Verbose output
npx turbo build --verbose

# Show task graph
npx turbo build --graph
```

### Parallel Execution

```bash
# Run with specific concurrency
npx turbo build --concurrency=2

# Run tasks in parallel (default)
npx turbo build --parallel

# Run tasks serially
npx turbo build --concurrency=1
```

---

## Workspace-Specific Commands

### Web App (@bc-building-code/web)

```bash
# Development
npx pnpm --filter @bc-building-code/web dev

# Build
npx pnpm --filter @bc-building-code/web build

# Type check
npx pnpm --filter @bc-building-code/web type-check

# Lint
npx pnpm --filter @bc-building-code/web lint

# Format
npx pnpm --filter @bc-building-code/web exec prettier --write .

# Start production server
npx pnpm --filter @bc-building-code/web start
```

### BCBC Parser Package (when created)

```bash
# Build parser
npx pnpm --filter @bc-building-code/bcbc-parser build

# Run tests
npx pnpm --filter @bc-building-code/bcbc-parser test

# Type check
npx pnpm --filter @bc-building-code/bcbc-parser type-check
```

### Search Indexer Package (when created)

```bash
# Build indexer
npx pnpm --filter @bc-building-code/search-indexer build

# Run tests
npx pnpm --filter @bc-building-code/search-indexer test
```

### Content Chunker Package (when created)

```bash
# Build chunker
npx pnpm --filter @bc-building-code/content-chunker build

# Run tests
npx pnpm --filter @bc-building-code/content-chunker test
```

---

## Clean & Reset

### Clean Build Artifacts

```bash
# Clean all build outputs
npx pnpm clean

# Or use Turbo
npx turbo clean

# Clean specific workspace
npx pnpm --filter @bc-building-code/web exec rm -rf .next out dist
```

### Reset Everything

```bash
# Remove all node_modules and reinstall
npx pnpm clean && \
rm -rf node_modules apps/*/node_modules packages/*/node_modules && \
npx pnpm install

# Windows PowerShell version:
npx pnpm clean
Remove-Item -Recurse -Force node_modules, apps/*/node_modules, packages/*/node_modules
npx pnpm install
```

---

## Troubleshooting

### Common Issues

#### Issue: "pnpm: command not found"

**Solution:** Use `npx pnpm` instead of `pnpm`

```bash
npx pnpm install
npx pnpm dev
```

#### Issue: "Cannot find module" errors

**Solution:** Reinstall dependencies

```bash
npx pnpm install
```

#### Issue: Type errors after updating packages

**Solution:** Clean and rebuild

```bash
npx turbo clean
npx pnpm install
npx pnpm build
```

#### Issue: Port 3000 already in use

**Solution:** Kill the process or use different port

```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
PORT=3001 npx pnpm dev
```

#### Issue: Turbo cache issues

**Solution:** Clear cache and rebuild

```bash
npx turbo clean
npx turbo build --force
```

#### Issue: ESLint or Prettier errors

**Solution:** Auto-fix and format

```bash
npx pnpm --filter @bc-building-code/web lint --fix
npx pnpm --filter @bc-building-code/web exec prettier --write .
```

---

## Environment Variables

### Development

```bash
# Create .env.local file in apps/web/
touch apps/web/.env.local

# Add environment variables
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" >> apps/web/.env.local
```

### Production

```bash
# Create .env.production file
touch apps/web/.env.production

# Add production variables
echo "NEXT_PUBLIC_API_URL=https://bcbc.example.com" >> apps/web/.env.production
```

---

## Git Workflow Commands

### Before Committing

```bash
# 1. Format code
npx pnpm --filter @bc-building-code/web exec prettier --write .

# 2. Lint code
npx pnpm lint

# 3. Type check
npx pnpm --filter @bc-building-code/web type-check

# 4. Build to verify
npx pnpm build

# 5. Commit changes
git add .
git commit -m "Your commit message"
```

### Quick Pre-Commit Check

```bash
# Run all checks in one command
npx pnpm --filter @bc-building-code/web exec prettier --write . && \
npx pnpm lint && \
npx pnpm --filter @bc-building-code/web type-check && \
npx pnpm build
```

---

## Performance & Optimization

### Analyze Bundle Size

```bash
# Build and analyze
npx pnpm --filter @bc-building-code/web build

# Check output size
ls -lh apps/web/out/_next/static/chunks/
```

### Check Build Performance

```bash
# Build with timing info
npx turbo build --summarize

# Build with verbose output
npx turbo build --verbose
```

---

## Useful Aliases (Optional)

Add these to your shell profile (`.bashrc`, `.zshrc`, or PowerShell profile):

```bash
# Bash/Zsh
alias pnpm="npx pnpm"
alias turbo="npx turbo"
alias dev="npx pnpm dev"
alias build="npx pnpm build"
alias lint="npx pnpm lint"

# PowerShell
function pnpm { npx pnpm $args }
function turbo { npx turbo $args }
function dev { npx pnpm dev }
function build { npx pnpm build }
function lint { npx pnpm lint }
```

---

## CI/CD Commands

### GitHub Actions / CI Pipeline

```bash
# Install dependencies (CI)
npx pnpm install --frozen-lockfile

# Run all checks
npx pnpm lint
npx pnpm --filter @bc-building-code/web type-check
npx pnpm build

# Generate static assets
npx pnpm generate-assets
```

---

## Advanced Usage

### Run Custom Scripts

```bash
# Run custom script in workspace
npx pnpm --filter @bc-building-code/web exec node scripts/custom-script.js

# Run with environment variables
NODE_ENV=production npx pnpm build
```

### Workspace Dependencies

```bash
# Add local package as dependency
npx pnpm --filter @bc-building-code/web add @bc-building-code/ui@workspace:*

# Link local packages
npx pnpm install
```

### Debugging

```bash
# Run with Node debugger
node --inspect node_modules/.bin/next dev

# Run with verbose logging
DEBUG=* npx pnpm dev
```

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Install dependencies | `npx pnpm install` |
| Start dev server | `npx pnpm dev` |
| Build for production | `npx pnpm build` |
| Type check | `npx pnpm --filter @bc-building-code/web type-check` |
| Lint code | `npx pnpm lint` |
| Format code | `npx pnpm --filter @bc-building-code/web exec prettier --write .` |
| Clean build | `npx turbo clean` |
| Add dependency | `npx pnpm --filter @bc-building-code/web add <package>` |
| Update dependencies | `npx pnpm update` |
| Generate assets | `npx pnpm generate-assets` |

---

## Resources

- **Turborepo Docs:** https://turbo.build/repo/docs
- **pnpm Docs:** https://pnpm.io/
- **Next.js Docs:** https://nextjs.org/docs
- **TypeScript Docs:** https://www.typescriptlang.org/docs/

---

**Last Updated:** January 19, 2026  
**Version:** 1.0  
**Maintained by:** BC Building Code Interactive Team
