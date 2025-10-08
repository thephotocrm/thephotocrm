import pdf from 'html-pdf-node';

export async function generateContractPDF(htmlContent: string): Promise<Buffer> {
  const options = {
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  };

  const file = { content: htmlContent };
  
  try {
    const pdfBuffer = await pdf.generatePdf(file, options);
    return pdfBuffer;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error('Failed to generate PDF');
  }
}

export function bufferToDataURL(buffer: Buffer): string {
  return `data:application/pdf;base64,${buffer.toString('base64')}`;
}
