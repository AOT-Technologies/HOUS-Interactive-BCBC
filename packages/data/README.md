# @repo/data

Data types and hooks for the BC Building Code application.

## Contents

### Types

Comprehensive TypeScript type definitions for:

- **Document Structure**: `BCBCDocument`, `Division`, `Part`, `Section`, `Subsection`, `Article`
- **Content Elements**: `Clause`, `Table`, `Figure`, `Equation`
- **Glossary & Notes**: `GlossaryEntry`, `NoteReference`, `AmendmentDate`
- **Search**: `SearchResult`, `SearchFilters`
- **Navigation**: `NavigationNode`

### Hooks

- `useLocalStorage`: Hook for managing localStorage with React state

## Usage

### Types

```typescript
import type { Article, SearchResult, NavigationNode } from '@repo/data/types';

const article: Article = {
  id: '1.1.1.1',
  number: '1.1.1.1',
  title: 'Application',
  type: 'article',
  clauses: [],
  notes: [],
};
```

### Hooks

```typescript
import { useLocalStorage } from '@repo/data';

function MyComponent() {
  const [value, setValue] = useLocalStorage('my-key', 'default');
  
  return (
    <button onClick={() => setValue('new value')}>
      Update
    </button>
  );
}
```

## Type Guards

The package includes type guard functions for narrowing content node types:

```typescript
import { isDivision, isPart, isSection, isSubsection, isArticle } from '@repo/data/types';

if (isArticle(node)) {
  // TypeScript knows node is Article
  console.log(node.clauses);
}
```
