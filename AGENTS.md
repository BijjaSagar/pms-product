# AGENTS.md

# Website Development Guidelines for AI Coding Agents

## 1. Project Overview

This document defines the development standards, conventions, and instructions that AI coding agents must follow when building, modifying, debugging, or maintaining this website.

The objective is to build a website that is:

- Modern, responsive, and visually polished.
- Fast, performant, and optimized for search engines.
- Accessible and usable across different devices.
- Secure, maintainable, and scalable.
- Consistent in design, architecture, and code quality.
- Production-ready rather than merely functional.

**Important:** Always inspect the existing project structure, dependencies, configuration, and coding conventions before making changes. Do not assume a particular framework or technology unless it is established by the project.

---

## 2. General Development Principles

Follow these principles for every development task:

1. Understand the existing codebase before modifying it.
2. Reuse existing components, utilities, and design patterns whenever possible.
3. Avoid unnecessary dependencies and additional abstractions.
4. Write clean, readable, maintainable, and reusable code.
5. Keep components focused on a single responsibility.
6. Avoid duplicating logic or styles.
7. Do not introduce breaking changes without a clear reason.
8. Preserve existing functionality unless explicitly asked to change it.
9. Handle loading, error, empty, and success states appropriately.
10. Verify changes before considering a task complete.

Never replace an existing implementation simply because another approach is available. Prefer incremental improvements.

---


## 3. Technology Stack

Before development:

- Identify the framework and its version.
- Inspect the package manager and lockfile.
- Review installed dependencies.
- Identify the styling solution.
- Understand routing and data-fetching strategies.
- Check existing linting, formatting, and testing tools.

Rules:

- Prefer existing dependencies over introducing new ones.
- Use TypeScript when the project already supports it.
- Use the framework's recommended rendering and routing patterns.
- Avoid mixing multiple styling systems without justification.
- Do not upgrade major dependencies unless requested or necessary.

Never modify dependency versions casually.

---

## 4. UI/UX Design Standards

Every interface should look intentional, professional, and consistent.

### Visual Design

- Use a consistent design system.
- Maintain a clear visual hierarchy.
- Use consistent spacing, typography, and colors.
- Avoid unnecessary visual clutter.
- Use whitespace effectively.
- Maintain consistent border radii, shadows, and component proportions.
- Ensure sufficient contrast between text and backgrounds.
- Avoid excessive gradients, animations, shadows, and decorative effects.


### Typography

- Establish a consistent typography scale.
- Use readable font sizes and line heights.
- Maintain clear heading hierarchy.
- Avoid excessively long line lengths.
- Use appropriate font weights.

### Components

Build reusable components for common interface elements:

- Buttons
- Inputs
- Forms
- Navigation
- Headers
- Footers
- Cards
- Modals
- Dropdowns
- Alerts
- Loading indicators
- Empty states

Components must have clear responsibilities and predictable behavior.

---

## 5. Responsive Design

All pages and components must work correctly across:

- Mobile phones.
- Tablets.
- Laptops.
- Desktop monitors.
- Large displays.

Requirements:

1. Use responsive layouts rather than device-specific fixed dimensions.
2. Ensure navigation works on mobile.
3. Prevent horizontal scrolling.
4. Make interactive elements touch-friendly.
5. Scale images appropriately.
6. Maintain readable typography on smaller screens.
7. Test important breakpoints.
8. Ensure forms remain usable on mobile devices.

Do not consider a page complete until its mobile layout has been checked.

---

## 6. Component Development

When creating components:

- Use descriptive and consistent naming.
- Keep components small and focused.
- Extract repeated logic into hooks or utilities.
- Avoid unnecessary prop drilling.
- Use appropriate state management.
- Define explicit TypeScript types where applicable.
- Avoid unnecessary re-renders.
- Keep accessibility in mind.
- Avoid creating components for trivial one-off elements unless they improve clarity.

Do not create overly complex components containing unrelated responsibilities.

---

## 7. Code Quality Standards

Write code that is easy for another developer to understand.

### JavaScript / TypeScript

- Use modern language features appropriately.
- Prefer `const` over `let` when reassignment is unnecessary.
- Avoid `var`.
- Use meaningful variable and function names.
- Avoid deeply nested conditional logic.
- Handle nullable and optional values safely.
- Avoid unnecessary type assertions.
- Avoid `any` unless there is a documented reason.
- Remove unused imports and variables.

### CSS

- Follow the existing styling convention.
- Avoid unnecessary `!important`.
- Avoid global styles that unintentionally affect other components.
- Use reusable design tokens where appropriate.
- Keep selectors simple.
- Avoid duplicated CSS.
- Ensure hover, focus, active, and disabled states are implemented.

### Comments

- Write comments only when they add useful context.
- Explain complex decisions rather than obvious code.
- Remove outdated comments.
- Do not leave placeholder implementation notes in production code.

---

## 8. Accessibility (WCAG)

Build accessible interfaces following WCAG 2.2 AA principles where applicable.

Requirements:

- Use semantic HTML.
- Provide accessible names for interactive controls.
- Add meaningful alternative text to informative images.
- Ensure keyboard navigation works.
- Provide visible focus indicators.
- Maintain sufficient color contrast.
- Associate labels with form fields.
- Use ARIA only when native HTML semantics are insufficient.
- Ensure modals manage keyboard focus correctly.
- Do not communicate information through color alone.
- Respect reduced-motion preferences.

Every interactive element must be usable with a keyboard.

---

## 9. Performance Optimization

Performance must be considered throughout development.

### Images and Media

- Use appropriately sized images.
- Prefer modern image formats such as WebP or AVIF where supported.
- Implement lazy loading for off-screen images.
- Set image dimensions to prevent layout shifts.
- Avoid unnecessarily large media assets.


### Rendering

- Use server rendering or static generation where appropriate.
- Avoid unnecessary client-side rendering.
- Prevent layout shifts.
- Optimize font loading.
- Avoid blocking resources.

Target good Core Web Vitals:

- LCP: 2.5 seconds or less.
- INP: 200 milliseconds or less.
- CLS: 0.1 or less.

Treat these as performance targets, not guaranteed results.

---

## 10. Security Standards

Security must never be compromised for convenience.

Requirements:

- Never expose API keys, passwords, or secrets in frontend code.
- Use environment variables for sensitive configuration.
- Validate and sanitize untrusted input.
- Apply server-side authorization checks.
- Do not trust client-side validation alone.
- Avoid unsafe HTML injection.
- Protect authenticated routes and sensitive endpoints.
- Use secure cookie configurations.
- Follow appropriate CORS policies.
- Avoid logging sensitive information.
- Keep dependencies updated.
- Use HTTPS in production.

Never commit `.env` files or credentials.

---



## 11. API Integration

When integrating APIs:

1. Review the API documentation.
2. Understand request and response structures.
3. Handle authentication securely.
4. Implement appropriate error handling.
5. Handle loading and empty states.
6. Avoid unnecessary duplicate requests.
7. Implement pagination when required.
8. Handle timeouts and network failures.
9. Validate external data before using it.
10. Keep API logic separate from UI components where practical.

Do not hardcode production API credentials or sensitive endpoints.

---

## 12. State Management

Choose the simplest state management approach that satisfies the requirements.

- Use local component state for local interactions.
- Use shared context for appropriate application-wide state.
- Use an existing state management library when already established.
- Avoid duplicating server state in unnecessary client stores.
- Keep state predictable.
- Avoid excessive global state.
- Handle asynchronous state transitions correctly.

Do not introduce a state management library for a small isolated feature.

---

## 13. Error Handling

All critical user flows must handle errors gracefully.

Consider:

- Network errors.
- API failures.
- Invalid inputs.
- Authentication failures.
- Missing resources.
- Unexpected server responses.
- Loading timeouts.
- Empty datasets.

Provide helpful user-facing messages without exposing internal implementation details.

Use appropriate error boundaries and logging mechanisms where supported.

Never silently ignore important failures.

---

## 14. Testing and Quality Assurance

Before completing any task, verify the implementation.

### Required Checks

- Run the project's lint command.
- Run type checking when available.
- Run relevant automated tests.
- Run the production build.
- Check browser console errors.
- Check network failures.
- Verify responsive behavior.
- Test important user interactions.
- Check keyboard accessibility.

### Functional Testing

Verify:

- Navigation links.
- Buttons and interactive controls.
- Form submissions.
- Authentication flows.
- API integrations.
- Error states.
- Loading states.
- Empty states.
- Mobile navigation.

Do not claim that a test passed unless it was actually executed successfully.

---


## 15. AI Agent Workflow

Every AI coding agent must follow this workflow.

### Step 1: Inspect

Before modifying files:

- Inspect the repository.
- Read relevant configuration files.
- Review existing components.
- Identify the framework and conventions.
- Understand the requested feature.

### Step 2: Plan

Determine:

- Which files need modification.
- Whether new components are necessary.
- Whether dependencies are needed.
- Potential compatibility issues.
- Possible performance or security implications.

For complex tasks, provide a concise implementation plan before making changes.

### Step 3: Implement

- Follow existing conventions.
- Make the smallest complete change.
- Reuse existing components.
- Maintain responsive behavior.
- Preserve existing functionality.
- Avoid unrelated refactoring.

### Step 4: Verify

- Run relevant tests.
- Run linting and type checks.
- Verify the production build.
- Inspect the final changes.
- Fix issues introduced by the implementation.

### Step 5: Report

When completing a task, summarize:

1. What was implemented.
2. Which files were changed.
3. Important technical decisions.
4. Tests and checks performed.
5. Any remaining issues or limitations.

Be transparent about anything that could not be verified.

---

## 16. Design Implementation Rules

When implementing a design from a screenshot, reference, or description:

- Match the overall layout and visual hierarchy.
- Reproduce spacing and proportions carefully.
- Match typography and color relationships.
- Use appropriate image assets.
- Preserve the intended responsive behavior.
- Avoid arbitrary visual changes.
- Ensure the final result looks cohesive.

Do not produce a generic design when a specific reference has been provided.

If an exact asset is unavailable, use a suitable alternative rather than a broken image or unrelated placeholder.

---

## 17. Animation and Interaction

Animations should improve usability rather than distract users.

- Use subtle transitions.
- Avoid excessive motion.
- Respect `prefers-reduced-motion`.
- Prevent animations from blocking interactions.
- Avoid unnecessary animation libraries.
- Maintain smooth interaction performance.
- Provide clear hover, focus, active, and disabled states.

Interactive elements must have meaningful behavior. Do not create decorative buttons that appear functional but do nothing.

---


## 18. Definition of Done

A task is complete only when:

- [ ] The requested functionality is implemented.
- [ ] Existing functionality remains intact.
- [ ] Code follows project conventions.
- [ ] Components are reusable where appropriate.
- [ ] Responsive layouts are verified.
- [ ] Accessibility has been considered.
- [ ] Loading and error states are handled.
- [ ] No unnecessary dependencies were introduced.
- [ ] Linting and type checks pass where available.
- [ ] Relevant tests pass.
- [ ] Production build succeeds where applicable.
- [ ] No unintended changes or exposed secrets remain.
- [ ] Implementation details are documented in the final report.

---

## 19. Final Instructions to AI Agents

Always prioritize:

1. Correctness over speed.
2. Maintainability over unnecessary complexity.
3. Consistency over personal coding preferences.
4. Accessibility over visual shortcuts.
5. Performance over unnecessary effects.
6. Security over convenience.
7. Existing project conventions over arbitrary architectural changes.
8. Tested implementations over assumptions.

**Golden Rule:**

Build every feature as if it will be maintained by another developer, used by real customers, accessed from multiple devices, and deployed to production.

Do not settle for code that merely works. Deliver code that is reliable, accessible, performant, secure, and maintainable.