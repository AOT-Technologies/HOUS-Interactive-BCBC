# BC Design System Integration

## Overview

The BC Building Code application uses the BC Design System UI component library to ensure consistency with BC Government design standards and maintain WCAG AAA accessibility compliance.

## Package Structure

The design system is organized into three packages:

### 1. @repo/ui
Location: `/packages/ui`

The main UI component library with BC Design System components.

**Layout Components**:
- `Header` - Application header with navigation
- `Footer` - BC Government footer
- `PreFooter` - Pre-footer content section

**Form Components**:
- `Button` - Primary, secondary, tertiary variants
- `CheckboxCard` - Card-style checkbox
- `CheckboxGroup` - Checkbox group with validation
- `RadioGroup` - Radio button group
- `NumberField` - Numeric input field
- `InputError` - Form error messages

**Navigation Components**:
- `Link` - Styled link with external indicators
- `LinkCard` - Card-style navigation

**Modal Components**:
- `ModalSide` - Side panel modal
- `ModalGlossaryContent` - Glossary modal content
- `ButtonModalClose` - Modal close button
- `ConfirmationModal` - Confirmation dialog

**Display Components**:
- `Icon` - Icon library (Check, Close, Menu, Arrow, etc.)
- `Image` - Optimized image component
- `Tooltip` - Accessible tooltips

**Specialized Components**:
- `ResultPDFButton` - PDF export button
- `ResultPDFPrintContent` - Print layout

### 2. @repo/constants
Location: `/packages/constants`

Shared constants across the application.

**Exports**:
- `URLS` - External links (BC Gov, privacy, copyright)
- `IDS` - HTML element IDs for accessibility
- `TEST_IDS` - Data test IDs for testing
- `API_ENDPOINTS` - Data file paths
- `STORAGE_KEYS` - LocalStorage keys
- `APP_CONFIG` - Application configuration

### 3. @repo/data
Location: `/packages/data`

Data types and React hooks.

**Types**:
- Document structure types (`BCBCDocument`, `Division`, `Part`, `Section`, `Article`)
- Content types (`Clause`, `Table`, `Figure`, `Equation`)
- Glossary and notes (`GlossaryEntry`, `NoteReference`)
- Search types (`SearchResult`, `SearchFilters`)
- Navigation types (`NavigationNode`)

**Hooks**:
- `useLocalStorage` - LocalStorage with React state

## Design Tokens

The BC Design System uses CSS variables defined in `/packages/ui/src/variables.css`:

**Color System**:
- Primary colors for branding
- Semantic colors (success, warning, error, info)
- Text colors with WCAG AAA contrast
- Background and surface colors
- Border colors

**Typography**:
- BC Sans font family
- Font sizes and weights
- Line heights
- Heading styles (h1-h6)

**Spacing**:
- Consistent spacing scale
- Component padding/margins
- Layout gaps

**Accessibility**:
- WCAG AAA compliant colors
- Focus indicators
- Screen reader support
- Keyboard navigation

## Usage Examples

### Layout Structure

```typescript
import { Header } from '@repo/ui/header/Header';
import { Footer } from '@repo/ui/footer/Footer';
import { PreFooter } from '@repo/ui/pre-footer/PreFooter';

export function Layout({ children }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <PreFooter />
      <Footer />
    </>
  );
}
```

### Form Components

```typescript
import { Button } from '@repo/ui/button/Button';
import { CheckboxGroup } from '@repo/ui/checkbox-group/CheckboxGroup';
import { RadioGroup } from '@repo/ui/radio-group/RadioGroup';

export function FilterForm() {
  return (
    <form>
      <CheckboxGroup
        label="Content Types"
        options={[
          { value: 'article', label: 'Articles' },
          { value: 'note', label: 'Notes' },
        ]}
      />
      <Button variant="primary">Apply Filters</Button>
    </form>
  );
}
```

### Modal Components

```typescript
import { ModalSide } from '@repo/ui/modal-side/ModalSide';
import { ButtonModalClose } from '@repo/ui/button-modal-close/ButtonModalClose';

export function GlossaryModal({ term, definition, isOpen, onClose }) {
  return (
    <ModalSide isOpen={isOpen} onClose={onClose}>
      <ButtonModalClose onClick={onClose} />
      <h2>{term}</h2>
      <p>{definition}</p>
    </ModalSide>
  );
}
```

### Icons

```typescript
import { Icon } from '@repo/ui/icon/Icon';

export function SearchButton() {
  return (
    <button>
      <Icon name="search" />
      Search
    </button>
  );
}
```

### Using Constants

```typescript
import { URLS, IDS, TEST_IDS, STORAGE_KEYS } from '@repo/constants';

// Accessibility IDs
<main id={IDS.MAIN_CONTENT}>...</main>

// Test IDs
<button data-testid={TEST_IDS.SEARCH_BUTTON}>Search</button>

// External links
<a href={URLS.BC_GOV_HOME}>BC Government</a>

// LocalStorage
localStorage.setItem(STORAGE_KEYS.AMENDMENT_DATE, date);
```

### Using Types

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

### Using Hooks

```typescript
import { useLocalStorage } from '@repo/data/hooks';

export function AmendmentFilter() {
  const [selectedDate, setSelectedDate] = useLocalStorage('amendment-date', null);
  
  return (
    <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
      <option value="">All Dates</option>
      <option value="2024-01-01">January 2024</option>
    </select>
  );
}
```

## Component Testing

All UI components include test files:

```typescript
// Example: Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

## Accessibility Features

All components include:

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Proper ARIA attributes
- **Focus Management**: Visible focus indicators
- **Screen Reader Support**: Semantic HTML and ARIA
- **Color Contrast**: WCAG AAA compliant (7:1 for normal text)

## Responsive Design

Components adapt to different screen sizes:

- **Mobile** (< 768px): Touch-optimized, stacked layouts
- **Tablet** (768px - 1023px): Collapsible sidebars
- **Desktop** (≥ 1024px): Full multi-panel layouts

## Customization

### CSS Variables

Override design tokens in your application:

```css
:root {
  --color-primary: #003366;
  --color-secondary: #fcba19;
  --font-family-base: 'BC Sans', 'Noto Sans', Arial, sans-serif;
}
```

### Component Props

Most components accept standard HTML props plus custom variants:

```typescript
<Button variant="primary" size="large" disabled={false}>
  Submit
</Button>
```

## Development Workflow

### Adding New Components

1. Create component in `/packages/ui/src/[component-name]/`
2. Include TypeScript file, CSS file, and test file
3. Export from component directory
4. Document usage in component README

### Running Tests

```bash
# Run all UI tests
cd packages/ui
pnpm test

# Run specific test
pnpm test Button.test.tsx
```

### Type Checking

```bash
# Check types across all packages
pnpm type-check
```

## Migration Notes

The BC Design System components replace the need for:

- Custom button implementations → Use `@repo/ui/button/Button`
- Custom modal implementations → Use `@repo/ui/modal-side/ModalSide`
- Custom form components → Use `@repo/ui` form components
- Inline styles → Use BC Design System CSS variables

## Resources

- **Component Documentation**: See individual README files in `/packages/ui/src/`
- **Design Tokens**: `/packages/ui/src/variables.css`
- **Type Definitions**: `/packages/data/src/types/`
- **Constants**: `/packages/constants/src/index.ts`

## Support

For questions or issues with BC Design System components:

1. Check component README files
2. Review test files for usage examples
3. Consult BC Design System documentation
4. Review accessibility guidelines for WCAG AAA compliance
