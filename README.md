# xAI Chorus

Chorus is a spatial reasoning interface for the age of AGI. It moves beyond the constraints of linear chat, offering an infinite canvas where thoughts, data, and AI models converge to solve complex problems.

## Overview

Chorus provides a unified workspace for:
- **Spatial Reasoning**: Visualize thought processes, branch conversations, and organize complex information on an infinite 2D plane.
- **Multi-Modal Intelligence**: Seamlessly integrate text, vision, and reasoning models (Grok 3, Grok 4.1, Grok Imagine).
- **Deep Reasoning**: Leverage next-generation reasoning capabilities to analyze, plan, and execute multi-step workflows.
- **Knowledge Integration**: Upload files, images, and data sources directly onto the canvas for immediate context-aware analysis.

## Architecture

Built on a modern stack designed for performance and interactivity:

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [React Flow](https://reactflow.dev/) (Node-based UI).
- **Backend**: Next.js API Routes (Serverless Functions).
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) for persistent state and user management.
- **AI Integration**: Direct integration with [xAI API](https://x.ai/) for chat, reasoning, and vision capabilities.
- **Animation**: [GSAP](https://gsap.com/) and [Lenis](https://lenis.darkroom.engineering/) for fluid interactions and smooth scrolling.

## Deployment

### Prerequisites

To deploy Chorus, you will need:
1.  A **Vercel** account (for frontend/backend hosting).
2.  A **Supabase** project (for database and authentication).
3.  An **xAI API Key** (for AI model access).

### Environment Variables

Configure the following environment variables in your deployment environment (e.g., Vercel Project Settings):

| Variable | Description | Required |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous public API key. | Yes |
| `XAI_API_KEY` | Your xAI API key for accessing Grok models. | Yes |

### Database Setup

Initialize your Supabase database by running the SQL schema provided in `supabase-schema.sql`. This sets up the necessary tables for users, canvases, and sessions.

### Deploy to Vercel

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project into Vercel.
3.  Add the environment variables listed above.
4.  Deploy.

## License

[MIT](LICENSE)
