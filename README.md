# xAI Chorus

Chorus is a spatial reasoning interface for the age of AGI. It moves beyond the constraints of linear chat, offering an infinite canvas where thoughts, data, and AI models converge to solve complex problems.

## Features

### Infinite Canvas Workspace

The core of Chorus is an infinite 2D canvas where you can:
- **Create nodes** by right-clicking anywhere on the canvas
- **Connect nodes** by dragging from connection handles to establish relationships
- **Pan and zoom** to navigate large workspaces
- **Drag and drop files** directly onto the canvas
- **Draw freeform arrows** to annotate and point at elements

### Node Types

#### Text Nodes (Chat with AI)
Conversational nodes powered by xAI's Grok models:
- **Multi-turn conversations** with full context preservation
- **Web search integration** for real-time information retrieval
- **File attachments** for document analysis (PDFs, code, text files)
- **Streaming responses** with real-time text generation
- **Reasoning display** for models that support extended thinking
- **Message editing** and regeneration
- **Branch conversations** by splitting nodes

#### Image Nodes (AI Image Generation)
Generate and edit images using Grok Imagine:
- **Text-to-image generation** with customizable prompts
- **Image editing mode** using reference images
- **Multiple image generation** (1-4 images per request)
- **Quality settings** (low, medium, high)
- **Image download** and fullscreen preview
- **Context-aware generation** from connected text nodes

#### Post-it Notes
Collaborative sticky notes for quick annotations:
- **Customizable background colors** (8 preset colors)
- **Customizable text colors** (8 preset colors)
- **Real-time text sync** across collaborators
- **Handwriting-style font** for natural feel
- **Resizable** to fit content

#### File Nodes
Upload and attach files for AI analysis:
- **Drag-and-drop upload** directly onto canvas
- **File preview** with type icons
- **Automatic xAI file upload** for chat context
- **Support for documents, code, and text files**

### AI Models

Chorus integrates with xAI's suite of Grok models:

| Model | Use Case | Features |
|:------|:---------|:---------|
| **Grok 4** | Complex reasoning | Extended thinking, deep analysis |
| **Grok 4.1 Fast** | Quick responses | Multimodal, agentic tool calling |
| **Grok Beta** | General chat | Fast, reliable responses |
| **Grok 3** | Advanced reasoning | Thinking summaries |
| **Grok Imagine v0.9** | Image generation | Text-to-image, image editing |
| **Grok 2 Image** | Image generation | Latest image model |

### Real-Time Collaboration

Work together with others on the same canvas:
- **Live cursors** showing collaborator positions
- **Real-time node updates** as others type and edit
- **Presence indicators** showing who's online
- **Collaborator highlighting** with unique colors per user
- **Shared canvas state** synced across all participants

#### Sharing Options
- **Private** - Only you can access
- **Public View** - Anyone with link can view
- **Public Edit** - Anyone with link can edit

### Freeform Arrow Drawing

Annotate your canvas with hand-drawn arrows:
- **Toggle draw mode** from the toolbar
- **8 color options** for arrows
- **Click and drag** to draw arrow paths
- **Smooth curve rendering** with arrowheads
- **Select and delete** arrows
- **Real-time sync** with collaborators

### Canvas Management

#### Auto-Save
- Automatic saving every 2 seconds of inactivity
- Visual save status indicator

#### Version History
- Automatic snapshots every 5 minutes
- Manual version restoration
- View history of canvas changes

#### Auto-Titling
- Intelligent title generation from first message
- Automatic canvas naming based on content

### User Features

#### Authentication
- Email/password signup and login
- Persistent sessions

#### Profile
- Customizable avatar (upload or auto-generated)
- Profile picture displayed in collaboration

#### Sidebar
- Canvas history with recent items
- Search canvases
- Rename and delete canvases
- Share canvas access
- Collaborator avatars on shared canvases

## Architecture

Built on a modern stack designed for performance and interactivity:

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [React Flow](https://reactflow.dev/) (Node-based UI)
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) for persistent state and user management
- **Real-time**: Supabase Realtime for collaboration features
- **AI Integration**: Direct integration with [xAI API](https://x.ai/) for chat, reasoning, vision, and image generation
- **Animation**: [GSAP](https://gsap.com/) and [Lenis](https://lenis.darkroom.engineering/) for fluid interactions

## Deployment

### Prerequisites

To deploy Chorus, you will need:
1. A **Vercel** account (for frontend/backend hosting)
2. A **Supabase** project (for database, authentication, and real-time)
3. An **xAI API Key** (for AI model access)

### Environment Variables

Configure the following environment variables in your deployment environment:

| Variable | Description | Required |
|:---------|:------------|:---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous public API key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (for admin operations) | Yes |
| `XAI_API_KEY` | Your xAI API key for accessing Grok models | Yes |

### Database Setup

Initialize your Supabase database by running the SQL schema provided in `supabase-schema.sql`. This sets up tables for:
- Users and authentication
- Canvases (nodes, edges, arrows)
- Canvas sharing and permissions
- Version history

### Deploy to Vercel

1. Push your code to a Git repository (GitHub, GitLab, Bitbucket)
2. Import the project into Vercel
3. Add the environment variables listed above
4. Deploy

## Usage Tips

### Keyboard Shortcuts
- **Right-click** - Open add node menu
- **Delete/Backspace** - Delete selected node or arrow
- **Escape** - Cancel arrow drawing

### Workflow Ideas
- **Research**: Create text nodes for different topics, connect related concepts
- **Brainstorming**: Use post-its for quick ideas, connect with arrows
- **Document Analysis**: Upload files, ask questions in connected text nodes
- **Image Iteration**: Generate images, use as context for variations
- **Collaborative Planning**: Share canvas, work together in real-time

## License

[MIT](LICENSE)
