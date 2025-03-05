/**
 * Simplified PDF text extraction helper
 * Uses the bundled PDF.js library to extract text from PDF files
 */

// Load PDF.js from local file
function loadPdfJS() {
  return new Promise((resolve, reject) => {
    // Check if PDF.js is already loaded
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    
    // If pdfjsLib is not available yet, try after a short delay
    setTimeout(() => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('Failed to load PDF.js library'));
      }
    }, 100);
  });
}

/**
 * Extract text content from a PDF file
 * @param {File} file - The PDF file to extract text from
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<string>} - The extracted text
 */
async function extractTextFromPDF(file, progressCallback = null) {
  try {
    // Load PDF.js
    const pdfjsLib = await loadPdfJS();
    
    // Read the file as ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(file);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Get the total number of pages
    const numPages = pdf.numPages;
    let extractedText = '';
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
      // Update progress
      if (progressCallback) {
        progressCallback(Math.floor((i / numPages) * 100));
      }
      
      // Get the page
      const page = await pdf.getPage(i);
      
      // Extract text content
      const textContent = await page.getTextContent();
      
      // Concatenate the text items
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      // Add page number and text to the result
      extractedText += `Page ${i}:\n${pageText}\n\n`;
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * Read a file as ArrayBuffer
 * @param {File} file - The file to read
 * @returns {Promise<ArrayBuffer>} - The file contents as ArrayBuffer
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read a text file as string
 * @param {File} file - The file to read
 * @returns {Promise<string>} - The file contents as string
 */
function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Extract text from a document file
 * @param {File} file - The document file to extract text from
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} - The extracted content information
 */
async function extractDocumentContent(file, progressCallback = null) {
  try {
    let content = '';
    const fileType = file.name.split('.').pop().toLowerCase();
    
    // Update progress to show we've started
    if (progressCallback) {
      progressCallback(10);
    }
    
    // Handle different file types
    switch (fileType) {
      case 'pdf':
        content = await extractTextFromPDF(file, progressCallback);
        break;
      
      case 'txt':
        content = await readTextFile(file);
        if (progressCallback) {
          progressCallback(100);
        }
        break;
      
      case 'doc':
      case 'docx':
        // For doc/docx files, we would need a more complex solution
        // This is a placeholder for future implementation
        content = `This is a placeholder for ${fileType.toUpperCase()} text extraction.\n`;
        content += `File: ${file.name}\nSize: ${Math.round(file.size / 1024)} KB\n\n`;
        content += "For .doc and .docx files, consider using a backend service for extraction.";
        if (progressCallback) {
          progressCallback(100);
        }
        break;
      
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    // Return the extracted content info
    return {
      title: file.name,
      description: `Extracted from ${file.name} (${Math.round(file.size / 1024)} KB)`,
      url: 'file://' + file.name,
      content: content,
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
      dateExtracted: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting document content:', error);
    throw error;
  }
} 