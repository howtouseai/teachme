/**
 * Content script for Teachme Learning Assistant
 * This script runs in the context of web pages and extracts readable content
 */

// Main function to extract readable content from the current webpage
function extractPageContent() {
  let mainContent = '';
  let title = document.title;
  let description = '';
  
  // Try to get meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    description = metaDescription.getAttribute('content');
  }
  
  // First, try using Readability.js for best content extraction
  try {
    // Create a new Readability object
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone, {
      debug: false,
      charThreshold: 500,
      stripUnlikelyCandidates: true,
      cleanConditionally: true
    });
    
    // Parse the content
    const article = reader.parse();
    
    if (article && article.content && article.textContent.length > 200) {
      console.log("Teachme: Using Readability.js parser");
      mainContent = article.textContent;
      
      // If Readability found a good title, use it
      if (article.title && article.title.length > 0) {
        title = article.title;
      }
      
      // If Readability found a byline, add it to the description
      if (article.byline && article.byline.length > 0) {
        description = `By ${article.byline}. ${description}`;
      }
      
      return {
        title: title,
        description: description,
        url: window.location.href,
        content: mainContent,
        wordCount: countWords(mainContent),
        dateExtracted: new Date().toISOString()
      };
    }
  } catch (e) {
    console.log("Teachme: Readability.js extraction failed, falling back to basic extraction", e);
  }
  
  // If Readability failed or returned poor content, fall back to standard extraction
  console.log("Teachme: Using fallback content extraction");
  
  // Special case for Wikipedia
  if (window.location.hostname.includes('wikipedia.org')) {
    const wikiContent = document.getElementById('mw-content-text');
    if (wikiContent) {
      // Get only the paragraphs from Wikipedia, avoiding tables, etc.
      const paragraphs = wikiContent.querySelectorAll('p');
      mainContent = Array.from(paragraphs).map(p => p.textContent).join('\n\n');
    }
  }
  
  // If not Wikipedia or content not found, try common content selectors
  if (!mainContent || mainContent.length < 200) {
    // Common main content selectors (ordered by priority)
    const contentSelectors = [
      'article', 
      '[role="main"]', 
      'main', 
      '.main-content', 
      '#main-content',
      '.post-content',
      '.entry-content',
      '.article__content',
      '.story-body',
      '.story-content'
    ];
    
    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Use the first content element found
        mainContent = elements[0].innerText;
        break;
      }
    }
  }
  
  // If still no content found, try getting all paragraphs from the body
  if (!mainContent || mainContent.length < 200) {
    const paragraphs = document.querySelectorAll('p');
    if (paragraphs.length > 0) {
      // Get paragraphs with reasonable length (avoid menu items, etc.)
      const contentParagraphs = Array.from(paragraphs)
        .filter(p => p.textContent.length > 40)
        .map(p => p.textContent);
      
      mainContent = contentParagraphs.join('\n\n');
    }
  }
  
  // Fallback: get content from the body, but try to exclude navigation, footer, etc.
  if (!mainContent || mainContent.length < 200) {
    const bodyContent = document.body.cloneNode(true);
    
    // Remove common non-content elements
    const elementsToRemove = bodyContent.querySelectorAll(
      'nav, header, footer, aside, .nav, .navigation, .header, .footer, .sidebar, ' +
      '.menu, .ad, .advertisement, script, style, [role="navigation"], [role="banner"], ' +
      '[role="contentinfo"], iframe, button, input, form'
    );
    
    elementsToRemove.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    mainContent = bodyContent.innerText;
  }
  
  // Clean up the text
  const cleanedContent = cleanText(mainContent);
  
  return {
    title: title,
    description: description,
    url: window.location.href,
    content: cleanedContent,
    wordCount: countWords(cleanedContent),
    dateExtracted: new Date().toISOString()
  };
}

// Helper function to clean extracted text
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')        // Replace multiple spaces with a single space
    .replace(/\n+/g, '\n')       // Replace multiple newlines with a single newline
    .replace(/\t/g, ' ')         // Replace tabs with spaces
    .replace(/\r/g, '')          // Remove carriage returns
    .replace(/\u00A0/g, ' ')     // Replace non-breaking spaces with regular spaces
    .trim();                     // Remove leading/trailing whitespace
}

// Helper function to count words
function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    const extractedData = extractPageContent();
    sendResponse(extractedData);
  }
  return true; // Keep the message channel open for async response
});

// Log when content script is loaded (for debugging)
console.log('Teachme Learning Assistant: Content script loaded');