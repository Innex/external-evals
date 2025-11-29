# Agent guidelines

This document contains guidelines and preferences for AI agents working on this codebase.

## Design principles

### Text and copy

- **Use sentence case** for all UI text, including:
  - Headings and titles
  - Button labels
  - Navigation items
  - Form labels
  - Descriptions and helper text
  
- Examples:
  - ✅ "Get started" (not "Get Started")
  - ✅ "Knowledge base" (not "Knowledge Base")
  - ✅ "Sign in" (not "Sign In")
  - ✅ "Customer support that learns" (not "Customer Support That Learns")

- Exceptions:
  - Proper nouns (SupportHub, Braintrust, OpenAI, etc.)
  - Acronyms (AI, API, etc.)

### UI/UX

- Modern, clean aesthetic with the brand's violet/indigo color scheme
- Use shadcn/ui components as the foundation
- Responsive design with mobile-first approach
- Dark mode support via next-themes

## Tech stack preferences

### Framework

- **Next.js 16** (App Router) - always use the latest stable version
- Use the Next.js devtools MCP when available for documentation lookups
- Turbopack is the default bundler

### Database

- **Drizzle ORM** - not Prisma
- **PostgreSQL** with **pgvector** extension for embeddings
- Use Neon, Supabase, or Railway for hosted Postgres
- Schema defined in `db/schema.ts`

### Authentication

- **Clerk** for authentication (simple, hosted solution)
- Supports Google, GitHub, email/password out of the box
- No database needed for auth - Clerk handles it

### AI/LLM

- **Vercel AI SDK** (`ai` package) for streaming and multi-provider support
- Support for OpenAI, Anthropic, and Google AI providers
- **Braintrust** for tracing and evaluation
  - Platform-level API key via env var (`BRAINTRUST_API_KEY`)
  - Per-tenant AI API keys stored in database

### Styling

- **Tailwind CSS** with tailwindcss-animate
- **shadcn/ui** components in `components/ui/`
- **Framer Motion** for animations
- **Geist** font family
- CSS variables for theming (defined in `globals.css`)

### Type safety

- Modern TypeScript throughout
- Zod for runtime validation
- Drizzle's inferred types for database entities

## Architecture

### Multi-tenant model

- Tenants are isolated by `tenantId` foreign keys
- Users can belong to multiple tenants via `tenantMembers`
- Each tenant has their own:
  - AI configuration (provider, model, instructions)
  - API keys (encrypted storage recommended for production)
  - Documents/knowledge base
  - Conversations and traces
  - Datasets and evaluations

### Key directories

```
app/
├── api/          # API routes
├── dashboard/    # Admin dashboard (protected)
├── login/        # Auth pages
└── widget/       # Embeddable chat widget

components/
└── ui/           # shadcn/ui components

db/
├── index.ts      # Drizzle client
└── schema.ts     # Database schema

lib/
├── ai/           # AI providers and embeddings
├── auth.ts       # NextAuth config
├── braintrust.ts # Braintrust integration
└── utils.ts      # Utilities
```

## Deployment

- Designed for **Vercel** deployment
- Environment variables documented in `env.example`
- Database migrations via `pnpm db:push` or `pnpm db:migrate`

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio
pnpm lint         # Run ESLint
```

