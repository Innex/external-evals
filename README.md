# SupportHub - AI Customer Support Platform

A multi-tenant, AI-powered customer support platform built with Next.js 16, featuring customizable bots, knowledge base embeddings, and Braintrust evaluation integration.

## Features

- 🤖 **Multi-Provider AI**: Support for OpenAI, Anthropic, and Google AI models
- 🏢 **Multi-Tenant**: Each customer gets isolated configuration and branding
- 📚 **Knowledge Base**: Upload markdown documents with automatic embedding via pgvector
- 💬 **Embeddable Widget**: Drop-in chat widget for any website
- 📊 **Braintrust Tracing**: Every AI interaction is traced for evaluation
- 🔄 **Datasets & Evals**: Save examples, annotate responses, and run evaluations
- 🎨 **Customizable**: Per-tenant branding, instructions, and AI configuration
- 🔐 **Clerk Auth**: Managed authentication with Google/GitHub/email/password

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **Vector Search**: pgvector for document embeddings
- **AI SDK**: Vercel AI SDK with multi-provider support
- **Tracing**: Braintrust SDK for observability and evaluation
- **Auth**: Clerk (simple, hosted auth)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel-ready

## Quick Start

### Prerequisites

- Node.js 20+
- Clerk account (free at [clerk.com](https://clerk.com))
- PostgreSQL with pgvector (optional for demo, required for full app)
- OpenAI API key for embeddings/evals (required) + any additional provider keys you plan to use
- Braintrust API key (optional, for tracing)

### 1. Clone and Install

This repo uses **pnpm** exclusively. If you don't already have it, install it once:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Clone and install dependencies:

```bash
git clone <repository-url>
cd braintrust-evals-app
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment file and fill in your values:

```bash
cp env.example .env
```

Required variables:

```env
# Clerk Auth (get from dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Database (optional for demo, required for real data)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/braintrust_support"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Braintrust
BRAINTRUST_API_KEY="bt_sk_..."
# Use the numeric ID if available for faster BTQL queries, otherwise the name is used
BRAINTRUST_PROJECT_ID="proj_123"
BRAINTRUST_PROJECT_NAME="customer-support-platform"

# OpenAI (required for document embeddings + evals)
OPENAI_API_KEY="sk-..."
```

### Run PostgreSQL locally

A ready-to-go Postgres + pgvector instance is included via Docker.

```bash
# Start the database in the background
pnpm docker:db
# or manually
docker compose up db --detach
```

The service exposes `postgresql://postgres:postgres@localhost:5433/braintrust_support`.

### Apply the schema

Once the database is running, push the schema:

```bash
pnpm db:push
```

### 3. Set Up Database

Ensure PostgreSQL is running with pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Push the schema:

```bash
pnpm db:push
```

### 4. Run Development Server

```bash
pnpm dev --port 3001
```

Visit [http://localhost:3001](http://localhost:3001)

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── tenants/      # Tenant CRUD
│   │   └── widget/       # Chat API with tracing
│   ├── dashboard/        # Admin dashboard
│   ├── sign-in/          # Clerk sign-in route
│   ├── sign-up/          # Clerk sign-up route
│   └── widget/           # Embeddable chat widget
├── components/
│   └── ui/               # shadcn/ui components
├── db/
│   ├── index.ts          # Drizzle client
│   └── schema.ts         # Database schema
├── lib/
│   ├── ai/               # AI providers & embeddings
│   ├── braintrust.ts     # Braintrust integration
│   └── utils.ts          # Utilities
└── public/
    └── widget.js         # Embeddable widget script
```

## Usage

### Creating a Support Bot

1. Sign in with Google
2. Click "Create Your First Bot"
3. Configure:
   - Name and URL slug
   - AI provider and model
   - System instructions
   - API key for the chosen provider

### Embedding the Widget

Add this script to your website:

```html
<script
  src="https://your-deployment.vercel.app/widget.js"
  data-tenant="your-bot-slug"
  async
></script>
```

### Viewing Traces

All AI interactions are logged to:

1. The local database (accessible via Dashboard → Traces)
2. Braintrust (if configured) for advanced analysis and evaluation

### Running Evaluations

1. Annotate traces with expected outputs
2. Save examples to a dataset
3. Trigger an evaluation to run against your dataset

## Database Schema

Key entities:

- **Users/Sessions**: Clerk authentication
- **Tenants**: Multi-tenant configuration (instructions, branding, API keys)
- **Documents/DocumentChunks**: Knowledge base with vector embeddings
- **Conversations/Messages**: Chat history
- **Traces**: AI interaction logs for evaluation
- **Datasets/DatasetExamples**: Evaluation test cases
- **Evals**: Evaluation runs and results

## Deployment

### Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Database Options

- **Neon**: Serverless Postgres with pgvector
- **Supabase**: Postgres with pgvector extension
- **Railway**: Managed Postgres

## Development

```bash
# Run dev server
pnpm dev --port 3001

# Push schema changes
pnpm db:push

# Generate migrations
pnpm db:generate

# Open Drizzle Studio
pnpm db:studio

# Lint
pnpm lint
```

## Architecture

### Multi-Tenant Isolation

Each tenant has:

- Unique slug for widget URL
- Isolated API keys (stored encrypted)
- Separate conversation and trace history
- Custom branding and instructions

### AI Flow

1. User sends message via widget
2. System retrieves relevant context from pgvector
3. Builds prompt with instructions + context
4. Streams response via Vercel AI SDK
5. Logs trace to local DB + Braintrust

### Braintrust Integration

- **Tracing**: Every chat completion is wrapped with Braintrust tracing
- **Metadata**: Tenant info, model config, and context are logged
- **Evaluation**: Datasets can be exported and evaluated in Braintrust

## License

MIT

## Links

- [Braintrust Documentation](https://www.braintrust.dev/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team)
