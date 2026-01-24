# BC Building Code Interactive Web Application

This is the Next.js web application for the BC Building Code Interactive project.

## Getting Started

First, install dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build

To create a production build:

```bash
pnpm build
```

This will generate a static export in the `out/` directory.

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/` - React components
- `hooks/` - Custom React hooks
- `lib/` - Utility libraries and helpers
- `public/data/` - Generated static assets from build pipeline
- `styles/` - Theme configuration and global styles

## Configuration

- **TypeScript**: Strict mode enabled in `tsconfig.json`
- **ESLint**: Configured with Next.js and Prettier rules
- **Prettier**: Code formatting configuration in `.prettierrc`
- **Next.js**: Static export configured in `next.config.js`
