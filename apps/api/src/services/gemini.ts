import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getApiKey(): string {
  return process.env.GEMINI_API_KEY || '';
}

function getChatModelName(): string {
  const configured = process.env.GEMINI_CHAT_MODEL;
  if (!configured || configured.includes('2.5-flash') || configured.includes('1.5-flash')) {
    return 'gemini-3.8-flash';
  }
  return configured;
}

function getEmbeddingModelName(): string {
  const configured = process.env.GEMINI_EMBEDDING_MODEL;
  if (!configured || configured.includes('text-embedding-004')) {
    return 'gemini-embedding-001';
  }
  return configured;
}

function getGenAI(): GoogleGenerativeAI | null {
  const key = getApiKey().trim();
  if (key.length > 5) {
    return new GoogleGenerativeAI(key);
  }
  return null;
}

/**
 * Generate embedding vector (768 dimensions for pgvector).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = getGenAI();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: getEmbeddingModelName() });
      // The Gemini embedding API supports outputDimensionality for Matryoshka embeddings (768 for pgvector),
      // but @google/generative-ai TypeScript definitions do not include outputDimensionality on EmbedContentRequest,
      // and require role on Content.
      const result = await (model.embedContent as any)({
        content: { role: 'user', parts: [{ text: text.slice(0, 2048) }] },
        outputDimensionality: 768,
      });
      if (result.embedding?.values && result.embedding.values.length > 0) {
        let values: number[] = result.embedding.values;
        if (values.length > 768) {
          values = values.slice(0, 768);
        }
        return values;
      }
    } catch (err) {
      console.warn('Gemini embedding API call failed, falling back to local vector representation:', err);
    }
  }

  // Deterministic local 768-dim pseudo-embedding fallback when API key is missing or quota exceeded
  return generateLocalEmbedding(text);
}

/**
 * Generate batch embeddings for multiple chunks.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const emb = await generateEmbedding(text);
    results.push(emb);
  }
  return results;
}

export interface RetrievedChunk {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  similarity?: number;
}

export interface Citation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  evidence: string;
}

export interface GroundedAnswerResult {
  answer: string;
  citations: Citation[];
}

/**
 * Generates an answer grounded strictly on the supplied document chunks.
 */
export async function generateGroundedAnswer(
  question: string,
  retrievedChunks: RetrievedChunk[]
): Promise<GroundedAnswerResult> {
  // If no chunks were retrieved or evidence is empty
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      answer: "I couldn't find enough information to answer this question from your uploaded documents.",
      citations: [],
    };
  }

  // Format evidence sources
  const formattedEvidence = retrievedChunks
    .map(
      (chunk, index) =>
        `SOURCE ${index}\nDocument: ${chunk.documentName}\nPage: ${chunk.pageNumber}\nContent: ${chunk.content}`
    )
    .join('\n\n---\n\n');

  const systemPrompt = `You are Pharma AI, a pharmaceutical research assistant.
Answer using only the supplied document evidence.
Do not invent information.
If the evidence does not contain enough information to answer the question, say that the information could not be found in the uploaded documents.
Do not provide diagnosis, prescriptions, or medical treatment decisions.
This application is for research assistance only.

You must respond strictly with valid JSON with the following structure:
{
  "answer": "Your concise, objective, factual answer grounded in the evidence.",
  "sourceIndexes": [0, 1] // array of integer indices of the sources that directly contain the facts used
}

If the evidence is insufficient to answer the question, return:
{
  "answer": "I couldn't find enough information to answer this question from your uploaded documents.",
  "sourceIndexes": []
}`;

  const userPrompt = `Question: ${question}

Retrieved Evidence:
${formattedEvidence}

Provide your response in JSON:`;

  const genAI = getGenAI();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: getChatModelName(),
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const response = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      const textOutput = response.response.text();
      let parsed: { answer: string; sourceIndexes: number[] };

      try {
        parsed = JSON.parse(textOutput);
      } catch {
        // Fallback JSON match
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = { answer: textOutput, sourceIndexes: [0] };
        }
      }

      // Map sourceIndexes to real retrieved chunks
      const citations: Citation[] = [];
      if (Array.isArray(parsed.sourceIndexes)) {
        for (const idx of parsed.sourceIndexes) {
          if (idx >= 0 && idx < retrievedChunks.length) {
            const chunk = retrievedChunks[idx];
            // Avoid duplicate citations for same doc + page
            const exists = citations.some(
              (c) => c.documentId === chunk.documentId && c.pageNumber === chunk.pageNumber
            );
            if (!exists) {
              citations.push({
                documentId: chunk.documentId,
                documentName: chunk.documentName,
                pageNumber: chunk.pageNumber,
                evidence: chunk.content,
              });
            }
          }
        }
      }

      return {
        answer: parsed.answer || "I couldn't find enough information to answer this question from your uploaded documents.",
        citations,
      };
    } catch (err) {
      console.warn('Gemini chat API call failed, falling back to deterministic extraction:', err);
    }
  }

  // Deterministic grounded response fallback when API key is not configured yet
  return generateDeterministicGroundedAnswer(question, retrievedChunks);
}

/**
 * Deterministic grounding extraction when GEMINI_API_KEY is not set
 * Ensures real citations and exact document evidence are always shown
 */
function generateDeterministicGroundedAnswer(
  question: string,
  chunks: RetrievedChunk[]
): GroundedAnswerResult {
  const qTerms = question
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Score chunks by term overlap
  let bestChunk: RetrievedChunk | null = null;
  let maxScore = 0;

  for (const chunk of chunks) {
    const textLower = chunk.content.toLowerCase();
    let score = 0;
    for (const term of qTerms) {
      if (textLower.includes(term)) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestChunk = chunk;
    }
  }

  if (!bestChunk || maxScore === 0) {
    return {
      answer: "I couldn't find enough information to answer this question from your uploaded documents.",
      citations: [],
    };
  }

  // Extract sentences matching terms
  const sentences = bestChunk.content.split(/(?<=[.!?])\s+/);
  const relevantSentences = sentences.filter((s) =>
    qTerms.some((term) => s.toLowerCase().includes(term))
  );

  const answerText =
    relevantSentences.length > 0
      ? relevantSentences.slice(0, 3).join(' ')
      : bestChunk.content.slice(0, 250) + '...';

  return {
    answer: answerText,
    citations: [
      {
        documentId: bestChunk.documentId,
        documentName: bestChunk.documentName,
        pageNumber: bestChunk.pageNumber,
        evidence: bestChunk.content,
      },
    ],
  };
}

/**
 * Local deterministic 768-dimension pseudo-embedding generator
 */
function generateLocalEmbedding(text: string): number[] {
  const dim = 768;
  const vec = new Float64Array(dim);
  const clean = text.toLowerCase();

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const idx = (code * 31 + i * 17) % dim;
    vec[idx] += 1.0;
  }

  // Normalize vector to unit length
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}
