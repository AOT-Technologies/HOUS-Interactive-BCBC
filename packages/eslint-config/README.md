# @repo/eslint-config

Shared ESLint configurations for the BC Building Code monorepo.

## Available Configurations

- **index.js**: Base ESLint configuration
- **next.js**: Configuration for Next.js applications

## Usage

In your package's `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['@repo/eslint-config'],
};
```

For Next.js apps:

```javascript
module.exports = {
  extends: ['@repo/eslint-config/next'],
};
```
