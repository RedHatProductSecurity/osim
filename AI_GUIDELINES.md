# OSIM Project - AI Assistant Guidelines

## Project Overview
This is OSIM (Open Security Issue Management), a Vue.js 3 + TypeScript incident response web application. The project uses modern development tools including Vite, Pinia for state management, Vue Router, and comprehensive testing with Vitest.

## Tech Stack Context
- **Frontend**: Vue 3 with Composition API, TypeScript, Vite
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Styling**: Bootstrap 5, SCSS, PostCSS with Stylelint
- **Testing**: Vitest (unit), Vue Test Utils, MSW for API mocking, Behave (E2E)
- **Linting**: ESLint with extensive configuration and multiple plugins, Stylelint
- **Build**: Vite with custom configuration for proxies and SSL
- **Authentication**: JWT token-based authentication
- **API Integration**: OpenAPI client generation for type-safe API calls
- **Development Server**: HTTPS-enabled with hot reload and proxy support

## Code Style & Standards
- Follow the existing ESLint configuration (eslint.config.mjs) with comprehensive plugin setup
- Use TypeScript strict mode enabled throughout the project
- Prefer Composition API over Options API for Vue components
- Use single quotes for strings, trailing commas
- 2-space indentation, 120 character line limit
- Import organization: builtin → external → internal → Vue-specific
- Vue component structure: `<script>`, `<template>`, `<style>`
- Comprehensive linting includes: TypeScript, Vue, imports, styling, unicorn, perfectionist
- Source maps enabled for debugging support

## Vue.js Specific Guidelines
- Use `<script setup>` syntax for new components
- Follow Vue 3 Composition API patterns
- Use defineProps, defineEmits, defineModel macros appropriately
- Prefer reactive() and ref() over Options API data
- Use computed() for derived state
- Implement proper TypeScript interfaces for props and emits
- Follow the multi-word component naming convention (exceptions: Modal, Tabs, Toast, Login, Navbar, Settings)

## File Organization
- Components: `/src/components/` - Reusable UI components
- Views: `/src/views/` - Page-level components
- Widgets: `/src/widgets/` - Complex reusable components
- Composables: `/src/composables/` - Reusable composition functions
- Stores: `/src/stores/` - Pinia stores for state management
- Services: `/src/services/` - API and external service integrations
- Types: `/src/types/` - TypeScript type definitions
- Utils: `/src/utils/` - Utility functions
- Constants: `/src/constants/` - Application constants

## API & Data Handling
- Use the generated OpenAPI clients from `/src/generated-client/`
- Mock APIs using MSW in `/src/mock-server/`
- Handle authentication with JWT tokens
- Use Pinia stores for complex state management
- Implement proper error handling and loading states

## Testing Guidelines
- Write unit tests using Vitest and Vue Test Utils
- Place test files adjacent to source files with `.spec.ts` extension
- Use MSW for API mocking in tests
- Test Vue components with proper setup and teardown
- Follow the existing test patterns in `src/__tests__/`
- E2E tests use Python/Behave - maintain feature files in `/features/`

## Development Workflow
- Use `yarn dev` for development with hot reload and tests
- Use `yarn build` for production builds
- Run `yarn lint` before committing (includes both ESLint and Stylelint)
- Use `yarn type-check` for TypeScript validation
- Use `yarn coverage` to generate test coverage reports
- Use `yarn vibe-check` to analyze bundle size and dependencies
- Docker containerization available with proper entrypoints
- HTTPS enabled in development server for realistic testing
- Source maps generated for debugging in both development and production

## Security Considerations
- This is a security-focused application for incident response
- Be mindful of sensitive data handling
- Follow secure coding practices
- Validate and sanitize user inputs
- Use proper authentication and authorization patterns

## Common Patterns
- Use Zod for runtime type validation
- Implement proper loading and error states in components
- Use Bootstrap classes for consistent styling
- Follow the existing patterns for forms, modals, and data tables
- Use Vue directives appropriately (custom directives in `/src/directives/`)

## When Making Changes
- Always check existing similar implementations first
- Follow the established patterns and conventions
- Update tests when modifying functionality
- Consider accessibility (a11y) requirements
- Test across different screen sizes (responsive design)
- Validate TypeScript types and ESLint rules pass

## Helpful Commands

### Development
- `yarn dev` - Start development server with hot reload and tests
- `yarn dev-server` - Start development server only (without tests)

### Build & Type Checking
- `yarn build` - Build for production
- `yarn type-check` - Run TypeScript type checking
- `yarn preview` - Preview production build

### Testing
- `yarn test:unit` - Run unit tests with watch mode
- `yarn test:unit:nowatch` - Run unit tests once
- `yarn test:e2e` - Run end-to-end tests (Behave/Python)
- `yarn coverage` - Run tests with coverage report

### Linting & Formatting
- `yarn lint` - Run all linting (ESLint + Stylelint)
- `yarn lint-ts-vue` - Run ESLint on TypeScript and Vue files
- `yarn lint-style` - Run Stylelint on CSS/SCSS/Vue files
- `yarn lint-fix` - Auto-fix ESLint issues

### Other
- `yarn vibe-check` - Analyze bundle size with visualizer

## AI Assistant Preferences
- Prioritize type safety and use proper TypeScript types
- Suggest Vue 3 Composition API patterns
- Follow the existing code style and ESLint rules
- Consider performance implications (Vue reactivity, bundle size)
- Suggest proper error handling and user experience improvements
- Reference existing patterns in the codebase when possible
- Always consider the security context of this application

## AI-Specific Notes

### For Code Generation
- Generate code that can be run immediately
- Add all necessary import statements and dependencies
- Follow the project's existing patterns and conventions
- Ensure TypeScript types are properly defined
- Include proper error handling and loading states

### For Code Reviews
- Check adherence to ESLint rules and TypeScript standards
- Verify Vue 3 Composition API best practices
- Ensure security considerations are addressed
- Validate test coverage for new functionality
- Check accessibility (a11y) compliance

### For Refactoring
- Maintain existing functionality while improving code quality
- Update related tests when modifying code
- Consider breaking changes and migration paths
- Follow the established file organization patterns
- Ensure backward compatibility where appropriate
