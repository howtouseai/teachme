/**
 * Popup script for Teachme Learning Assistant
 * Handles UI interactions and text-to-speech functionality
 */

// DOM elements
const extractBtn = document.getElementById('extractBtn');
const explainBtn = document.getElementById('explainBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('status');
const progressBar = document.getElementById('progress');
const extractedContentDiv = document.getElementById('extractedContent');
const transcriptDiv = document.getElementById('transcript');

// State variables
let extractedData = null;
let currentExplanation = null;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let recognition = null;
let isListening = false;
let currentQuestionIndex = -1;
let userResponses = [];

// Initialize speech recognition if supported
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onstart = function() {
    isListening = true;
    updateStatus('Listening for your response...');
    updateProgressBar(100);
  };
  
  recognition.onresult = function(event) {
    if (event.results.length > 0) {
      const transcript = event.results[0][0].transcript;
      handleUserResponse(transcript);
    }
  };
  
  recognition.onerror = function(event) {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    handleError('Speech recognition error: ' + event.error);
  };
  
  recognition.onend = function() {
    isListening = false;
    updateStatus('Finished listening');
  };
}

// Event listeners
document.addEventListener('DOMContentLoaded', initPopup);
extractBtn.addEventListener('click', handleExtractContent);
explainBtn.addEventListener('click', handleExplainContent);
stopBtn.addEventListener('click', handleStopAudio);

// Initialize the popup with event listeners
function initPopup() {
  extractBtn.addEventListener('click', handleExtractContent);
  explainBtn.addEventListener('click', handleExplainContent);
  stopBtn.addEventListener('click', handleStopAudio);
  
  // File upload handling
  const fileUpload = document.getElementById('fileUpload');
  const fileName = document.getElementById('fileName');
  
  fileUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Display the selected file name
    fileName.textContent = file.name;
    
    // Disable extract button during processing
    extractBtn.disabled = true;
    updateStatus('Processing file...');
    updateProgressBar(0);
    
    try {
      // Extract content from the document
      const extractionResult = await extractDocumentContent(file, (percent) => {
        updateProgressBar(percent);
      });
      
      // Set the global extractedData variable
      extractedData = extractionResult;
      
      // Show the extracted content
      extractedData.content = cleanText(extractedData.content);
      showExtractedContent(extractedData);
      
      // Enable the explain button
      explainBtn.disabled = false;
      updateStatus('File processed successfully. Ready to explain.');
      updateProgressBar(100);
    } catch (error) {
      handleError(`Failed to process file: ${error.message}`);
      updateProgressBar(0);
    } finally {
      extractBtn.disabled = false;
    }
  });
  
  // Load settings
  chrome.storage.local.get('settings', function(data) {
    settings = data.settings || defaultSettings;
  });
}

// Helper function to clean extracted text
function cleanText(text) {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
    .replace(/\n+/g, '\n')     // Replace multiple newlines with a single newline
    .replace(/\t/g, ' ')       // Replace tabs with spaces
    .replace(/\r/g, '')        // Remove carriage returns
    .trim();                   // Remove leading/trailing whitespace
}

// Handle extract content button click
function handleExtractContent() {
  updateStatus('Extracting content...');
  updateProgressBar(20);
  
  // Get the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeTab = tabs[0];
    
    // Send message to content script
    chrome.tabs.sendMessage(activeTab.id, { action: 'extractContent' }, response => {
      if (chrome.runtime.lastError) {
        handleError('Error communicating with page: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (!response) {
        handleError('No response from page. Make sure you are on a webpage.');
        return;
      }
      
      // Store the extracted data
      extractedData = response;
      
      // Update UI
      updateStatus(`Extracted ${response.wordCount} words from page`);
      updateProgressBar(40);
      showExtractedContent(response);
      
      // Enable explain button
      explainBtn.disabled = false;
    });
  });
}

// Handle explain content button click
function handleExplainContent() {
  if (!extractedData) {
    handleError('No content extracted. Please extract content first.');
    return;
  }
  
  updateStatus('Processing content for explanation...');
  updateProgressBar(60);
  
  // Reset state variables
  currentQuestionIndex = -1;
  userResponses = [];
  
  // Send content to background script for processing
  chrome.runtime.sendMessage(
    { 
      action: 'processContent', 
      content: extractedData.content 
    }, 
    response => {
      if (chrome.runtime.lastError) {
        handleError('Error processing content: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (!response || !response.success) {
        handleError('Failed to process content: ' + (response ? response.error : 'Unknown error'));
        return;
      }
      
      // Store the explanation
      currentExplanation = response.response;
      
      // Update UI
      updateStatus('Explanation ready');
      updateProgressBar(80);
      showExplanation(currentExplanation);
      
      // Speak the explanation
      speakText(currentExplanation.explanation);
      
      // Enable stop button
      stopBtn.disabled = false;
    }
  );
}

// Handle stop audio button click
function handleStopAudio() {
  if (speechSynthesis && currentUtterance) {
    speechSynthesis.cancel();
    updateStatus('Audio stopped');
    stopBtn.disabled = true;
  }
  
  // Stop speech recognition if active
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
  }
}

// Text-to-speech function
function speakText(text) {
  if (!speechSynthesis) {
    handleError('Text-to-speech not supported in this browser');
    return;
  }
  
  // Cancel any ongoing speech
  speechSynthesis.cancel();
  
  // Create a new utterance
  currentUtterance = new SpeechSynthesisUtterance(text);
  
  // Get settings from storage
  chrome.storage.local.get('settings', data => {
    const settings = data.settings || { voiceRate: 1.0, voicePitch: 1.0 };
    
    // Apply settings
    currentUtterance.rate = settings.voiceRate;
    currentUtterance.pitch = settings.voicePitch;
    
    // Set events
    currentUtterance.onstart = () => {
      updateStatus('Speaking explanation...');
      updateProgressBar(100);
    };
    
    currentUtterance.onend = () => {
      updateStatus('Explanation complete');
      stopBtn.disabled = true;
      
      // Here you would implement the follow-up questions
      // For now, we'll just display them
      setTimeout(() => {
        askNextQuestion();
      }, 1000);
    };
    
    currentUtterance.onerror = (event) => {
      handleError('Speech error: ' + event.error);
    };
    
    // Start speaking
    speechSynthesis.speak(currentUtterance);
  });
}

// Ask the next follow-up question
function askNextQuestion() {
  if (!currentExplanation || !currentExplanation.followUpQuestions || 
      currentExplanation.followUpQuestions.length === 0) {
    finishSession();
    return;
  }
  
  currentQuestionIndex++;
  
  if (currentQuestionIndex >= currentExplanation.followUpQuestions.length) {
    finishSession();
    return;
  }
  
  const question = currentExplanation.followUpQuestions[currentQuestionIndex];
  const questionText = `Question ${currentQuestionIndex + 1}: ${question}`;
  
  // Highlight the current question in the UI
  updateQuestionHighlight();
  
  // Speak the question
  const utterance = new SpeechSynthesisUtterance(questionText);
  
  // Get settings from storage
  chrome.storage.local.get('settings', data => {
    const settings = data.settings || { voiceRate: 1.0, voicePitch: 1.0 };
    
    // Apply settings
    utterance.rate = settings.voiceRate;
    utterance.pitch = settings.voicePitch;
    
    utterance.onend = () => {
      // Start listening for response after question is spoken
      if (recognition) {
        setTimeout(() => {
          recognition.start();
        }, 500);
      }
    };
    
    // Start speaking
    speechSynthesis.speak(utterance);
  });
}

// Handle user's spoken response
function handleUserResponse(transcript) {
  if (currentQuestionIndex < 0 || 
      !currentExplanation || 
      !currentExplanation.followUpQuestions || 
      currentQuestionIndex >= currentExplanation.followUpQuestions.length) {
    return;
  }
  
  // Store the response
  userResponses[currentQuestionIndex] = transcript;
  
  // Update the UI to show the response
  updateTranscriptWithResponse(transcript);
  
  // Wait a moment before asking the next question
  setTimeout(() => {
    askNextQuestion();
  }, 1500);
}

// Update transcript to show user's response
function updateTranscriptWithResponse(response) {
  const responseElement = document.createElement('div');
  responseElement.className = 'user-response';
  responseElement.innerHTML = `
    <p><strong>Your response:</strong></p>
    <p>${response}</p>
  `;
  
  // Add to transcript
  const questionElements = transcriptDiv.querySelectorAll('.question-item');
  if (questionElements.length > currentQuestionIndex) {
    // Insert response after the current question
    questionElements[currentQuestionIndex].appendChild(responseElement);
  } else {
    // Fallback: add to the end of transcript
    transcriptDiv.appendChild(responseElement);
  }
}

// Update the UI to highlight current question
function updateQuestionHighlight() {
  const questionItems = transcriptDiv.querySelectorAll('.question-item');
  
  // Remove highlighting from all questions
  questionItems.forEach(item => {
    item.classList.remove('current-question');
  });
  
  // Add highlighting to current question
  if (questionItems.length > currentQuestionIndex && currentQuestionIndex >= 0) {
    questionItems[currentQuestionIndex].classList.add('current-question');
  }
}

// Finish the question and answer session
function finishSession() {
  updateStatus('Session complete!');
  
  // Add a summary to the transcript
  const summaryElement = document.createElement('div');
  summaryElement.className = 'session-summary';
  summaryElement.innerHTML = `
    <p><strong>Session Summary:</strong></p>
    <p>You've completed the Teachme Technique exercise. Explaining concepts in your own words
    helps solidify your understanding. Great job!</p>
  `;
  
  transcriptDiv.appendChild(summaryElement);
  
  // Save session to history
  saveSessionToHistory();
  
  // Speak the completion message
  const completionText = "You've completed all the questions. Great job using the Teachme Technique!";
  speechSynthesis.speak(new SpeechSynthesisUtterance(completionText));
}

// Save the current learning session to history
function saveSessionToHistory() {
  if (!extractedData || !currentExplanation) return;
  
  const sessionData = {
    title: extractedData.title || 'Untitled Session',
    url: extractedData.url,
    content: extractedData.content.substring(0, 500) + (extractedData.content.length > 500 ? '...' : ''),
    explanation: currentExplanation,
    questions: (currentExplanation.questions || []).map(q => q.text),
    responses: userResponses,
    date: new Date().toISOString()
  };
  
  chrome.storage.local.get('learningHistory', (data) => {
    const history = data.learningHistory || [];
    history.push(sessionData);
    
    // Keep only the last 50 sessions to avoid excessive storage use
    if (history.length > 50) {
      history.shift(); // Remove the oldest session
    }
    
    chrome.storage.local.set({ 'learningHistory': history }, () => {
      console.log('Learning session saved to history');
    });
  });
}

// Speak follow-up questions
function speakFollowUpQuestions(questions) {
  if (!questions || !questions.length) return;
  
  updateStatus('Asking follow-up questions...');
  
  // Join questions with pauses between them
  const questionsText = "Now, to check your understanding: " + questions.join(". . . Next question: ");
  
  // Create a new utterance for questions
  const utterance = new SpeechSynthesisUtterance(questionsText);
  
  // Get settings from storage
  chrome.storage.local.get('settings', data => {
    const settings = data.settings || { voiceRate: 1.0, voicePitch: 1.0 };
    
    // Apply settings
    utterance.rate = settings.voiceRate;
    utterance.pitch = settings.voicePitch;
    
    // Start speaking
    speechSynthesis.speak(utterance);
  });
}

// Show extracted content in UI
function showExtractedContent(data) {
  const displayContent = data.content.length > 500 
    ? data.content.substring(0, 500) + '...' 
    : data.content;
    
  extractedContentDiv.textContent = displayContent;
}

// Show explanation in UI
function showExplanation(explanation) {
  transcriptDiv.innerHTML = `
    <div class="explanation">
      <p><strong>Explanation:</strong></p>
      <p>${explanation.explanation}</p>
    </div>
    <div class="questions">
      <p><strong>Follow-up Questions:</strong></p>
      <ul>
        ${explanation.followUpQuestions.map((q, index) => 
          `<li class="question-item" data-index="${index}">
            ${q}
           </li>`).join('')}
      </ul>
    </div>
  `;
}

// Update status text
function updateStatus(message) {
  statusText.textContent = message;
}

// Update progress bar
function updateProgressBar(percent) {
  progressBar.style.width = `${percent}%`;
}

// Handle errors
function handleError(message) {
  console.error(message);
  updateStatus('Error: ' + message);
  updateProgressBar(0);
} 