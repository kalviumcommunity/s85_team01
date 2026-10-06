import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Creates a valid multi-page pharmaceutical clinical trial report PDF using pdf-lib
 */
export async function generateSamplePharmaPdf(outputPath: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Study Protocol & Inclusion Criteria
  const page1 = pdfDoc.addPage([600, 800]);
  page1.drawText('CLINICAL STUDY REPORT: PROTOCOL PH-2024-01', {
    x: 50,
    y: 730,
    size: 16,
    font: boldFont,
    color: rgb(0.06, 0.22, 0.54),
  });
  page1.drawText('Study Title: Evaluation of Palbociclib in Advanced Breast Cancer', {
    x: 50,
    y: 690,
    size: 12,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  page1.drawText(
    'Inclusion Criteria: Eligible participants were adult female patients aged 18 or older with',
    { x: 50, y: 640, size: 10, font }
  );
  page1.drawText(
    'histologically confirmed estrogen receptor-positive, HER2-negative advanced breast cancer.',
    { x: 50, y: 620, size: 10, font }
  );
  page1.drawText(
    'Patients had not received prior systemic anti-cancer therapy for advanced disease.',
    { x: 50, y: 600, size: 10, font }
  );
  page1.drawText('Page 1 of 3', { x: 500, y: 30, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

  // Page 2: Primary Efficacy Endpoints
  const page2 = pdfDoc.addPage([600, 800]);
  page2.drawText('SECTION 4: EFFICACY ENDPOINTS AND CLINICAL OUTCOMES', {
    x: 50,
    y: 730,
    size: 14,
    font: boldFont,
    color: rgb(0.06, 0.22, 0.54),
  });
  page2.drawText(
    'The primary endpoint of the study was progression-free survival.',
    { x: 50, y: 680, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) }
  );
  page2.drawText(
    'Progression-free survival was defined as the duration from randomization to objective',
    { x: 50, y: 650, size: 10, font }
  );
  page2.drawText(
    'disease progression assessed by investigator review according to RECIST criteria v1.1,',
    { x: 50, y: 630, size: 10, font }
  );
  page2.drawText(
    'or death from any cause. Secondary endpoints included overall response rate and safety.',
    { x: 50, y: 610, size: 10, font }
  );
  page2.drawText(
    'Median progression-free survival was 24.8 months in the active treatment group.',
    { x: 50, y: 580, size: 10, font }
  );
  page2.drawText('Page 2 of 3', { x: 500, y: 30, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

  // Page 3: Safety and Adverse Events
  const page3 = pdfDoc.addPage([600, 800]);
  page3.drawText('SECTION 6: SAFETY AND ADVERSE EVENTS', {
    x: 50,
    y: 730,
    size: 14,
    font: boldFont,
    color: rgb(0.06, 0.22, 0.54),
  });
  page3.drawText(
    'The most frequently reported adverse events of grade 3 or 4 were neutropenia',
    { x: 50, y: 680, size: 10, font }
  );
  page3.drawText(
    'reported in 66.4% of patients in the treatment cohort, and leukopenia in 24.8%.',
    { x: 50, y: 660, size: 10, font }
  );
  page3.drawText(
    'Fatigue was noted in 4.2% of patients. Febrile neutropenia occurred in 1.8%.',
    { x: 50, y: 640, size: 10, font }
  );
  page3.drawText(
    'No treatment-related deaths were documented during the primary evaluation period.',
    { x: 50, y: 620, size: 10, font }
  );
  page3.drawText('Page 3 of 3', { x: 500, y: 30, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
}
