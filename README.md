# SpeakEasy AAC

A modern, AI-powered Augmentative and Alternative Communication (AAC) web application designed to help users communicate effectively through speech recognition and intelligent response suggestions.

## Features

- **Real-time Speech Recognition** - Continuous speech-to-text transcription with interim results
- **AI-Powered Suggestions** - Context-aware response suggestions using OpenAI's GPT API
- **Automatic Punctuation** - Intelligent punctuation detection for questions, exclamations, and statements
- **Text-to-Speech** - Speak suggested responses with selectable voice (male/female)
- **Conversation History** - View full message history with user and assistant messages
- **Responsive Design** - Mobile-friendly UI with dark mode support
- **Mock Mode** - Works without API key using pre-defined suggestions

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Speech Recognition**: Web Speech API
- **Text-to-Speech**: Web Speech Synthesis API
- **AI Backend**: OpenAI GPT-3.5-turbo API
- **Code Quality**: ESLint + TypeScript

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key (optional - app works in mock mode without it)

### Installation

```bash
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

If no API key is provided, the app will run in mock mode using predefined suggestions.

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

## Building

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ControlBar.tsx       # Recording control & voice selection
│   ├── ResponseGrid.tsx      # Suggestion tiles
│   └── TranscriptionStream.tsx # Message display
├── services/
│   ├── llm.ts              # OpenAI API integration & punctuation
│   └── speech.ts           # Speech recognition & synthesis
├── App.tsx                 # Main app logic
└── main.tsx                # Entry point
```

## How It Works

1. **User speaks** - Speech Recognition API captures audio
2. **Transcription** - Audio is converted to text with interim and final results
3. **AI Processing** - Text is sent to GPT-3.5-turbo for context and suggestions
4. **Punctuation** - Automatic punctuation is added based on sentence type
5. **Suggestions** - AI generates 6-8 contextual response options
6. **User selects** - User clicks a suggestion tile to speak it aloud
7. **Message added** - Selected text is added to conversation history

## Features in Detail

### Punctuation Engine
- **Questions**: Detected by question words (what, where, why, etc.) → adds `?`
- **Exclamations**: Detected by emphatic words/phrases → adds `!`
- **Statements**: Default for normal sentences → adds `.`

### Voice Selection
Toggle between male and female voices for text-to-speech output

### Conversation Context
The app maintains full conversation history to provide contextually relevant suggestions

## Browser Compatibility

- Chrome/Edge 25+
- Firefox 25+
- Safari 14.1+
- Requires HTTPS in production (for microphone access)
