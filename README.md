# Teachme Learning Assistant

A Chrome extension that helps you learn and understand content using the Feynman Technique. This extension extracts content from web pages, provides simplified explanations, and tests your understanding through verbal responses.

## Features

- **Advanced Content Extraction**: Uses Mozilla's Readability.js algorithm to extract main content from any webpage, filtering out ads, navigation, and other distractions.
- **AI-Powered Explanations**: Integrates with leading AI providers (OpenAI, Google, Anthropic) to generate simplified explanations of complex topics.
- **Feynman Technique Implementation**: Tests your understanding by asking you to explain concepts in your own words.
- **Speech Integration**: Speaks explanations out loud and captures your verbal responses using speech recognition.
- **Learning History**: Tracks your learning sessions for later review.
- **Customizable Settings**: Configure API providers, voice settings, and content parameters.

## Installation

1. Download or clone this repository
2. Create an `images` folder and add icon files (or use the built-in icon generator)
3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

## Usage

1. **Content Extraction**:
   - Navigate to any webpage with content you want to learn
   - Click the Teachme Learning Assistant icon
   - Click "Extract Page Content"

2. **Get Explanations**:
   - After extracting content, click "Explain Content"
   - Listen to the simplified explanation

3. **Practice Understanding**:
   - Respond to questions about the content
   - The extension will capture your responses and provide feedback

4. **Review History**:
   - Click the "History" link in the extension popup
   - Browse and search through your past learning sessions

## Configuration

1. Click the "Settings" link in the extension popup
2. Configure your preferred AI provider and API key
3. Adjust voice settings and content parameters
4. Click "Save Settings" to apply changes

## Development

### File Structure

- `manifest.json`: Extension configuration
- `popup.html`: Main extension UI
- `settings.html`: Settings page
- `history.html`: Learning history page
- `js/`:
  - `popup.js`: Main functionality
  - `content.js`: Web page content extraction
  - `settings.js`: Settings management
  - `history.js`: History management
  - `background.js`: Background processes
  - `Readability.js`: Mozilla's content extraction algorithm
- `css/`: Styling files

### API Integration

The extension supports multiple AI providers:
- OpenAI (GPT-3.5, GPT-4)
- Google AI (Gemini)
- Anthropic (Claude)

To use these APIs, you'll need to:
1. Obtain an API key from your preferred provider
2. Enter the key in the Settings page
3. Select your preferred model

### Simulation Mode

If you don't have an API key, you can use the simulation mode for testing. This mode provides pre-defined responses without making actual API calls.

## License

MIT License

## Acknowledgments

- [Mozilla's Readability.js](https://github.com/mozilla/readability) for content extraction
- The Feynman Technique, developed by physicist Richard Feynman 