# Navigation Components

This directory contains components for hierarchical navigation within the BC Building Code application.

## Components

### NavigationTree

A recursive tree component that displays the hierarchical structure of the BC Building Code (Division → Part → Section → Subsection → Article).

**Features:**
- Recursive tree rendering with unlimited depth
- Expand/collapse controls for nodes with children
- Click handlers for navigation
- Full keyboard navigation support (Enter, Space, Arrow keys)
- Active node highlighting
- Scroll-to-active functionality
- WCAG AAA accessible

**Usage:**

```tsx
import { NavigationTree } from '@/components/navigation';

function Sidebar() {
  const handleNodeClick = (node) => {
    console.log('Navigating to:', node.path);
  };

  return (
    <NavigationTree 
      className="my-custom-class"
      onNodeClick={handleNodeClick}
    />
  );
}
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `className` | `string` | No | Optional CSS class for styling |
| `onNodeClick` | `(node: NavigationNode) => void` | No | Callback when a node is clicked |

**Integration:**

The NavigationTree component integrates with the Zustand navigation store (`useNavigationStore`) for state management:

- `navigationTree`: The hierarchical data structure
- `expandedNodes`: Set of expanded node IDs
- `currentPath`: Current active path for highlighting
- `toggleNode`: Function to expand/collapse nodes
- `setCurrentPath`: Function to update current path

**Keyboard Navigation:**

- **Enter/Space**: Toggle expansion and navigate to node
- **ArrowRight**: Expand collapsed node (if it has children)
- **ArrowLeft**: Collapse expanded node (if it has children)
- **Tab**: Move focus between nodes

**Accessibility:**

- Semantic HTML with `<nav>` and `<button>` elements
- ARIA attributes: `aria-expanded`, `aria-current`, `aria-label`
- Visible focus indicators (WCAG AAA compliant)
- Screen reader support with proper role attributes
- Keyboard navigation for all interactive elements

**Requirements Satisfied:**

- **4.1**: Display collapsible navigation tree in sidebar
- **4.2**: Show Division → Part → Section → Subsection → Article hierarchy
- **4.3**: Expand/collapse node children on click
- **4.4**: Navigate to corresponding content on click
- **4.5**: Highlight current location in navigation tree
- **10.1**: Full keyboard navigation support

## Styling

Components use CSS modules with BC Design System variables for theming. Styles are responsive and follow mobile-first design principles.

**Breakpoints:**
- Mobile: < 768px (larger tap targets, vertical stacking)
- Tablet: 768px - 1023px (optimized spacing)
- Desktop: ≥ 1024px (full layout)

## Testing

All components have comprehensive unit tests covering:
- Rendering and display
- User interactions (click, keyboard)
- State management integration
- Accessibility features
- Requirements validation

Run tests:
```bash
npx pnpm test apps/web/components/navigation
```

### Breadcrumbs

A component that displays a hierarchical breadcrumb trail showing the current location in the code structure. Each breadcrumb is clickable and navigates to the corresponding parent level.

**Features:**
- Hierarchical path display (Division > Part > Section > Subsection > Article)
- Clickable breadcrumb items for navigation
- Responsive truncation for mobile devices
- Integrates with navigation store
- WCAG AAA accessible

**Usage:**

```tsx
import { Breadcrumbs } from '@/components/navigation';

function ContentHeader() {
  const handleBreadcrumbClick = (node) => {
    console.log('Navigating to:', node.path);
  };

  return (
    <Breadcrumbs 
      className="my-custom-class"
      onBreadcrumbClick={handleBreadcrumbClick}
    />
  );
}
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `className` | `string` | No | Optional CSS class for styling |
| `onBreadcrumbClick` | `(node: NavigationNode) => void` | No | Callback when a breadcrumb is clicked |

**Integration:**

The Breadcrumbs component integrates with the Zustand navigation store (`useNavigationStore`):

- `navigationTree`: Used to build the breadcrumb trail
- `currentPath`: Determines which breadcrumbs to display

**Breadcrumb Format:**

The breadcrumb format is dynamic based on the current hierarchy level:

- **Part**: `Division > Part`
- **Section**: `Division > Part > Section`
- **Subsection**: `Division > Part > Section > Subsection`
- **Article**: `Division > Part > Section > Subsection > Article`

**Examples:**

- Part: `Division A > Part 1`
- Section: `Division A > Part 1 > Section 1.1`
- Article: `Division A > Part 1 > Section 1.1 > Subsection 1.1.1 > Article 1.1.1.1`

**Responsive Behavior:**

- **Mobile (< 768px)**: Truncates middle breadcrumb titles to 80px, last to 120px
- **Tablet (768px - 1023px)**: Truncates non-last titles to 150px, last to 200px
- **Desktop (≥ 1024px)**: No truncation

**Accessibility:**

- Semantic HTML with `<nav>` and `<ol>` elements
- ARIA attributes: `aria-label`, `aria-current="page"` for current location
- Separators marked with `aria-hidden="true"`
- Visible focus indicators (WCAG AAA compliant)
- Screen reader support with descriptive labels

**Requirements Satisfied:**

- **4.6**: Display breadcrumb trail showing current location hierarchy
- **9.3**: Implement responsive truncation for mobile

## Future Components

The following components will be added to this directory:

- **PrevNextNav**: Sequential navigation buttons (Task 16.5) ✅ COMPLETED

## PrevNextNav

A component that provides Previous and Next navigation buttons for sequential browsing through the building code structure at the current hierarchy level.

**Features:**
- Sequential navigation at current hierarchy level
- Disabled state at boundaries (first/last item)
- Keyboard shortcuts (Alt + Arrow keys)
- Displays title of previous/next item
- Respects hierarchical order
- WCAG AAA accessible

**Usage:**

```tsx
import { PrevNextNav } from '@/components/navigation';

function ContentFooter() {
  const handlePrevClick = (node) => {
    console.log('Navigating to previous:', node.path);
  };

  const handleNextClick = (node) => {
    console.log('Navigating to next:', node.path);
  };

  return (
    <PrevNextNav 
      className="my-custom-class"
      onPrevClick={handlePrevClick}
      onNextClick={handleNextClick}
    />
  );
}
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `className` | `string` | No | Optional CSS class for styling |
| `onPrevClick` | `(node: NavigationNode) => void` | No | Callback when previous button is clicked |
| `onNextClick` | `(node: NavigationNode) => void` | No | Callback when next button is clicked |

**Integration:**

The PrevNextNav component integrates with the Zustand navigation store (`useNavigationStore`):

- `navigationTree`: Used to calculate previous/next nodes
- `currentPath`: Determines current position in hierarchy
- `setCurrentPath`: Updates path when navigating

**Behavior by Level:**

The component navigates sequentially within the same hierarchy level:

- **Part Level**: Previous/Next Part within Division
- **Section Level**: Previous/Next Section within Part
- **Subsection Level**: Previous/Next Subsection within Section
- **Article Level**: Previous/Next Article within Subsection

**Keyboard Shortcuts:**

- **Alt + Left Arrow**: Navigate to previous item (if available)
- **Alt + Right Arrow**: Navigate to next item (if available)
- Shortcuts are disabled when focus is in input/textarea elements

**Boundary Conditions:**

- **First Item**: Previous button is disabled
- **Last Item**: Next button is disabled
- **Single Item**: Both buttons are disabled

**Button Format:**

- **Previous**: `← Previous: [Number] [Title]`
- **Next**: `Next: [Number] [Title] →`

**Responsive Behavior:**

- **Mobile (< 768px)**: Buttons stack vertically with larger tap targets (3.5rem)
- **Tablet (768px - 1023px)**: Buttons side-by-side with optimized spacing
- **Desktop (≥ 1024px)**: Full layout with maximum spacing

**Accessibility:**

- Semantic HTML with `<nav>` element
- ARIA attributes: `aria-label` with descriptive text
- Disabled state properly communicated to screen readers
- Arrow icons marked with `aria-hidden="true"`
- Visible focus indicators (WCAG AAA compliant)
- Keyboard shortcuts for efficient navigation

**Requirements Satisfied:**

- **4.7**: Provide Previous and Next navigation buttons for sequential browsing
- **10.1**: Full keyboard navigation support
