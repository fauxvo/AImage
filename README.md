# AImage

AI-powered image generation app built with Next.js, OpenAI, and SQLite.

## Features

- **Image Generation** - Generate images using OpenAI's GPT-image-1, GPT-image-1-mini, DALL-E 3, and DALL-E 2 models
- **Reference Images** - Upload reference images to guide generation (GPT-image-1 only, via `images.edit()`)
- **AI Prompt Refinement** - Use GPT-4o/4.1 to refine prompts with suggested settings
- **Style Controls** - Art style, mood, lighting, and custom modifiers appended to prompts
- **Image Optimization** - Auto or manual WebP optimization via sharp
- **Image Sets** - Organize generations into named sets with batch grouping
- **Real-time Progress** - SSE streaming for generation progress with abort support
- **Lightbox** - Full-size image viewer with keyboard navigation (Escape, arrow keys)
- **Settings** - Configurable models, API key management with encryption at rest

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **AI**: OpenAI SDK v6 (image generation + chat completions)
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest + Testing Library (173 tests)
- **Image Processing**: sharp (WebP optimization)

## Getting Started

### Prerequisites

- Node.js 20+ or Bun
- An OpenAI API key

### Installation

```bash
bun install
```

### Database Setup

```bash
bunx drizzle-kit push
```

### Environment Variables

Create a `.env.local` file:

```env
# Required - set via env or through the Settings UI
OPENAI_API_KEY=sk-...

# Optional - enables AES-256-GCM encryption of API keys stored in the database
APP_SECRET=your-random-secret-string

# Optional - custom database file location (defaults to ./sqlite.db)
DATABASE_PATH=/path/to/sqlite.db
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
bun run build
bun run start
```

## Scripts

| Script                   | Description                   |
| ------------------------ | ----------------------------- |
| `bun run dev`            | Start development server      |
| `bun run build`          | Production build              |
| `bun run start`          | Start production server       |
| `npm test`               | Run all tests                 |
| `npm test -- --watch`    | Run tests in watch mode       |
| `npm test -- --coverage` | Run tests with coverage       |
| `bun run lint`           | Run ESLint                    |
| `bun run format`         | Format with Prettier          |
| `bunx drizzle-kit push`  | Push schema changes to SQLite |

## Project Structure

```
src/
  app/
    api/
      image-sets/           # CRUD for image sets
        [id]/
          generate/          # SSE image generation endpoint
          refine-prompt/     # AI prompt refinement
          reference-images/  # Reference image upload/delete
          open-folder/       # Open image folder on host OS
      images/               # Image serving + optimization
      settings/             # App settings API
    image-set/[id]/         # Image set detail page
    settings/               # Settings page
  components/
    ImageSetView.tsx         # Main image set editor
    ImageGrid.tsx            # Image grid with lightbox
    PromptEditor.tsx         # Prompt editing + AI refinement
    ReferenceImages.tsx      # Reference image upload/management
    GenerationProgress.tsx   # SSE progress display
    Settings.tsx             # Settings panel
    Sidebar.tsx              # Navigation sidebar
  db/
    schema.ts               # Drizzle schema (image_sets, generated_images, reference_images, app_settings)
    index.ts                # Database connection
  hooks/
    useGeneration.ts         # SSE generation hook with Zod validation
  lib/
    openai.ts               # OpenAI client factory
    paths.ts                # File path utilities with traversal protection
    settings.ts             # Settings CRUD with optional encryption
    optimize.ts             # Sharp-based image optimization
    validations.ts          # Zod schemas, types, and constants
  test/
    mocks/                  # Shared test mock factories
    fixtures.ts             # Test data fixtures
    setup.ts                # Test setup (jest-dom, mock restore)
```

## API Overview

| Method | Endpoint                                      | Description                      |
| ------ | --------------------------------------------- | -------------------------------- |
| GET    | `/api/image-sets`                             | List all image sets              |
| POST   | `/api/image-sets`                             | Create image set                 |
| GET    | `/api/image-sets/:id`                         | Get image set with images        |
| PATCH  | `/api/image-sets/:id`                         | Update image set                 |
| DELETE | `/api/image-sets/:id`                         | Delete image set (transactional) |
| POST   | `/api/image-sets/:id/generate`                | Generate images (SSE stream)     |
| POST   | `/api/image-sets/:id/refine-prompt`           | AI prompt refinement             |
| GET    | `/api/image-sets/:id/reference-images`        | List reference images            |
| POST   | `/api/image-sets/:id/reference-images`        | Upload reference images          |
| DELETE | `/api/image-sets/:id/reference-images/:refId` | Delete reference image           |
| POST   | `/api/image-sets/:id/open-folder`             | Open image folder in OS          |
| GET    | `/api/images/:setId/:fileName`                | Serve image (streaming)          |
| POST   | `/api/images/:setId/:fileName/optimize`       | Optimize image to WebP           |
| GET    | `/api/settings`                               | Get app settings                 |
| PATCH  | `/api/settings`                               | Update app settings              |

## Testing

173 tests across 19 test files covering lib modules, API routes, hooks, and components:

```bash
npm test
```

Tests use co-located test files (`*.test.ts` / `*.test.tsx`) with shared mock factories in `src/test/mocks/`.
