# @repo/typescript-config

Shared TypeScript configurations for the BC Building Code monorepo.

## Available Configurations

- **base.json**: Base TypeScript configuration for all packages
- **nextjs.json**: Configuration for Next.js applications
- **react-library.json**: Configuration for React library packages

## Usage

In your package's `tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

For Next.js apps:

```json
{
  "extends": "@repo/typescript-config/nextjs.json"
}
```

For React libraries:

```json
{
  "extends": "@repo/typescript-config/react-library.json"
}
```
