# CLAUDE.md

Project-specific instructions for Claude Code.

## Project Overview

AImage is an AI image generation app. Next.js 16 App Router + Drizzle ORM + SQLite + OpenAI SDK v6.

## Commands

- `bun install` - Install dependencies
- `bun run dev` - Start dev server (port 3000)
- `bun run build` - Production build (includes TypeScript check)
- `npm test` - Run tests (NEVER use `bun test`)
- `npm test -- --watch` - Watch mode
- `npm test -- --coverage` - Coverage report
- `bun run lint` - ESLint
- `bun run format` - Prettier format
- `bunx drizzle-kit push` - Push schema changes to SQLite

## Architecture

### Stack

- Next.js 16 with App Router (async params: `{ params: Promise<T> }`)
- Drizzle ORM with SQLite (better-sqlite3), WAL mode
- OpenAI SDK v6 for image generation and chat completions
- Zod v4 (import from `zod/v4`) for all validation
- Tailwind CSS v4
- Vitest + Testing Library for tests

### Key Directories

- `src/app/api/` - API route handlers
- `src/components/` - React client components
- `src/db/` - Database schema and connection
- `src/hooks/` - React hooks (useGeneration for SSE)
- `src/lib/` - Shared utilities (openai, paths, settings, optimize, validations)
- `src/test/` - Test setup, fixtures, and shared mock factories
- `generated-images/` - Runtime image storage (gitignored)

### Database Schema

Four tables: `image_sets`, `generated_images`, `reference_images`, `app_settings`. FK columns have indexes. Schema defined in `src/db/schema.ts`.

### Environment Variables

- `OPENAI_API_KEY` - Required (or set via Settings UI)
- `APP_SECRET` - Optional, enables AES-256-GCM encryption for stored API keys
- `DATABASE_PATH` - Optional, absolute path to SQLite file (default: `./sqlite.db`)

## Patterns and Conventions

### File Naming

- Generated images: `{timestamp}-{index}.png`
- Reference images: `ref-{timestamp}-{random8}.{ext}`
- Optimized images: `{original}_optimized.webp`

### Path Security

Always use `getImageFilePath()` or `getImageSetDir()` from `src/lib/paths.ts` - they validate against path traversal. Never use raw `path.join()` for user-provided filenames.

### API Routes

- All route handlers use Next.js 16 async params: `{ params: Promise<{ id: string }> }`
- Wrap `request.json()` in try-catch for malformed body handling
- Strip `filePath` from all client-facing responses (security)
- Image deletion uses `db.transaction()` for atomicity

### SSE Generation

- Generate route streams events: `started`, `progress`, `image_saved`, `warning`, `error`, `complete`
- Client abort via `request.signal` stops generation mid-loop
- Client hook validates SSE data with Zod schemas

### OpenAI Integration

- `images.edit()` for reference images (GPT-image-1 only)
- `images.generate()` for all other models
- DALL-E models don't support reference images - warn and fall back
- Use `toFile(buffer, name, { type })` from openai SDK for Uploadable objects

### Settings

- Stored in `app_settings` table (key-value)
- Sensitive keys (openai_api_key) encrypted with AES-256-GCM when APP_SECRET is set
- Settings API masks API key in GET responses

### Component Communication

- Sidebar and ImageSetView are siblings; communicate via `imageset-renamed` CustomEvent on `window`
- Generation progress via useGeneration hook (SSE streaming)

## Testing

### Test Structure

- Co-located: `route.test.ts` next to `route.ts`
- Shared mocks in `src/test/mocks/` (db, fs, openai, paths, settings, optimize, next-request)
- Test fixtures in `src/test/fixtures.ts`

### Mock Patterns

- **Drizzle DB**: Chainable mock via `chain()` factory - supports `select/insert/update/delete` with `from/where/get/all` chaining and `db.transaction()`
- **fs**: Mocks both sync methods and `fs/promises` async methods. Includes `createReadStream` returning a Readable stream.
- **Next.js params**: `createParams({ id: "..." })` wraps in `{ params: Promise.resolve(...) }`
- **SSE testing**: `readSSEEvents(response)` parses SSE text into `{ event, data }[]`

### Running Tests

```bash
npm test                           # All tests
npm test -- src/lib/paths.test.ts  # Single file
npm test -- --watch                # Watch mode
```

## Pre-commit Hooks

Husky runs `prettier --check` and `eslint` on commit. Run `bun run format` before committing if formatting issues arise.

## Linting Notes

- `@typescript-eslint/no-explicit-any` is disabled in test files and `src/test/`
- `@next/next/no-img-element` warnings on `<img>` tags are expected (dynamically served images)
