# BC Building Code Interactive Web App - User Flow Documentation

## Overview

This document describes the complete user flow for the BC Building Code Interactive Web Application, including all pages, features, navigation patterns, and user interactions.

**Total Pages:** 4 main pages + 3 modal overlays

**Deep Linking:** All pages support direct entry via URL (bookmarks, shared links). The application restores full state from URL parameters, ensuring users can bookmark or share any page and have it render correctly with all context preserved.

---

## Page Inventory

### 1. Homepage / Landing Page
**Route:** `/`  
**Entry Points:** 
- Direct URL access
- Browser bookmark
- External links
- Logo click from any page

### 2. Search Results Page
**Route:** `/search?q={query}&date={effectiveDate}&division={divisionId}&part={partId}&type={contentType}`  
**Entry Points:** 
- Hero search submission from homepage
- Header search submission from any page
- **Direct URL access** (bookmark/shared link with query parameters)
- Browser back/forward navigation

**State Restoration:**
- Query string (`q`) pre-fills search input
- Effective date filter (`date`) applies to results
- Division filter (`division`) - filters by Division A, B, or C
- Part filter (`part`) - filters by specific Part (loaded based on selected division)
- Content type filter (`type`) - filters by Article, Table, Figure, Note, etc.
- Search executes automatically on page load
- Results render based on all URL parameters
- Filters UI reflects URL state

### 3. BC Building Code Content Reading Page
**Route (Flexible Hierarchy):**
- `/code/{division}/{part}?date={effectiveDate}` - Renders full Part
- `/code/{division}/{part}/{section}?date={effectiveDate}` - Renders full Section
- `/code/{division}/{part}/{section}/{subsection}?date={effectiveDate}` - Renders full Subsection
- `/code/{division}/{part}/{section}/{subsection}/{article}?date={effectiveDate}` - Renders specific Article

**Entry Points:** 
- Table of contents navigation (any level: Part, Section, Subsection, Article)
- Search results click
- Breadcrumb navigation
- Quick access pins
- Previous/Next navigation
- Code reference links
- **Direct URL access** (bookmark/shared link at any hierarchy level)
- Browser back/forward navigation

**State Restoration:**
- Hierarchy level (Part/Section/Subsection/Article) from URL path depth
- Effective date filter from query parameter
- TOC highlights current location
- Breadcrumbs render based on URL hierarchy
- Content loads for specified level (full Part, Section, Subsection, or Article)
- Previous/Next buttons calculate based on current position in hierarchy

### 4. Download BC Code Page (Not Finalized)
**Route:** `/download`  
**Entry Points:** 
- Header "Download" link
- Footer download link
- **Direct URL access** (bookmark/shared link)
- Browser back/forward navigation

### Modal Overlays (Contextual)
- **Glossary Terms Sidebar:** Overlay on reading page
- **Related Notes Popup:** Modal on reading page
- **Related Articles Popup:** Modal on reading page

---

## 1. Homepage / Landing Page

### Purpose
Primary entry point for users to discover and search the BC Building Code.

### Main Features

#### 1.1 Header (Persistent across all pages)
- **BC Logo:** Links back to homepage
- **Search Bar:** 
  - Full-text search with autocomplete/suggestions
  - Searches through pre-built FlexSearch index
  - Shows search suggestions as user types
  - Submits to Search Results Page
- **Navigation Links:**
  - "Building Code" (current page indicator)
  - "Download" (links to download page)
- **Accessibility:** WCAG AAA compliant, keyboard navigable

#### 1.2 Sidebar - Table of Contents (Persistent on Homepage & Reading Page)
- **Hierarchical Navigation Tree:**
  - Division → Part → Section → Article structure
  - Expandable/collapsible sections
  - Loaded from `navigation-tree.json` (generated metadata)
  - Visual indicators for current location
  
- **Effective Date Filter:**
  - Dropdown to select amendment date
  - Loaded from `amendment-dates.json`
  - Filters visible content based on effective date
  - Default: Latest version
  
- **Table of Contents Search:**
  - Local search within TOC structure
  - Filters navigation tree in real-time
  - Does not navigate away from current page

#### 1.3 Hero Section
- **Large Hero Search Bar:**
  - Prominent search input with icon
  - Same search functionality as header search
  - Autocomplete suggestions dropdown
  - Submits to Search Results Page
  - Placeholder: "Search the BC Building Code..."

#### 1.4 Quick Access Pins
- **Purpose:** Fast access to frequently referenced sections
- **Data Source:** 
  - Loaded from metadata JSON (`quick-access.json`)
  - Hardcoded for initial release (configurable later)
- **Display:** 
  - Card-based layout
  - Shows section title, code reference, brief description
  - Click navigates to Content Reading Page
- **Examples:**
  - "Fire Protection Requirements"
  - "Structural Design"
  - "Plumbing Systems"

#### 1.5 Footer (Persistent across all pages)
- **BC Government Branding**
- **Links:**
  - About
  - Contact
  - Privacy Policy
  - Accessibility Statement
- **Copyright Notice**

### Navigation From Homepage
- **Hero Search → Search Results Page**
- **Header Search → Search Results Page**
- **TOC Item Click → Content Reading Page**
- **Quick Access Pin → Content Reading Page**
- **Download Link → Download Page**

---

## 2. Search Results Page

### Purpose
Display search results with context and allow users to navigate to specific content.

### Entry Points
- Hero search submission from Homepage
- Header search submission from any page
- URL with query parameters: `/search?q={query}&date={effectiveDate}&division={divisionId}&part={partId}&type={contentType}`
- **Direct URL access:** Users can bookmark or share search results with filters
  - Search executes automatically on page load
  - Query and all filters restored from URL
  - Results render immediately with applied filters
  - Filter UI reflects URL state

### Main Features

#### 2.1 Header (Same as Homepage)
- Search bar pre-filled with current query from URL
- Can modify search and re-submit
- Updates URL with new query while preserving filters

#### 2.2 Search Input (Page-Level)
- **Prominent search box** at top of results panel
- **Auto-populated** with query from URL parameter (`q`)
- Allows users to refine or redo search without scrolling
- On submit: Updates URL and re-executes search
- Preserves active filters when re-searching

#### 2.3 Layout (No Sidebar)
- **No Table of Contents sidebar** on Search Results Page
- Full-width layout for search results
- More screen space for results and filters

#### 2.4 Search Results Panel
- **Search Query Display:**
  - Shows current search term
  - Number of results found
  - Applied filters summary (effective date, division, part, content type)

- **Results List (Infinite Scroll):**
  - **Each Result Card Contains:**
    - Section/Article title
    - Code reference (e.g., "Division A, Part 1, Section 1.1.1")
    - Content type badge (Article, Table, Figure, Note, Application Note)
    - Snippet with search term highlighted
    - Relevance score indicator
    - Click navigates to Content Reading Page
  
  - **Infinite Scroll:**
    - Results load progressively as user scrolls
    - Initial load: 20-50 results
    - Subsequent loads: 20-50 results per scroll
    - Loading indicator at bottom
    - Performance: < 100ms per batch
  
- **Sorting Options:**
  - Relevance (default)
  - Code order (hierarchical)
  
- **No Results State:**
  - Helpful message
  - Search suggestions
  - Link to browse TOC (navigates to Homepage)
  - Option to clear filters

#### 2.5 Search Filters (Stored in URL)

All filters are reflected in URL query parameters for bookmarking and sharing. Filter options are loaded from pre-generated metadata JSON files at build time.

##### Division Filter
- **Parameter:** `division={divisionId}`
- **Data Source:** `navigation-tree.json` (pre-generated metadata)
- **Options:**
  - All Divisions (default, no parameter)
  - Division A (Administrative)
  - Division B (Acceptable Solutions)
  - Division C (Acceptable Solutions for Housing and Small Buildings)
- **Behavior:** 
  - Filters results to selected division
  - Updates Part filter options dynamically
  - URL updates on selection
- **Example:** `/search?q=fire&division=division-b`

##### Part Filter
- **Parameter:** `part={partId}`
- **Data Source:** `navigation-tree.json` (pre-generated metadata, filtered by division)
- **Options:** Loaded dynamically based on selected division
  - All Parts (default, no parameter)
  - Part 1, Part 2, Part 3, etc. (specific to division)
- **Behavior:**
  - Only available after division is selected
  - Filters results to selected part
  - URL updates on selection
- **Example:** `/search?q=fire&division=division-b&part=part-3`

##### Content Type Filter
- **Parameter:** `type={contentType}`
- **Data Source:** `content-types.json` (pre-generated metadata)
- **Options:**
  - All Types (default, no parameter)
  - Article
  - Table
  - Figure
  - Note
  - Application Note
- **Behavior:**
  - Filters results by content type
  - Can combine with other filters
  - URL updates on selection
- **Example:** `/search?q=fire&type=table`

##### Effective Date Filter
- **Parameter:** `date={effectiveDate}`
- **Data Source:** `amendment-dates.json` (pre-generated metadata)
- **Options:** Loaded from amendment dates metadata
  - Latest (default)
  - Specific amendment dates (e.g., 2024-01-01, 2023-01-01)
- **Behavior:**
  - Filters results to show content effective on selected date
  - Applies across all search results
  - URL updates on selection
- **Example:** `/search?q=fire&date=2024-01-01`

##### Combined Filters Example
```
/search?q=fire%20safety&division=division-b&part=part-3&type=article&date=2024-01-01
```
This URL represents:
- Search query: "fire safety"
- Division: B
- Part: 3
- Content type: Article
- Effective date: 2024-01-01

##### Filter Interactions
- **Clear All Filters:** Button to remove all filters (returns to `/search?q={query}`)
- **Clear Individual Filter:** X button on each active filter chip
- **Filter Chips:** Visual indicators showing active filters
- **URL Updates:** Every filter change updates URL immediately
- **Shareable State:** Users can copy URL with all filters applied

##### Metadata Sources Summary
| Filter | Metadata File | Generated At |
|--------|---------------|--------------|
| Division | `navigation-tree.json` | Build time |
| Part | `navigation-tree.json` | Build time |
| Content Type | `content-types.json` | Build time |
| Effective Date | `amendment-dates.json` | Build time |

### Navigation From Search Results
- **Result Click → Content Reading Page** (specific section/article at appropriate hierarchy level)
- **Header Search → New Search Results** (new query, clears filters)
- **Page Search Box → Updated Search Results** (new query, preserves filters)
- **Filter Change → Updates URL and Results** (maintains search query)
- **Clear Filters → Removes filter parameters from URL**
- **No TOC Navigation** (no sidebar on this page)

---

## 3. BC Building Code Content Reading Page

### Purpose
Display BC Building Code content at any hierarchical level (Part, Section, Subsection, or Article) with full context, navigation, and interactive features.

### Flexible Content Rendering

The reading page can render content at multiple hierarchy levels:

1. **Part Level:** `/code/{division}/{part}`
   - Displays Part title and overview
   - Lists all Sections within the Part
   - Shows complete Part content if no subsections

2. **Section Level:** `/code/{division}/{part}/{section}`
   - Displays Section title and overview
   - Lists all Subsections within the Section
   - Shows complete Section content

3. **Subsection Level:** `/code/{division}/{part}/{section}/{subsection}`
   - Displays Subsection title and content
   - Lists all Articles within the Subsection
   - Shows complete Subsection content

4. **Article Level:** `/code/{division}/{part}/{section}/{subsection}/{article}`
   - Displays specific Article content
   - Most granular level
   - Includes all article details, tables, figures, notes

### Entry Points
- Click on TOC item (sidebar) - any level
- Click on search result
- Click on quick access pin
- Breadcrumb navigation
- Previous/Next navigation
- Direct URL at any hierarchy level
- **Direct URL access:** Users can bookmark or share any level
  - Full content renders from URL parameters
  - TOC highlights current location
  - Breadcrumbs generate from URL path
  - Effective date filter applies if specified
  - Previous/Next navigation calculates correctly

### Main Features

#### 3.1 Header (Same as Homepage)
- Search bar remains accessible
- Navigation links

#### 3.2 Sidebar (Same as Homepage)
- Table of Contents with current location highlighted
- Effective Date Filter
- TOC Search

#### 3.3 Breadcrumb Navigation
- **Location:** Top of all pages (below header, above content)
- **Format (Dynamic based on page and hierarchy level):**
  - Homepage: `Home`
  - Search Results: `Home > Search Results`
  - Download Page: `Home > Download`
  - Content Reading - Part: `Home > Division > Part`
  - Content Reading - Section: `Home > Division > Part > Section`
  - Content Reading - Subsection: `Home > Division > Part > Section > Subsection`
  - Content Reading - Article: `Home > Division > Part > Section > Subsection > Article`
- **Functionality:**
  - Each breadcrumb is clickable
  - Navigates to parent level or page
  - Shows current location in site hierarchy
  - Always starts with "Home" link
- **Examples:** 
  - Homepage: `Home`
  - Search: `Home > Search Results`
  - Part: `Home > Division A > Part 1`
  - Section: `Home > Division A > Part 1 > Section 1.1`
  - Article: `Home > Division A > Part 1 > Section 1.1 > Subsection 1.1.1 > Article 1.1.1.1`

#### 3.4 Content Panel

**Content varies based on hierarchy level:**

##### Part Level Content
- **Part Title:** Code reference and full title
- **Part Overview:** Introduction or summary text
- **Child Sections List:** Expandable list of all Sections in the Part
- **Complete Content:** All text, tables, figures within the Part (if no subsections)

##### Section Level Content
- **Section Title:** Code reference and full title
- **Section Overview:** Introduction or summary text
- **Child Subsections List:** List of all Subsections in the Section
- **Complete Content:** All text, tables, figures within the Section

##### Subsection Level Content
- **Subsection Title:** Code reference and full title
- **Subsection Content:** Full text content
- **Child Articles List:** List of all Articles in the Subsection
- **Complete Content:** All text, tables, figures within the Subsection

##### Article Level Content (Most Granular)
- **Article Title:** Code reference number and full title
- **Effective Date Badge:** If filtered by date
- **Article Content:** Complete article text

**Content Rendering (All Levels):**
- **Text Content:** Formatted paragraphs with proper hierarchy
- **Tables:** Responsive table rendering with horizontal scroll
- **Figures/Images:** Embedded images with captions
- **Lists:** Numbered and bulleted lists
- **Code References:** Clickable cross-references to other sections
  
**Interactive Elements (All Levels):**
- **Glossary Terms:** 
  - Underlined or styled differently
  - Clickable
  - Opens Glossary Sidebar Overlay
- **Related Notes Links:**
  - Inline note indicators (e.g., superscript numbers)
  - Click opens Related Notes Popup
- **Related Articles Links:**
  - "See also" references
  - Click opens Related Articles Popup or navigates directly
- **Child Section Links:**
  - At Part/Section/Subsection level, links to child content
  - Click navigates to deeper level

#### 3.5 Previous/Next Navigation
- **Location:** Bottom of content panel
- **Buttons:**
  - "← Previous: [Title]"
  - "Next: [Title] →"
- **Functionality:**
  - Navigates sequentially through code structure at current hierarchy level
  - Respects hierarchical order
  - Disabled at boundaries (first/last item at current level)
- **Behavior by Level:**
  - **Part Level:** Previous/Next Part within Division
  - **Section Level:** Previous/Next Section within Part
  - **Subsection Level:** Previous/Next Subsection within Section
  - **Article Level:** Previous/Next Article within Subsection

#### 3.6 Action Buttons
- **Export PDF:** 
  - Exports currently rendered content as PDF
  - Includes all visible content (Part/Section/Subsection/Article)
  - Preserves formatting, tables, figures
  - Filename based on code reference
  - Example: `BCBC-Division-B-Part-3-Section-3-2.pdf`
- **Print Section:** 
  - Opens print dialog for current content
  - Print-optimized layout
- **Bookmark/Save:** (Future enhancement)

### Content Views (Multiple States)

#### View 1: Part Level Display
- Part title and overview
- List of child Sections
- Navigation to deeper levels
- Previous/Next Part buttons

#### View 2: Section Level Display
- Section title and overview
- List of child Subsections
- Complete section content
- Previous/Next Section buttons

#### View 3: Subsection Level Display
- Subsection title and content
- List of child Articles
- Complete subsection content
- Previous/Next Subsection buttons

#### View 4: Article Level Display (Most Granular)
- Clean, readable article text
- Proper spacing and typography
- Glossary terms highlighted
- Previous/Next Article buttons

#### View 5: Content with Tables (Any Level)
- Responsive table layout
- Horizontal scroll for wide tables
- Table caption and reference number

#### View 6: Content with Figures (Any Level)
- Embedded images
- Figure captions
- Zoom functionality for detailed diagrams

#### View 7: Content with Related Notes (Popup Active)
- Dimmed background
- Modal popup showing note content
- Close button to dismiss

#### View 8: Content with Related Articles (Popup Active)
- Dimmed background
- Modal popup showing related article links
- Click to navigate or close

### Navigation From Content Reading Page
- **Breadcrumb Click → Parent Level** (Part/Section/Subsection/Division)
- **TOC Item Click → Any Level** (Part/Section/Subsection/Article)
- **Previous/Next → Adjacent Content** (at same hierarchy level)
- **Child Section Link → Deeper Level** (Part→Section, Section→Subsection, Subsection→Article)
- **Glossary Term Click → Opens Glossary Sidebar**
- **Related Note Click → Opens Note Popup**
- **Related Article Click → Opens Article Popup or Navigates**
- **Header Search → Search Results Page**
- **Code Reference Link → Different Section** (any level)

---

## 4. Download BC Code Page (Not Finalized)

### Purpose
Allow users to download the BC Building Code in various formats.

### Entry Points
- Header "Download" link
- Footer download link
- **Direct URL access** (bookmark/shared link)
- Browser back/forward navigation

### Layout (No Sidebar)
- **No Table of Contents sidebar** on Download Page
- Full-width layout for download options
- Header and footer remain

### Planned Features (Subject to Change)
- **Download Options:**
  - Full PDF
  - Division-specific PDFs
  - Offline HTML package
  - JSON data export

- **Format Selection:**
  - Radio buttons or dropdown
  - File size indicators
  - Format descriptions

- **Download Button:**
  - Initiates download
  - Progress indicator
  - Success confirmation

### Navigation From Download Page
- **Header Navigation → Other pages**
- **Breadcrumb → Homepage**

---

## Modal Overlays

### Glossary Terms Sidebar Overlay

#### Trigger
- Click on any glossary term in content

#### Behavior
- **Slides in from right side**
- **Overlay dims main content**
- **Does not navigate away from current page**

#### Features
- **Term Title:** Bold, prominent
- **Definition:** Clear, formatted text
- **Related Terms:** Links to other glossary terms
- **Close Button:** X icon in top-right
- **Click Outside to Close:** Clicking dimmed area closes overlay

#### Content Source
- Loaded from `glossary-map.json`
- Pre-generated during build

#### Navigation
- **Related Term Click → Updates overlay with new term**
- **Close → Returns to reading page**

---

### Related Notes Popup

#### Trigger
- Click on note indicator in content (e.g., superscript number)

#### Behavior
- **Modal popup centered on screen**
- **Overlay dims background**
- **Scrollable if content is long**

#### Features
- **Note Title/Number:** "Note 1.1.1.1(1)"
- **Note Content:** Full text of the note
- **Close Button:** X icon in top-right
- **Click Outside to Close:** Optional

#### Content Source
- Embedded in content chunks
- Loaded with article content

#### Navigation
- **Close → Returns to reading page**

---

### Related Articles Popup

#### Trigger
- Click on "See also" or related article reference

#### Behavior
- **Modal popup centered on screen**
- **Overlay dims background**
- **List of related articles**

#### Features
- **Popup Title:** "Related Articles"
- **Article List:**
  - Each item shows code reference and title
  - Clickable to navigate
- **Close Button:** X icon in top-right

#### Content Source
- Cross-references from content metadata
- Generated during build

#### Navigation
- **Article Click → Navigates to that article (closes popup)**
- **Close → Returns to reading page**

---

## Deep Linking & State Management

### Philosophy: URL as Single Source of Truth

Every page in the application can be accessed directly via URL. The URL contains all necessary state information to render the page correctly, making bookmarks and shared links work seamlessly.

### Benefits

1. **Bookmarkable:** Users can bookmark any page and return to exact same view
2. **Shareable:** Users can share links to specific content with colleagues
3. **Browser Navigation:** Back/forward buttons work correctly
4. **No Session Required:** No server-side session or authentication needed
5. **SEO Friendly:** All content addressable via clean URLs
6. **Stateless:** Application can be deployed as pure static site

### State Encoding in URLs

| Page Type | State Encoded | Example URL |
|-----------|---------------|-------------|
| Homepage | None (default view) | `/` |
| Search Results | Query + All Filters | `/search?q=fire%20safety&division=division-b&part=part-3&type=article&date=2024-01-01` |
| Content - Part | Division/Part + Filters | `/code/division-b/part-3?date=2024-01-01` |
| Content - Section | Division/Part/Section + Filters | `/code/division-b/part-3/section-3-2?date=2024-01-01` |
| Content - Subsection | Division/Part/Section/Subsection + Filters | `/code/division-b/part-3/section-3-2/subsection-3-2-1?date=2024-01-01` |
| Content - Article | Full Hierarchy + Filters | `/code/division-b/part-3/section-3-2/subsection-3-2-1/article-3-2-1-1?date=2024-01-01` |
| Download | None | `/download` |

### State Restoration Flow

When a user accesses a page directly (e.g., from bookmark):

```
1. User opens URL
   ↓
2. Next.js parses route and query parameters
   ↓
3. Page component extracts state from URL
   ↓
4. Load required data (navigation tree, content, search index)
   ↓
5. Restore UI state:
   - Pre-fill inputs
   - Apply filters
   - Highlight navigation
   - Render content
   ↓
6. Page renders with correct state
```

### Error Handling for Direct Entry

**Invalid Content URL:**
- Show 404 page with navigation options
- Suggest similar content
- Provide link to homepage and TOC

**Invalid Date Parameter:**
- Fallback to latest effective date
- Show warning message
- Allow user to select different date

**Malformed Query:**
- Sanitize and attempt to parse
- If unparseable, redirect to homepage
- Log error for monitoring

### Examples

**Scenario 1: User bookmarks search results**
```
User searches "fire safety" with filters:
- Division: B
- Part: 3
- Content Type: Article
- Date: 2024-01-01
URL: /search?q=fire%20safety&division=division-b&part=part-3&type=article&date=2024-01-01
User bookmarks page
Later: Opens bookmark → Search executes with all filters → Same filtered results appear
```

**Scenario 2: User shares article link**
```
User reading Division B, Part 3, Section 3.2, Subsection 3.2.1, Article 3.2.1.1
URL: /code/division-b/part-3/section-3-2/subsection-3-2-1/article-3-2-1-1?date=2024-01-01
User copies URL and emails to colleague
Colleague opens link → Article renders with correct date filter → TOC highlights location
```

**Scenario 2b: User shares section link**
```
User reading Division B, Part 3, Section 3.2 (full section view)
URL: /code/division-b/part-3/section-3-2?date=2024-01-01
User copies URL and shares on team chat
Team member opens link → Full section renders with all subsections → Can navigate to specific articles
```

**Scenario 3: User uses browser back button**
```
User navigates: Homepage → Search → Article → Related Article
Clicks back button → Returns to previous article with state intact
Clicks back again → Returns to search results with query preserved
```

---

## Navigation Patterns Summary

### Primary Navigation Methods

1. **Search-Driven Navigation**
   - Homepage Hero Search → Search Results → Content
   - Header Search (any page) → Search Results → Content

2. **Hierarchical Navigation**
   - Sidebar TOC → Content (any level)
   - Breadcrumbs → Parent levels
   - Previous/Next → Sequential navigation

3. **Quick Access**
   - Quick Access Pins → Frequently used content
   - Glossary Terms → Glossary overlay
   - Code References → Related content

4. **Contextual Navigation**
   - Related Notes → Note popup
   - Related Articles → Article popup or direct navigation
   - Cross-references → Linked sections

### Persistent UI Elements

**Available on All Pages:**
- Header with search and navigation
- Footer with links and branding

**Available on Homepage & Reading Page:**
- Sidebar with TOC, filters, and TOC search

**NOT Available on Search Results & Download Pages:**
- No sidebar/TOC on Search Results Page
- No sidebar/TOC on Download Page

**Available on All Pages:**
- Breadcrumbs (shows current page context)

**Available on Reading Page Only:**
- Previous/Next navigation
- Content-specific actions (print, download)

---

## User Journey Examples

### Journey 1: First-Time User Looking for Fire Safety Requirements

1. **Land on Homepage**
2. **Type "fire safety" in Hero Search**
3. **View Search Results Page** with relevant articles
4. **Apply Filters:**
   - Select "Division B" from division filter
   - Select "Part 3" from part filter
   - Select "Article" from content type filter
5. **URL updates to:** `/search?q=fire%20safety&division=division-b&part=part-3&type=article`
6. **Results filter to show only articles from Division B, Part 3**
7. **Click on "Division B, Part 3, Section 3.2 - Fire Protection"**
8. **Read Content on Reading Page**
9. **Click glossary term "fire separation"** → Glossary overlay opens
10. **Close glossary overlay**
11. **Click "Next" to read next section**
12. **Use breadcrumb to go back to Part 3 overview**

### Journey 2: Building Official Checking Specific Code Section

1. **Land on Homepage**
2. **Use Sidebar TOC to navigate:** Division A → Part 1 → Section 1.1 (Section level)
3. **Read Section 1.1 overview on Reading Page** (shows all subsections)
4. **Click on Subsection 1.1.1** → Navigate to Subsection level
5. **Read Subsection content** (shows all articles)
6. **Click on Article 1.1.1.1** → Navigate to Article level
7. **Click on related note indicator** → Note popup opens
8. **Close note popup**
9. **Click on code reference link** → Navigate to referenced section
10. **Use breadcrumb to go back to Section 1.1**

### Journey 3: Architect Comparing Amendment Versions

1. **Land on Homepage**
2. **Select "2024-01-01" from Effective Date Filter**
3. **Navigate to specific section via TOC**
4. **Read content on Reading Page**
5. **Change Effective Date Filter to "2023-01-01"**
6. **Content updates to show previous version**
7. **Compare differences**

---

## Data Flow & Content Loading

### Initial Page Load (Homepage)
1. Load static HTML/CSS/JS
2. Load navigation tree (`navigation-tree.json`) - for TOC and filters
3. Load amendment dates (`amendment-dates.json`) - for effective date filter
4. Load content types (`content-types.json`) - for content type filter
5. Load quick access pins (`quick-access.json`)
6. Initialize FlexSearch index (lazy load)

### Search Flow
1. User types in search bar (header or hero)
2. FlexSearch queries pre-built index (client-side)
3. Display autocomplete suggestions
4. On submit, navigate to Search Results Page with query parameter
5. **Search Results Page loads:**
   - Parse URL parameters (query + all filters)
   - Auto-populate search box with query from URL
   - Load filter options from metadata JSON files
   - Apply filters to search results
   - Render initial batch of results (20-50 items)
6. **User scrolls down:**
   - Detect scroll position
   - Load next batch of results
   - Append to results list
   - Repeat until all results shown
7. Update filter UI to reflect URL state

### Content Loading (Reading Page)
1. Parse URL parameters (division/part/section/subsection/article)
2. Determine hierarchy level from URL depth
3. Load appropriate content chunk from `/public/data/content/{path}.json`
4. Render content based on hierarchy level:
   - Part: Load part overview + list child sections
   - Section: Load section content + list child subsections
   - Subsection: Load subsection content + list child articles
   - Article: Load complete article content
5. Render interactive elements (glossary, notes, references)
6. Lazy load glossary definitions on demand
7. Lazy load related notes/articles on demand

### Performance Targets
- **Initial Load:** < 1.5s (First Contentful Paint)
- **Search Response:** < 100ms
- **Content Navigation:** < 500ms
- **Glossary Overlay:** < 200ms
- **Infinite Scroll Batch:** < 100ms per batch
- **PDF Export:** < 3s for typical section

---

## Pre-Generated Metadata Files

All filter options, navigation structure, and content organization are pre-generated at build time from the source BC Building Code JSON. These metadata files enable fast client-side filtering and navigation without backend queries.

### Metadata Files Location
`/apps/web/public/data/`

### Metadata File Inventory

#### 1. `navigation-tree.json`
**Purpose:** Hierarchical structure of the entire BC Building Code  
**Used By:** 
- Homepage sidebar (TOC)
- Reading page sidebar (TOC)
- Division filter options
- Part filter options (filtered by division)

**Structure:**
```json
{
  "divisions": [
    {
      "id": "division-a",
      "title": "Division A - Compliance, Objectives and Functional Statements",
      "parts": [
        {
          "id": "part-1",
          "title": "Part 1 - Compliance",
          "sections": [
            {
              "id": "section-1-1",
              "title": "Section 1.1 - General",
              "subsections": [...],
              "articles": [...]
            }
          ]
        }
      ]
    }
  ]
}
```

#### 2. `amendment-dates.json`
**Purpose:** List of available effective dates for amendments  
**Used By:**
- Effective date filter (all pages with sidebar)
- Search results date filter

**Structure:**
```json
{
  "dates": [
    {
      "date": "2024-01-01",
      "label": "January 1, 2024",
      "isLatest": true
    },
    {
      "date": "2023-01-01",
      "label": "January 1, 2023",
      "isLatest": false
    }
  ]
}
```

#### 3. `content-types.json`
**Purpose:** Available content types for filtering  
**Used By:**
- Search results content type filter

**Structure:**
```json
{
  "types": [
    {
      "id": "article",
      "label": "Article",
      "count": 1250
    },
    {
      "id": "table",
      "label": "Table",
      "count": 340
    },
    {
      "id": "figure",
      "label": "Figure",
      "count": 180
    },
    {
      "id": "note",
      "label": "Note",
      "count": 520
    },
    {
      "id": "application-note",
      "label": "Application Note",
      "count": 95
    }
  ]
}
```

#### 4. `quick-access.json`
**Purpose:** Frequently accessed sections for homepage  
**Used By:**
- Homepage quick access pins

**Structure:**
```json
{
  "pins": [
    {
      "id": "fire-protection",
      "title": "Fire Protection Requirements",
      "reference": "Division B, Part 3",
      "description": "Fire safety and protection requirements",
      "url": "/code/division-b/part-3"
    }
  ]
}
```

#### 5. `glossary-map.json`
**Purpose:** Glossary term definitions  
**Used By:**
- Glossary sidebar overlay
- Inline glossary term highlighting

**Structure:**
```json
{
  "terms": {
    "fire-separation": {
      "term": "Fire Separation",
      "definition": "A construction assembly that acts as a barrier...",
      "relatedTerms": ["fire-resistance-rating", "combustible-construction"]
    }
  ]
}
```

#### 6. `search-index.json`
**Purpose:** Pre-built FlexSearch index  
**Used By:**
- Search functionality (header, hero, search page)
- Autocomplete suggestions

**Structure:** Binary/optimized FlexSearch format

#### 7. `content/{path}.json`
**Purpose:** Content chunks for each section/article  
**Used By:**
- Reading page content rendering
- Lazy-loaded on demand

**Structure:**
```json
{
  "id": "article-1-1-1-1",
  "reference": "1.1.1.1",
  "title": "Application",
  "content": "...",
  "tables": [...],
  "figures": [...],
  "notes": [...],
  "relatedArticles": [...]
}
```

### Build-Time Generation Process

1. **Parse source JSON** (`/data/source/bcbc-2024.json`)
2. **Extract structure** → Generate `navigation-tree.json`
3. **Extract dates** → Generate `amendment-dates.json`
4. **Analyze content types** → Generate `content-types.json`
5. **Build search index** → Generate `search-index.json`
6. **Extract glossary** → Generate `glossary-map.json`
7. **Chunk content** → Generate `content/{path}.json` files
8. **Configure quick access** → Generate `quick-access.json`

### Runtime Loading Strategy

- **Eager Load (on app init):**
  - `navigation-tree.json`
  - `amendment-dates.json`
  - `content-types.json`
  - `quick-access.json`

- **Lazy Load (on demand):**
  - `search-index.json` (when search is first used)
  - `glossary-map.json` (when first glossary term clicked)
  - `content/{path}.json` (when specific content accessed)

---

## Performance Targets

## Accessibility Features

### Keyboard Navigation
- **Tab:** Navigate through interactive elements
- **Enter/Space:** Activate buttons and links
- **Escape:** Close modals and overlays
- **Arrow Keys:** Navigate within TOC and search results

### Screen Reader Support
- Proper ARIA labels on all interactive elements
- Semantic HTML structure
- Heading hierarchy (h1 → h6)
- Alt text for images and figures
- Live regions for dynamic content updates

### Visual Accessibility
- **Color Contrast:** 7:1 ratio (WCAG AAA)
- **Text Scaling:** Up to 200% without loss of functionality
- **Focus Indicators:** Clear, visible focus states
- **No Color-Only Information:** Icons and text labels

---

## Mobile Responsive Behavior

### Homepage (Mobile)
- **Sidebar:** Collapsible hamburger menu
- **Hero Search:** Full-width, prominent
- **Quick Access Pins:** Stacked vertically

### Search Results (Mobile)
- **Results:** Full-width cards
- **Filters:** Collapsible panel

### Reading Page (Mobile)
- **Sidebar:** Hamburger menu overlay
- **Content:** Full-width, optimized typography
- **Tables:** Horizontal scroll with scroll indicators
- **Glossary Overlay:** Full-screen modal
- **Previous/Next:** Sticky bottom navigation

---

## Future Enhancements (Not in Current Scope)

- User accounts and authentication
- Personal bookmarks and notes
- Annotation and highlighting
- Comparison view (side-by-side versions)
- Advanced search filters
- Export to various formats
- Offline mode with service workers
- Collaborative features

---

## Technical Implementation Notes

### Routing Strategy
- Next.js App Router with static export
- All routes pre-generated at build time
- Client-side navigation for instant transitions
- **Full deep linking support:** Every page can be accessed directly via URL
- URL-based state ensures bookmarks and shared links work correctly

### State Management
- **URL as single source of truth:** All application state encoded in URL
- Query parameters for filters and search terms
- Path parameters for content hierarchy
- Local storage for user preferences (effective date filter default)
- React Context for global state (TOC, glossary)
- No session state required - everything reconstructable from URL

### URL Structure & State Encoding

#### Homepage
```
/
```
- No state parameters needed
- Loads default view with latest effective date

#### Search Results Page
```
/search?q={searchQuery}&date={effectiveDate}&division={divisionId}&part={partId}&type={contentType}
```
- `q`: Search query string (URL encoded) - **Required**
- `date`: Effective date filter (ISO format: YYYY-MM-DD) - Optional
- `division`: Division filter (division-a, division-b, division-c) - Optional
- `part`: Part filter (part-1, part-2, etc.) - Optional, depends on division
- `type`: Content type filter (article, table, figure, note, appendix) - Optional
- **All filters are optional except query**
- Example with all filters: `/search?q=fire%20safety&division=division-b&part=part-3&type=article&date=2024-01-01`
- Example minimal: `/search?q=fire%20safety`

#### Content Reading Page
```
/code/{division}/{part}/{section}/{subsection}/{article}?date={effectiveDate}
```
- Path segments: Division, Part, Section, Subsection, Article identifiers (flexible depth)
- `date`: Optional effective date filter
- **Flexible Hierarchy:** URL depth determines content level
  - 2 segments: Part level (e.g., `/code/division-a/part-1`)
  - 3 segments: Section level (e.g., `/code/division-a/part-1/section-1-1`)
  - 4 segments: Subsection level (e.g., `/code/division-a/part-1/section-1-1/subsection-1-1-1`)
  - 5 segments: Article level (e.g., `/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1`)
- Example: `/code/division-a/part-1/section-1-1/subsection-1-1-1/article-1-1-1-1?date=2024-01-01`

#### Download Page
```
/download
```
- No state parameters needed

### State Restoration on Direct Entry

When a user accesses any page directly (bookmark, shared link):

1. **Parse URL parameters** on page load
2. **Validate parameters** against available data
3. **Load required data** (navigation tree, content chunks, search index)
4. **Restore UI state:**
   - Pre-fill search inputs
   - Apply filters
   - Highlight TOC location
   - Render breadcrumbs
   - Load content
5. **Handle invalid URLs:**
   - Missing content → 404 page with navigation options
   - Invalid date → Fallback to latest version
   - Malformed parameters → Redirect to homepage

### Browser Navigation Support
- **Back/Forward buttons** work correctly
- **History API** tracks all navigation
- **Scroll restoration** preserves scroll position
- **Focus management** for accessibility

### Shareable Links
All pages generate shareable URLs that include:
- Current content location
- Active filters (effective date)
- Search queries
- Any relevant state

Users can copy URL from browser and share - recipients see identical view.

### Content Delivery
- Static JSON files served from `/public/data/`
- Lazy loading for content chunks
- Pre-built search index for instant search
- No backend API required

### Build Process
1. Parse source JSON (`bcbc-2024.json`)
2. Generate navigation tree
3. Build FlexSearch index
4. Chunk content by section/article
5. Extract glossary and metadata
6. Generate static pages
7. Export to static HTML

---

## Document Version

**Version:** 1.0  
**Last Updated:** January 28, 2026  
**Based on:** Figma Design Screenshots (Interactive-Code)  
**Status:** Production-Ready Documentation

---

## Related Documentation

- **Requirements:** `.kiro/specs/bcbc-interactive-web-app/requirements.md`
- **Design:** `.kiro/specs/bcbc-interactive-web-app/design.md`
- **Tasks:** `.kiro/specs/bcbc-interactive-web-app/tasks.md`
- **Tech Stack:** `.kiro/steering/tech.md`
- **Project Structure:** `.kiro/steering/structure.md`
- **BC Design System:** `docs/BC-DESIGN-SYSTEM.md`
