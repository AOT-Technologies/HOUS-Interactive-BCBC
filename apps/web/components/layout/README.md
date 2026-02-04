# MainLayout Component

The `MainLayout` component is the main application layout that provides conditional sidebar rendering and responsive behavior across all breakpoints.

## Features

- **Conditional Sidebar**: Shows sidebar on Homepage and Content Reading Page, hides on Search Results and Download pages
- **Three-Panel Layout**: Desktop layout with sidebar + content panel (≥ 1024px)
- **Full-Width Layout**: Search Results and Download pages use full-width content
- **Responsive Design**: 
  - Mobile (< 768px): Stacked layout with drawer sidebar
  - Tablet (768px - 1023px): Collapsible sidebar drawer
  - Desktop (≥ 1024px): Side-by-side sidebar and content
- **Accessibility**: WCAG AAA compliant with proper semantic HTML

## Usage

### Homepage or Content Reading Page (with sidebar)

```tsx
import { MainLayout } from '@/components/layout';
import NavigationTree from '@/components/navigation/NavigationTree';

export default function HomePage() {
  return (
    <MainLayout 
      showSidebar 
      sidebarContent={<NavigationTree />}
    >
      <h1>Welcome to BC Building Code</h1>
      <p>Content goes here...</p>
    </MainLayout>
  );
}
```

### Search Results or Download Page (full-width)

```tsx
import { MainLayout } from '@/components/layout';

export default function SearchResultsPage() {
  return (
    <MainLayout>
      <h1>Search Results</h1>
      <SearchResults />
    </MainLayout>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Content to display in the main content area |
| `showSidebar` | `boolean` | `false` | Whether to show the sidebar (TOC navigation) |
| `sidebarContent` | `ReactNode` | - | Content to display in the sidebar (typically NavigationTree) |
| `className` | `string` | `""` | Custom CSS class name |
| `data-testid` | `string` | `"main-layout"` | Test ID for testing |

## Layout Behavior

### With Sidebar (Homepage, Content Reading Page)

**Desktop (≥ 1024px)**:
- Sidebar: Fixed width (320px default, collapsible to 60px)
- Content: Takes remaining space with optimal reading width

**Tablet (768px - 1023px)**:
- Sidebar: Collapsible drawer overlay
- Content: Full width when sidebar is closed

**Mobile (< 768px)**:
- Sidebar: Drawer overlay (modal)
- Content: Full width, stacked layout

### Without Sidebar (Search Results, Download Page)

**All Breakpoints**:
- Content: Full-width layout
- No sidebar rendered
- Maximum content width: 1600px

## CSS Classes

- `.MainLayout`: Base layout container
- `.MainLayout--full-width`: Full-width layout (no sidebar)
- `.MainLayout--with-sidebar`: Three-panel layout (with sidebar)

## Responsive Breakpoints

- Mobile: `< 768px` (48rem)
- Tablet: `768px - 1023px` (48rem - 64rem)
- Desktop: `≥ 1024px` (64rem)
- Desktop Large: `≥ 1200px` (75rem)
- Desktop XLarge: `≥ 1504px` (94rem)

## Accessibility

- Semantic HTML structure (`<aside>`, `<main>`)
- Keyboard navigation support
- Focus management for sidebar drawer
- ARIA labels for interactive elements
- High contrast mode support
- Reduced motion support

## Testing

Run tests with:

```bash
npx pnpm test
```

The component has comprehensive unit tests covering:
- Full-width layout rendering
- Three-panel layout rendering
- Custom props handling
- Content rendering
- Layout structure
- Accessibility features

## Related Components

- `Sidebar` (`@repo/ui/sidebar`): Collapsible sidebar with drawer behavior
- `ContentPanel` (`@repo/ui/content-panel`): Main content display area
- `Header` (`@repo/ui/header`): Application header (rendered in root layout)
- `Footer` (`@repo/ui/footer`): Application footer (rendered in root layout)

## Requirements

Implements requirements:
- 9.1: Responsive layout
- 9.2: Three-panel layout on desktop
- 9.3: Conditional sidebar visibility
- 9.4: Full-width layout for Search Results and Download pages
- 9.6: Responsive behavior for tablet and mobile
