# CLAUDE.md

## Project Documentation

Before starting any task, read the relevant documentation in the `docs/` folder:

- `docs/README.md` - Documentation index and navigation
- `docs/USER-FLOW.md` - User flow documentation for all pages and interactions
- `docs/architecture/PLAN.md` - Product overview, architecture, and technical design
- `docs/architecture/PROJECT-STRUCTURE.md` - Project structure, directory layout, and data flow
- `docs/guides/COMMANDS.md` - Common commands and build scripts
- `docs/guides/BC-DESIGN-SYSTEM.md` - BC Design System components, CSS variables, and Figma integration rules
- `docs/architecture/CONTENT-RENDERING-STRATEGY.md` - End-to-end content rendering pipeline
- `docs/architecture/CONTENT-MARKERS.md` - Bracket marker syntax and rendering
- `docs/guides/HOW-TO-ADD-NEW-VERSION.md` - Adding a new BC Building Code version

### Specifications

Detailed requirements, design decisions, and implementation tasks:

- `docs/specs/requirements.md` - User stories and acceptance criteria
- `docs/specs/design.md` - Architecture, state management, and design principles

These documents contain essential context for understanding the project architecture, coding standards, and design patterns used in this codebase.

## Change Management

Before implementing any changes:
1. Analyze potential impacts on existing functionality
2. Preserve all current working features
3. Seek user confirmation before proceeding with modifications that could affect other parts of the codebase

### Data File Rule

- Do not fix issues by directly editing source JSON files in `data/source/`.
- Do not fix issues by directly editing generated JSON files in `apps/web/public/data/`.
- Fix the underlying parser, transformation, generation, or rendering logic instead, then regenerate derived data when needed.
