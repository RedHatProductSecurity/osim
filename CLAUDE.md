# OSIM — Claude Guidelines

Refer to [AI_GUIDELINES.md](./AI_GUIDELINES.md) for full project context.

## Key reminders

- Do what has been asked; nothing more, nothing less
- Never create files unless strictly necessary — prefer editing existing ones
- Never proactively create documentation unless explicitly requested
- Implement first — do not auto-run lint, type-check, or tests after changes; wait until asked
- Always use the generated OpenAPI client (`src/generated/`) for API calls
- `v-html` requires `sanitize-html` — no exceptions
