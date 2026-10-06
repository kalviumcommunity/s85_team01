import path from 'path';
import fs from 'fs';
import { generateSamplePharmaPdf } from './services/sample-pdf';
import { extractPdfPages, chunkPages } from './services/pdf';
import { generateEmbedding, generateGroundedAnswer } from './services/gemini';
import { saveChunkEmbedding, searchSimilarChunks } from './services/vector';
import prisma from './prisma';

async function runPipelineTests() {
  console.log('--- Starting Pharma AI Backend Verification Tests ---');

  // 1. Generate sample PDF
  const testPdfPath = path.resolve('./storage/uploads/test-clinical-trial.pdf');
  const uploadsDir = path.dirname(testPdfPath);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  await generateSamplePharmaPdf(testPdfPath);
  console.log('✓ Created test PDF document at:', testPdfPath);

  // 2. Extract pages
  const { pages, totalPages } = await extractPdfPages(testPdfPath);
  console.log(`✓ Extracted ${pages.length} pages (totalPages: ${totalPages})`);
  if (pages.length !== 3) {
    throw new Error(`Expected 3 pages, got ${pages.length}`);
  }
  console.log('  Page 1 sample:', pages[0].text.slice(0, 60));
  console.log('  Page 2 sample:', pages[1].text.slice(0, 60));
  console.log('  Page 3 sample:', pages[2].text.slice(0, 60));

  // 3. Chunk pages
  const chunks = chunkPages(pages);
  console.log(`✓ Created ${chunks.length} page-aware chunks`);
  const page2Chunk = chunks.find((c) => c.pageNumber === 2);
  if (!page2Chunk || !page2Chunk.content.includes('primary endpoint')) {
    throw new Error('Chunking failed to preserve pageNumber 2 with primary endpoint text');
  }

  // 4. Test User & Database persistence
  const testEmail = `test-researcher-${Date.now()}@pharma.org`;
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash: 'dummyhash',
      name: 'Dr. Test Researcher',
    },
  });
  console.log('✓ Created test user:', user.email);

  const document = await prisma.document.create({
    data: {
      userId: user.id,
      originalName: 'Clinical-Study-Report-PH-2024.pdf',
      storedName: 'test-clinical-trial.pdf',
      pageCount: totalPages,
      status: 'READY',
    },
  });
  console.log('✓ Created test document record:', document.id);

  // 5. Insert chunks and embeddings into pgvector
  for (const draft of chunks) {
    const createdChunk = await prisma.documentChunk.create({
      data: {
        documentId: document.id,
        pageNumber: draft.pageNumber,
        chunkIndex: draft.chunkIndex,
        content: draft.content,
      },
    });

    const emb = await generateEmbedding(draft.content);
    await saveChunkEmbedding(createdChunk.id, emb);
  }
  console.log('✓ Saved chunks with pgvector embeddings');

  // 6. Test similarity search with Question: "What was the primary endpoint of the study?"
  const testQuestion = 'What was the primary endpoint of the study?';
  const queryEmb = await generateEmbedding(testQuestion);
  const retrieved = await searchSimilarChunks(user.id, queryEmb, [document.id], 3);
  console.log(`✓ Retrieved ${retrieved.length} relevant chunks via vector similarity`);
  const topResult = retrieved[0];
  console.log(`  Top match: Document "${topResult.documentName}", Page ${topResult.pageNumber}`);
  if (topResult.pageNumber !== 2) {
    console.warn(`Expected top match to be Page 2, got Page ${topResult.pageNumber}`);
  }

  // 7. Test Grounded Answer generation
  const answerResult = await generateGroundedAnswer(testQuestion, retrieved);
  console.log('✓ Generated Grounded Answer:');
  console.log('  Answer:', answerResult.answer);
  console.log('  Citations count:', answerResult.citations.length);
  if (answerResult.citations.length > 0) {
    console.log('  Citation 0:', {
      document: answerResult.citations[0].documentName,
      pageNumber: answerResult.citations[0].pageNumber,
      evidenceSnippet: answerResult.citations[0].evidence.slice(0, 70) + '...',
    });
  } else {
    throw new Error('Expected at least 1 citation for grounded question');
  }

  // 8. Test No Evidence flow
  const noEvidenceQuestion = 'What is the speed of light on Neptune?';
  const noEvidenceRetrieved: any[] = [];
  const noEvidenceResult = await generateGroundedAnswer(noEvidenceQuestion, noEvidenceRetrieved);
  console.log('✓ No Evidence flow test:');
  console.log('  Answer:', noEvidenceResult.answer);
  console.log('  Citations count:', noEvidenceResult.citations.length);
  if (
    !noEvidenceResult.answer.includes("couldn't find enough information") ||
    noEvidenceResult.citations.length !== 0
  ) {
    throw new Error('No Evidence test failed to return proper refusal with 0 citations');
  }

  // 9. Clean up test data
  await prisma.document.delete({ where: { id: document.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('✓ Cleaned up test database records');

  console.log('\n>>> ALL BACKEND PIPELINE TESTS PASSED CLEANLY! <<<');
}

runPipelineTests()
  .catch((err) => {
    console.error('Test pipeline error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
