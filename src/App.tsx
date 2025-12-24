import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechManager } from './services/speech';
import { generateSuggestions, isMockMode } from './services/llm';
import { TranscriptionStream, type Message } from './components/TranscriptionStream';
import { ResponseGrid } from './components/ResponseGrid';
import { ControlBar } from './components/ControlBar';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [interim, setInterim] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ text: string, variant: 'default' | 'uncertainty' }>>([
    { text: "Yes", variant: 'default' },
    { text: "No", variant: 'default' },
    { text: "Thank you", variant: 'default' },
    { text: "Please", variant: 'default' },
    { text: "I need help", variant: 'default' },
    { text: "Wait", variant: 'default' },
    { text: "I don't know", variant: 'uncertainty' }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice Selection State
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  
  // Font Size State (in rem units)
  const [fontSize, setFontSize] = useState(1);
  const MIN_FONT_SIZE = 0.75;
  const MAX_FONT_SIZE = 2;
  const FONT_SIZE_STEP = 0.25;

  const speechManagerRef = useRef<SpeechManager | null>(null);

  // Ref to access latest messages in callback without re-binding
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const onSpeechEvent = useCallback(async (text: string, isFinal: boolean) => {
    if (isFinal) {
      if (text.trim().length === 0) return;

      const newUserMsg: Message = { role: 'user', content: text, timestamp: Date.now() };

      setMessages(prev => [...prev, newUserMsg]);
      setInterim('');
      setErrorMsg(null);

      setIsLoading(true);
      try {
        // Construct history
        const history = messagesRef.current.map(m => `${m.role === 'user' ? 'Speaker' : 'Me'}: ${m.content}`).join('\n');

        // Pass previous history and current new sentence separately
        const { suggestions: newSuggestions, uncertaintyResponse, correctedText } = await generateSuggestions(history, text);

        // Update user message with punctuated text if available
        if (correctedText && correctedText !== text) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'user') {
              updated[lastIdx] = { ...updated[lastIdx], content: correctedText };
            }
            return updated;
          });
        }

        if (newSuggestions.length > 0) {
          const structuredSuggestions = newSuggestions.map(s => ({ text: s, variant: 'default' as const }));
          const finalSuggestions = [
            ...structuredSuggestions,
            { text: uncertaintyResponse || "I don't know", variant: 'uncertainty' as const }
          ];
          setSuggestions(finalSuggestions);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Failed to generate suggestions");
      } finally {
        setIsLoading(false);
      }
    } else {
      setInterim(text);
    }
  }, []);

  useEffect(() => {
    speechManagerRef.current = new SpeechManager(onSpeechEvent);
    return () => {
      speechManagerRef.current?.stop();
    };
  }, [onSpeechEvent]);

  const toggleListening = () => {
    if (isListening) {
      speechManagerRef.current?.stop();
      setIsListening(false);
    } else {
      speechManagerRef.current?.start();
      setIsListening(true);
    }
  };

  const toggleVoice = () => {
    setVoiceGender(prev => prev === 'female' ? 'male' : 'female');
  };

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + FONT_SIZE_STEP, MAX_FONT_SIZE));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - FONT_SIZE_STEP, MIN_FONT_SIZE));
  };

  const handleTileClick = (text: string) => {
    // 1. Speak it with selected gender
    speechManagerRef.current?.speak(text, voiceGender);
    // 2. Add to chat as 'assistant' (Me)
    const newMsg: Message = { role: 'assistant', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMsg]);
  };

  const clearTranscript = () => {
    setMessages([]);
    setInterim('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 font-sans p-4 md:p-8 flex flex-col">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
            SpeakEasy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">AI-Powered AAC Assistant</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleVoice}
            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg text-sm font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors flex items-center gap-2"
          >
            <span>Voice:</span>
            <span className="font-bold">{voiceGender === 'female' ? '👩 Female' : '👨 Male'}</span>
          </button>

          {isMockMode() && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-200">
              Mock Mode (No API Key)
            </div>
          )}
        </div>
      </header>
fontSize={fontSize} 
      <main className="flex-1 flex flex-col gap-6 max-w-5xl mx-auto w-full h-[calc(100vh-140px)]">
        {errorMsg && (
          <div className="bg-red-100 text-red-700 p-4 rounded-xl border border-red-200">
            Error: {errorMsg}
          </div>
        )}

        <TranscriptionStream messages={messages} interimTranscript={interim} fontSize={fontSize} />

        <div className="flex-none">
          <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Suggested Responses</h2>
          <ResponseGrid
            suggestions={suggestions}
            onSelect={handleTileClick}
            isLoading={isLoading}
          />
        </div>

        <ControlBar
          isListening={isListening}
          onToggleListening={toggleListening}
          onClear={clearTranscript}
          fontSize={fontSize}
          onIncreaseFontSize={increaseFontSize}
          onDecreaseFontSize={decreaseFontSize}
        />
      </main>
    </div>
  );
}

export default App;
