# Pharma AI

**AI-Powered Pharmaceutical Research Assistant**

Pharma AI is a document-grounded AI research assistant that helps pharmaceutical and biomedical researchers find information quickly from large research documents.

Users can upload pharmaceutical PDFs such as clinical trial reports, drug labels, and safety bulletins, ask questions in natural language, and receive answers backed by the **exact document, page number, and relevant evidence**.

### The Core Idea

**Don't just give the answer. Show where the answer came from.**

---

## Problem

Pharmaceutical research often involves working with large documents containing hundreds of pages of information.

Finding a specific piece of information can require:

* Manually searching through lengthy documents
* Reading multiple sections to understand context
* Repeating the same research for similar questions
* Verifying whether an answer is actually supported by the source

Generic AI chatbots can generate answers, but without reliable citations, researchers still have to verify the information manually.

**Pharma AI combines AI with document retrieval so that answers remain grounded in the uploaded research.**

---

## How It Works

```text
                    User
                     │
                     ▼
              Upload PDF
                     │
                     ▼
             Extract Document
                     │
                     ▼
              Split into Chunks
                     │
                     ▼
             Generate Embeddings
                     │
                     ▼
          PostgreSQL + pgvector
                     │
                     │
                     ▼
              User asks a
                question
                     │
                     ▼
            Semantic Search
                     │
                     ▼
           Relevant Evidence
                     │
                     ▼
                  LLM
                     │
                     ▼
          Answer + Citations
```

The system uses **Retrieval-Augmented Generation (RAG)** to retrieve relevant sections from the user's documents before generating an answer.

---

## Example

### User asks:

> What was the primary endpoint of the study?

### Pharma AI responds:

> The primary endpoint was progression-free survival.

**Source**

`Clinical-Trial-A.pdf`
`Page 18`

**Evidence**

> Relevant passage from the original document...

This allows the researcher to quickly verify the answer instead of trusting an unsupported AI response.

---

## Key Features

### 📄 Document Intelligence

* Upload pharmaceutical PDF documents
* Extract and process document content
* Preserve document and page information
* Track processing status

### 🔎 Semantic Search

* Search documents using natural-language questions
* Retrieve relevant sections using vector similarity
* Return the most relevant evidence for each query

### 🤖 AI Research Chat

* Ask questions about uploaded documents
* Generate answers using retrieved evidence
* Keep answers grounded in the available sources

### 📌 Verifiable Citations

* Document name
* Page number
* Supporting source passage

### 🔐 Secure Access

* User registration and login
* JWT authentication
* Password hashing
* Protected APIs

---

## Technology Stack

| Layer      | Technology                        |
| ---------- | --------------------------------- |
| Frontend   | Next.js, TypeScript, Tailwind CSS |
| Backend    | Node.js, Express.js, TypeScript   |
| Database   | PostgreSQL + pgvector             |
| ORM        | Prisma                            |
| AI         | Gemini / Groq                     |
| Storage    | Local Storage / Supabase Storage  |
| Deployment | Vercel + Supabase                 |

---

## Project Structure

The application is planned around three main layers:

```text
Frontend
   │
   ▼
Backend API
   │
   ├── Authentication
   ├── Document Processing
   ├── RAG Pipeline
   └── Chat
   │
   ▼
PostgreSQL + pgvector
```

---

## MVP

The first version focuses on one core workflow:

```text
Register
   ↓
Upload a PDF
   ↓
Process the document
   ↓
Ask a question
   ↓
Retrieve relevant evidence
   ↓
Generate an answer
   ↓
View the citation
```

The MVP is successful when a researcher can go from **document → question → answer → exact source** without manually searching the entire document.

---

## Application

The MVP will include:

* **Login** - Authentication
* **Dashboard** - Research overview
* **Documents** - Upload and manage PDFs
* **Research Chat** - Ask questions about documents
* **Document Viewer** - Inspect referenced documents and pages

---

## API

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
```

### Documents

```http
POST   /api/documents/upload
GET    /api/documents
GET    /api/documents/:id
DELETE /api/documents/:id
```

### Research

```http
POST /api/chat
GET  /api/conversations
```

---

## Medical Safety

Pharma AI is a **research assistance system**, not a medical decision-making tool.

It is not intended to provide diagnosis, prescriptions, treatment recommendations, or replace professional medical, clinical, regulatory, or scientific judgment.

> **PharmaResearch AI provides document-grounded research assistance and does not replace professional medical, clinical, regulatory, or scientific judgment.**

---

## Development Status

🚧 **Currently in development**

The project is being developed incrementally, starting with the core document upload and RAG workflow before adding advanced functionality.

### Current Development Roadmap

```text
[ ] Project Setup
[ ] Authentication
[ ] PDF Upload
[ ] PDF Processing
[ ] Embeddings & Vector Search
[ ] RAG Pipeline
[ ] Citations
[ ] Research Chat
[ ] Dashboard
[ ] Testing & Deployment
```

---

## Project Goal

Pharma AI aims to make pharmaceutical document research faster and easier to verify.

The product is built around one simple principle:

> **Answer + Evidence + Citation**

Instead of asking researchers to trust an AI-generated response, Pharma AI gives them a direct path back to the source.
