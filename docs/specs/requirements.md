# Requirements Document

## Introduction

This document specifies the requirements for the BC Building Code Interactive Web Application - a free, publicly accessible web application that transforms the British Columbia Building Code (BCBC) from a difficult-to-navigate PDF into an intuitive, searchable web interface. The application currently supports the 2024 version of the building code, with infrastructure designed to support future versions. It enables building officials, construction professionals, and the public to efficiently search, navigate, and understand the 2000+ page technical building code document.

## Glossary

- **BCBC**: British Columbia Building Code - the authoritative building code document for BC
- **Application**: The BC Building Code Interactive Web Application system
- **User**: Any person accessing the web application (building officials, construction professionals, public)
- **Search_Engine**: The FlexSearch-based client-side search functionality
- **Content_Loader**: The system component responsible for lazy loading code content
- **Navigation_Tree**: The hierarchical table of contents structure
- **Glossary_Term**: A defined term from the BCBC glossary that appears in code content
- **Article**: A numbered provision in the building code (e.g., 1.1.1.1) containing one or more sentences
- **Amendment_Date**: An effective date for code amendments that filters visible content
- **Static_Asset**: Pre-generated JSON files containing indexes, navigation, and content
- **Build_Pipeline**: The build-time process that generates static assets from BCBC JSON

## Requirements

### Requirement 1: Project Structure and Monorepo Setup

**User Story:** As a developer, I want a well-organized monorepo structure, so that I can efficiently develop and maintain the application with clear separation of concerns.

#### Acceptance Criteria

1. THE Application SHALL use Turborepo for monorepo management
2. THE Application SHALL use pnpm as the package manager
3. THE Application SHALL organize code into apps/ and packages/ directories
4. THE Application SHALL include a Next.js 16+ application in apps/web using App Router
5. THE Application SHALL include shared packages for bcbc-parser, search-indexer, content-chunker, and ui components
6. THE Application SHALL use TypeScript in strict mode for all code
7. THE Application SHALL define a turbo.json configuration with build, dev, lint, and generate-assets pipelines

### Requirement 2: Build Pipeline and Static Asset Generation

**User Story:** As a developer, I want a build pipeline that generates static assets from BCBC JSON, so that the application can operate entirely client-side without a backend.

#### Acceptance Criteria

1. WHEN the build pipeline executes, THE Build_Pipeline SHALL parse the BCBC JSON source file
2. WHEN the build pipeline executes, THE Build_Pipeline SHALL generate a FlexSearch index file
3. WHEN the build pipeline executes, THE Build_Pipeline SHALL generate a navigation tree JSON file
4. WHEN the build pipeline executes, THE Build_Pipeline SHALL generate a glossary map JSON file
5. WHEN the build pipeline executes, THE Build_Pipeline SHALL generate an amendment dates JSON file
6. WHEN the build pipeline executes, THE Build_Pipeline SHALL generate a content types JSON file listing all available content types (Article, Table, Figure, Note, Application Note)
7. WHEN the build pipeline executes, THE Build_Pipeline SHALL generate a quick access JSON file with frequently accessed sections
8. WHEN the build pipeline executes, THE Build_Pipeline SHALL split content into optimized JSON chunks by division/part/section
9. THE Build_Pipeline SHALL output all generated assets to apps/web/public/data/ (legacy single-version) or apps/web/public/data/{versionId}/ (multi-version)
10. THE Build_Pipeline SHALL complete successfully before the Next.js build starts

### Requirement 3: Full-Text Search with FlexSearch

**User Story:** As a user, I want to search the building code by keywords, so that I can quickly find relevant sections without manually browsing.

#### Acceptance Criteria

1. WHEN a user enters a search query, THE Search_Engine SHALL return matching results within 100ms
2. WHEN a user enters a search query, THE Search_Engine SHALL search across article titles, sentence text, clause text, notes, and glossary terms
3. WHEN displaying search results, THE Application SHALL show the article number, title, matched snippet, and hierarchical breadcrumb path
4. WHEN displaying search results, THE Application SHALL rank results by relevance score
5. WHEN displaying search results, THE Application SHALL implement infinite scroll loading results in batches of 20-50 items
6. WHEN displaying search results, THE Application SHALL display a search input box that auto-populates with the query from the URL
7. THE Search_Engine SHALL support fuzzy matching for misspelled queries
8. THE Search_Engine SHALL support phrase search using quoted strings
9. WHEN a user clicks a search result, THE Application SHALL navigate to the corresponding content page

### Requirement 3A: Search Filters and Advanced Search

**User Story:** As a user, I want to filter search results by division, part, content type, and effective date, so that I can narrow down results to relevant sections.

#### Acceptance Criteria

1. THE Application SHALL provide a division filter with options for Division A, B, and C
2. THE Application SHALL provide a part filter that loads options dynamically based on selected division
3. THE Application SHALL provide a content type filter with options for Article, Table, Figure, Note, and Application Note
4. THE Application SHALL provide an effective date filter that applies to search results
5. WHEN a user applies any filter, THE Application SHALL update the URL query parameters to include the filter
6. WHEN a user loads a URL with filter parameters, THE Application SHALL apply those filters and display filtered results
7. THE Application SHALL load filter options from pre-generated metadata JSON files (navigation-tree.json, content-types.json, amendment-dates.json)
8. WHEN a user clears a filter, THE Application SHALL remove the corresponding query parameter from the URL
9. THE Application SHALL display active filters as removable chips

### Requirement 4: Hierarchical Navigation

**User Story:** As a user, I want to browse the building code using a hierarchical table of contents, so that I can explore the code structure and navigate to specific sections.

#### Acceptance Criteria

1. THE Application SHALL display a collapsible navigation tree in the left sidebar
2. THE Navigation_Tree SHALL show the hierarchy: Division → Part → Section → Subsection → Article
3. WHEN a user clicks a navigation node, THE Application SHALL expand/collapse that node's children
4. WHEN a user clicks a navigation node, THE Application SHALL navigate to the corresponding content
5. WHEN displaying content, THE Application SHALL highlight the current location in the navigation tree
6. THE Application SHALL display a breadcrumb trail on all pages showing the current location hierarchy
   - Homepage: "Home"
   - Search Results: "Home > Search Results"
   - Download: "Home > Download"
   - Content Reading: "Home > Division > Part > Section > Subsection > Article" (varies by hierarchy level)
7. THE Application SHALL provide Previous and Next navigation buttons for sequential browsing
8. WHEN a user navigates to a page, THE Application SHALL update the URL to reflect the current location
9. WHEN a user shares or bookmarks a URL, THE Application SHALL load the correct content on page load

### Requirement 5: Content Rendering

**User Story:** As a user, I want to view building code content with proper formatting, so that I can read and understand the technical requirements.

#### Acceptance Criteria

1. WHEN displaying content, THE Application SHALL render content at any hierarchical level: Part, Section, Subsection, or Article
2. WHEN displaying a Part, THE Application SHALL show the Part title, overview, and list of child Sections
3. WHEN displaying a Section, THE Application SHALL show the Section title, content, and list of child Subsections
4. WHEN displaying a Subsection, THE Application SHALL show the Subsection title, content, and list of child Articles
5. WHEN displaying an Article, THE Application SHALL render numbered sentences and lettered clauses with proper hierarchical indentation
6. WHEN displaying content with tables, THE Application SHALL render tables with proper headers, merged cells, and formatting
7. WHEN displaying content with figures, THE Application SHALL render images with captions and reference numbers
8. WHEN displaying content with equations, THE Application SHALL render mathematical formulas correctly
9. WHEN displaying content with cross-references, THE Application SHALL render clickable links to other code sections
10. THE Content_Loader SHALL lazy load content JSON chunks only when needed
11. WHEN lazy loading content, THE Content_Loader SHALL complete loading within 500ms
12. THE Application SHALL support direct URL access to any hierarchy level (Part, Section, Subsection, Article) with proper state restoration

### Requirement 6: Inline Glossary

**User Story:** As a user, I want to see definitions of technical terms inline, so that I can understand terminology without leaving the current page.

#### Acceptance Criteria

1. WHEN displaying content, THE Application SHALL identify and style glossary terms distinctly (italic and underlined)
2. WHEN a user clicks a glossary term, THE Application SHALL display a popover or modal with the term definition
3. WHEN displaying a glossary definition, THE Application SHALL provide a copy-to-clipboard button
4. WHEN a user clicks outside the glossary popover, THE Application SHALL close the popover
5. THE Application SHALL load the glossary map on application initialization

### Requirement 7: Amendment Date Filtering

**User Story:** As a user, I want to filter content by effective date, so that I can view the building code as it applies to a specific date.

#### Acceptance Criteria

1. THE Application SHALL display an amendment date dropdown filter in the header
2. WHEN a user selects an amendment date, THE Application SHALL filter all displayed content to show only content effective on that date
3. WHEN a user selects an amendment date, THE Application SHALL filter search results to match the selected date
4. WHEN a user selects an amendment date, THE Application SHALL persist the selection in the URL query parameters
5. WHEN a user selects an amendment date, THE Application SHALL persist the selection in localStorage
6. WHEN a user loads the application, THE Application SHALL restore the previously selected amendment date from localStorage or URL

### Requirement 8: Appendix Notes

**User Story:** As a user, I want to view appendix notes linked to articles, so that I can access additional explanatory information.

#### Acceptance Criteria

1. WHEN displaying content with note references, THE Application SHALL render note links as styled badges (e.g., "A-1.1.1.1.(3)")
2. WHEN a user clicks a note link, THE Application SHALL display a modal with the full note content
3. WHEN displaying a note modal, THE Application SHALL show the note number, title, and content
4. WHEN displaying a note modal, THE Application SHALL provide a close button
5. IF a note references another code section, THEN THE Application SHALL provide a navigation link to that section

### Requirement 8A: Content Export

**User Story:** As a user, I want to export the currently displayed content as a PDF, so that I can save or print specific sections for offline reference.

#### Acceptance Criteria

1. THE Application SHALL provide an "Export PDF" button on the Content Reading Page
2. WHEN a user clicks the Export PDF button, THE Application SHALL generate a PDF of the currently rendered content
3. THE exported PDF SHALL include all visible content at the current hierarchy level (Part, Section, Subsection, or Article)
4. THE exported PDF SHALL preserve formatting including tables, figures, and text hierarchy
5. THE exported PDF SHALL use a filename based on the code reference (e.g., "BCBC-Division-B-Part-3-Section-3-2.pdf")
6. THE Application SHALL provide a print option that opens the browser print dialog with print-optimized layout

### Requirement 9: Responsive Layout

**User Story:** As a user, I want the application to work seamlessly on different screen sizes, so that I can access the building code on desktop, tablet, or mobile devices with an optimal experience.

#### Acceptance Criteria

1. THE Application SHALL implement a mobile-first responsive design following Figma specifications
2. THE Application SHALL use a three-panel layout on desktop: search/results, navigation tree, and content
3. THE Application SHALL display the navigation tree sidebar ONLY on Homepage and Content Reading Page
4. THE Application SHALL NOT display the navigation tree sidebar on Search Results Page and Download Page (full-width layout)
5. WHEN the viewport width is less than 1024px, THE Application SHALL collapse the navigation tree into a toggleable sidebar matching Figma tablet specifications
6. WHEN the viewport width is less than 768px, THE Application SHALL stack panels vertically following Figma mobile layout specifications
7. THE Application SHALL maintain readability and usability at all supported viewport sizes
8. THE Application SHALL support text scaling up to 200% without horizontal scrolling
9. THE Application SHALL match Figma design specifications for all breakpoints including spacing, typography, and component behavior

### Requirement 10: Accessibility Compliance

**User Story:** As a user with disabilities, I want the application to be fully accessible, so that I can use assistive technologies to access the building code.

#### Acceptance Criteria

1. THE Application SHALL support full keyboard navigation for all interactive elements
2. THE Application SHALL provide visible focus indicators with minimum 3:1 contrast ratio
3. THE Application SHALL use semantic HTML with proper heading hierarchy
4. THE Application SHALL provide ARIA labels for all interactive components
5. THE Application SHALL use ARIA live regions for dynamic content updates (search results)
6. THE Application SHALL provide skip links to main content and search
7. THE Application SHALL maintain color contrast ratios of at least 7:1 for normal text (WCAG AAA)
8. THE Application SHALL maintain color contrast ratios of at least 4.5:1 for large text (WCAG AAA)
9. WHEN a modal opens, THE Application SHALL trap keyboard focus within the modal
10. WHEN a modal closes, THE Application SHALL return focus to the triggering element

### Requirement 11: Performance Optimization

**User Story:** As a user, I want the application to load and respond quickly, so that I can efficiently search and navigate the building code.

#### Acceptance Criteria

1. THE Application SHALL achieve First Contentful Paint in less than 1.5 seconds
2. THE Application SHALL achieve Time to Interactive in less than 3 seconds
3. THE Application SHALL have an initial bundle size less than 200KB gzipped
4. THE Application SHALL achieve a Lighthouse Performance score greater than 90
5. WHEN searching, THE Search_Engine SHALL return results in less than 100ms
6. WHEN lazy loading content, THE Content_Loader SHALL complete in less than 500ms

### Requirement 12: Static Site Generation

**User Story:** As a developer, I want the application to be deployable as static files, so that it can be hosted without backend infrastructure.

#### Acceptance Criteria

1. THE Application SHALL use Next.js static export to generate static HTML, CSS, and JavaScript files
2. THE Application SHALL include all pre-generated static assets in the build output
3. THE Application SHALL function correctly when served from a static file server
4. THE Application SHALL support client-side routing without server-side rendering
5. THE Application SHALL be deployable to BC Government OpenShift as a containerized static site

### Requirement 13: Data Type Definitions

**User Story:** As a developer, I want comprehensive TypeScript type definitions, so that I can work with BCBC data structures with type safety.

#### Acceptance Criteria

1. THE Application SHALL define TypeScript interfaces for BCBCDocument, Division, Part, Section, Subsection, Article, and Sentence
2. THE Application SHALL define TypeScript interfaces for Clause, Subclause, Table, Figure, Equation, and NoteReference
3. THE Application SHALL define TypeScript interfaces for GlossaryEntry and AmendmentDate
4. THE Application SHALL define TypeScript interfaces for SearchResult, SearchFilters, and NavigationNode
5. THE Application SHALL export all type definitions from a shared package
6. THE Application SHALL use strict TypeScript mode with no implicit any types

### Requirement 14: UI Component Library

**User Story:** As a developer, I want to use a consistent component library aligned with BC Design System, so that the UI is cohesive and follows government design standards.

#### Acceptance Criteria

1. THE Application SHALL use the BC Design System UI package (@repo/ui) for all UI components
2. THE Application SHALL use BC Design System components including Button, Header, Footer, Link, Modal, Checkbox, Radio, Icon, and Alert components
3. THE Application SHALL implement all components following BC Design System specifications including spacing, typography, colors, and interactive states
4. THE Application SHALL use BC Design System layout components (Header, Footer, PreFooter) for consistent page structure
5. THE Application SHALL define reusable application-specific components for search, navigation, content rendering, and glossary that compose BC Design System primitives
6. THE Application SHALL organize components by feature area (layout, search, navigation, content, glossary, notes)
7. THE Application SHALL maintain design consistency across all breakpoints (mobile, tablet, desktop) using BC Design System responsive patterns
8. THE Application SHALL use BC Design System CSS variables for theming and maintain WCAG AAA accessibility standards

### Requirement 15: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and can take appropriate action.

#### Acceptance Criteria

1. WHEN content fails to load, THE Application SHALL display a user-friendly error message
2. WHEN search fails, THE Application SHALL display an error message and allow retry
3. WHEN a requested page does not exist, THE Application SHALL display a 404 page with navigation options
4. WHEN the application encounters an unexpected error, THE Application SHALL display a generic error page with a way to return home
5. THE Application SHALL log errors to the browser console for debugging

### Requirement 16: Content Validation

**User Story:** As a developer, I want to validate BCBC JSON structure during the build, so that I can catch data issues before deployment.

#### Acceptance Criteria

1. WHEN parsing BCBC JSON, THE Build_Pipeline SHALL validate the JSON structure against expected schema
2. IF the BCBC JSON is invalid, THEN THE Build_Pipeline SHALL fail with descriptive error messages
3. WHEN generating static assets, THE Build_Pipeline SHALL validate that all required fields are present
4. WHEN generating navigation tree, THE Build_Pipeline SHALL validate that all cross-references are valid
5. THE Build_Pipeline SHALL report validation errors with file locations and specific issues

### Requirement 17: Multi-Version Support

**User Story:** As a user, I want the application to support multiple BC Building Code versions, so that future versions can be added without architectural changes.

#### Acceptance Criteria

1. THE Application SHALL be designed to support multiple BC Building Code versions (infrastructure ready for future versions)
2. THE Application SHALL load version configuration from a versions.json file defining available versions
3. THE Application SHALL provide a version selector in the UI (currently showing single version, expandable for future versions)
4. WHEN multiple versions are available, THE Application SHALL update the URL with a version query parameter (e.g., ?version=2024)
5. WHEN a user loads a URL with a version parameter, THE Application SHALL load that specific version
6. THE Application SHALL persist the selected version in localStorage for returning users
7. THE Application SHALL use a three-priority selection logic: URL parameter > localStorage > default version
8. THE Application SHALL load version-specific assets from /data/{versionId}/ directories
9. THE Application SHALL ensure only one version is marked as default (isDefault: true) in versions.json
10. WHEN multiple versions are available, THE Application SHALL display version status (current, draft, archived) in the version selector
11. WHEN switching versions, THE Application SHALL reload all version-specific data (navigation, search index, content, glossary, amendment dates)
12. THE Build_Pipeline SHALL generate assets for all versions defined in versions.json
13. THE Build_Pipeline SHALL create a unified versions.json index in the output directory listing all available versions
