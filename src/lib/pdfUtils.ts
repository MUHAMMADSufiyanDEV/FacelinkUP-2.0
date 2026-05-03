import * as pdfjs from 'pdfjs-dist';

// Set up the worker for pdfjs - using a version that matches the package
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n';
  }

  return fullText;
};

export const generateResumePDF = async (resumeHtml: string, fileName: string = 'resume.pdf'): Promise<void> => {
  try {
    console.log('Starting PDF generation...');
    // Dynamically import PDF generation libraries
    console.log('Importing jspdf...');
    const jsPDF = (await import('jspdf')).default;
    console.log('Importing html2canvas...');
    const html2canvas = (await import('html2canvas')).default;
    console.log('Libraries imported successfully');

    // Create a temporary container for the HTML
    const container = document.createElement('div');
    container.innerHTML = resumeHtml;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '210mm'; // A4 width
    container.style.minHeight = '297mm'; // A4 height
    container.style.backgroundColor = 'white';
    container.style.padding = '20mm';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    document.body.appendChild(container);
    console.log('Container created and added to DOM');

    try {
      console.log('Converting HTML to canvas...');
      // Convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
      });
      console.log('Canvas created:', canvas.width, 'x', canvas.height);

      // Create PDF
      console.log('Creating PDF...');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Calculate dimensions to fit A4
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      console.log('Adding image to PDF...');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      console.log('Saving PDF...');
      pdf.save(fileName);
      console.log('PDF saved successfully!');
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('PDF generation libraries not available. Please install jspdf and html2canvas packages.');
  }
};
