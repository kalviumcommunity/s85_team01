# Pharma AI

**Document-Grounded Pharmaceutical Research Assistant**

Pharma AI is a document-grounded pharmaceutical research workspace built for clinical trials, drug monographs, and regulatory document analysis. Rather than generating ungrounded AI text, Pharma AI adheres strictly to the core principle:

$$\textbf{ANSWER + EVIDENCE + CITATION}$$

Every generated answer is retrieved via semantic vector search in PostgreSQL (`pgvector`), grounded with Gemini, and linked directly to the exact source document and page number.

---

## 1. Demo Walk-Through

The application supports the exact demonstration flow:

1. **Sign Up / Login**: Navigate to `http://localhost:3000/login` or `/register` to access the research workspace.
2. **Dashboard**: View the clean Research Workspace overview with core metrics:
   - **Documents** (Total files)
   - **Ready** (Indexed & searchable)
   - **Processing** (Active extraction/embedding)
3. **Upload PDF**: Click **"Upload document"** and select a pharmaceutical PDF (a sample file is provided at `storage/sample_documents/Clinical-Trial-Palbociclib-Study.pdf`).
4. **Extraction & Indexing**: Observe the document transition through states:
   $$\text{Selecting File} \longrightarrow \text{Uploading} \longrightarrow \text{Processing} \longrightarrow \text{Ready}$$
5. **Document Viewer**: Click **"Open"** on the Documents page (`/documents/[id]`) to view the PDF alongside page indicators and navigation.
6. **Research Chat**: Navigate to `/chat`:
   - Filter by **"All documents"** or select a specific document.
   - Ask: *"What was the primary endpoint of the study?"*
   - Receive an answer grounded strictly on the PDF.
   - Inspect the **Sources** card displaying:
     - **Document Name** (e.g., `Palbociclib-Trial-Phase3.pdf`)
     - **Page Number** (e.g., `Page 2`)
     - **Exact Evidence Passage**
     - **`[ View source ]`** button linking to `/documents/[id]?page=2`.
7. **No Evidence Handling**: Ask an unrelated question (e.g., *"What is the velocity of Saturn?"*); the system returns:
   > *"I couldn't find enough information to answer this question from your uploaded documents."*
   > *No supporting evidence found.*

---

## 2. Project Architecture & Structure

```
pharma-ai/
├── apps/
│   ├── api/                    # Express + TypeScript + Prisma Backend
│   │   ├── src/
│   │   │   ├── index.ts        # Server entry point & routing
│   │   │   ├── prisma.ts       # Prisma client singleton
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts     # JWT auth middleware (cookie + bearer)
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts     # Register, login, logout, me
│   │   │   │   ├── documents.ts# Upload, get, stream PDF, delete
│   │   │   │   └── chat.ts     # RAG pipeline & conversation history
│   │   │   ├── services/
│   │   │   │   ├── pdf.ts      # Page-by-page extraction & chunking
│   │   │   │   ├── gemini.ts   # Gemini embeddings & grounded reasoning
│   │   │   │   ├── vector.ts   # pgvector cosine similarity search
│   │   │   │   └── sample-pdf.ts # Sample PDF generator
│   │   │   └── test-pipeline.ts# Automated verification suite
│   │   └── package.json
│   └── web/                    # Next.js 14 App Router Frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/     # /login and /register
│       │   │   ├── (dashboard)/# /dashboard, /documents, /documents/[id], /chat
│       │   │   ├── globals.css # Clean clinical styling & design tokens
│       │   │   └── layout.tsx
│       │   ├── components/     # Sidebar, UploadModal, Viewer
│       │   └── lib/            # Typed API client & Auth context
│       ├── tailwind.config.js
│       └── package.json
├── prisma/
│   └── schema.prisma           # User, Document, DocumentChunk (pgvector), Conversation, Message
├── storage/
│   ├── uploads/                # Local PDF file storage
│   └── sample_documents/       # Sample clinical trial PDFs for demo
├── docker-compose.yml          # PostgreSQL 16 with pgvector extension
├── package.json                # Monorepo orchestration scripts
└── .env.example
```

---

## 3. Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide icons
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 16 + `pgvector`
- **ORM**: Prisma (with native pgvector vector extension)
- **AI**: Gemini (`text-embedding-004` & `gemini-2.5-flash` / `gemini-1.5-flash`)
- **PDF Extraction**: `pdfjs-dist` (page-by-page extraction preserving page numbers)
- **Authentication**: JWT stored in HTTP-only cookies + Authorization header support
- **Development**: Docker Compose for PostgreSQL + pgvector

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js 18+ (tested on Node v23)
- Docker & Docker Compose

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start PostgreSQL with pgvector
```bash
npm run db:up
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `.env` contains:
```env
DATABASE_URL=postgresql://pharma_user:pharma_password@localhost:5432/pharma_ai?schema=public
JWT_SECRET=pharma_ai_secure_jwt_secret_key_2026_dev
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
STORAGE_PATH=./storage/uploads
NEXT_PUBLIC_API_URL=http://localhost:5000
PORT=5000
```
> *Note: If `GEMINI_API_KEY` is not provided during local evaluation, the service automatically uses its local deterministic embedding & extraction fallback so demonstrations run out of the box without crashing.*

### Step 4: Apply Database Schema
```bash
npm run db:push
```

### Step 5: Start Frontend and Backend
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- API Server: `http://localhost:5000`
- API Health Check: `http://localhost:5000/api/health`

### Step 6: Run Automated Backend Tests
To verify PDF extraction, pgvector retrieval, and grounded citations:
```bash
npm run test --workspace=apps/api
```

---

## 5. Design Principles (Human-Designed UI)

The user interface follows the styling of pharmaceutical software (Veeva Vault, Benchling, PubMed):
- **Clean white / light-gray palette** (`bg-[#f8fafc]`, `bg-white`)
- **Dark navy text** (`text-slate-900`, `text-slate-800`)
- **Restrained accents** (clinical sapphire `#1e3a8a`, emerald `#059669` for Ready, amber `#d97706` for Processing)
- **Intentional whitespace & subtle borders** (`border-slate-200`)
- **Natural, professional terminology**: "Research workspace", "Your documents", "Recent documents", "Ask a question about your research", "Sources", "View source".
- **Medical Disclaimer**:
  > *"Pharma AI provides document-grounded research assistance and does not replace professional medical, clinical, regulatory, or scientific judgment."*

---

## 6. Limitations & Notes
- Text extraction requires standard PDF documents with digital text layers (OCR is intentionally omitted per requirements).
- PDFs containing only scanned images without extractable text will display: *"Text could not be extracted from this PDF."*
