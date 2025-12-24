import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechManager } from './services/speech';
import { generateSuggestions, isMockMode } from './services/llm';
import { TranscriptionStream, type Message } from './components/TranscriptionStream';
import { ResponseGrid } from './components/ResponseGrid';
import { ControlBar } from './components/ControlBar';
import { FavoritePhrases } from './components/FavoritePhrases';
import { CategoryFilter } from './components/CategoryFilter';
import { PhraseHistory } from './components/PhraseHistory';
import { CustomPhrasesPanel } from './components/CustomPhrasesPanel';

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
  
  // Font Size State ('small' | 'medium' | 'large')
  const [fontSizePreset, setFontSizePreset] = useState<'small' | 'medium' | 'large'>('medium');
  
  // Map preset to actual rem value
  const fontSizeMap = { small: 0.875, medium: 1, large: 1.5 };
  const fontSize = fontSizeMap[fontSizePreset];

  // Favorites, Custom Phrases, History, and Category state
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('speakeasy_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [customPhrases, setCustomPhrases] = useState<string[]>(() => {
    const saved = localStorage.getItem('speakeasy_custom_phrases');
    return saved ? JSON.parse(saved) : [];
  });
  const [phraseHistory, setPhraseHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('speakeasy_phrase_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'auto' | 'food' | 'comfort' | 'general' | 'yes-no' | 'help'>('auto');

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
        const { suggestions: newSuggestions, correctedText } = await generateSuggestions(history, text);

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

        // Auto-detect category when in auto mode
        if (activeCategory === 'auto' && correctedText) {
          const detectedCategory = detectContextCategory(correctedText);
          if (detectedCategory !== 'auto') {
            setActiveCategory(detectedCategory);
          }
        }

        if (newSuggestions.length > 0) {
          const structuredSuggestions = newSuggestions.map(s => ({ text: s, variant: 'default' as const }));
          setSuggestions(structuredSuggestions);
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

  const setFontSize = (preset: 'small' | 'medium' | 'large') => {
    setFontSizePreset(preset);
  };

  const addToFavorites = (phrase: string) => {
    const updated = [...new Set([...favorites, phrase])];
    setFavorites(updated);
    localStorage.setItem('speakeasy_favorites', JSON.stringify(updated));
  };

  const removeFromFavorites = (phrase: string) => {
    const updated = favorites.filter(f => f !== phrase);
    setFavorites(updated);
    localStorage.setItem('speakeasy_favorites', JSON.stringify(updated));
  };

  const addCustomPhrase = (phrase: string) => {
    const updated = [...new Set([...customPhrases, phrase])];
    setCustomPhrases(updated);
    localStorage.setItem('speakeasy_custom_phrases', JSON.stringify(updated));
  };

  const removeCustomPhrase = (phrase: string) => {
    const updated = customPhrases.filter(p => p !== phrase);
    setCustomPhrases(updated);
    localStorage.setItem('speakeasy_custom_phrases', JSON.stringify(updated));
  };

  const addToHistory = (phrase: string) => {
    const updated = [phrase, ...phraseHistory.filter(p => p !== phrase)].slice(0, 20);
    setPhraseHistory(updated);
    localStorage.setItem('speakeasy_phrase_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setPhraseHistory([]);
    localStorage.removeItem('speakeasy_phrase_history');
  };

  // Detect context from user's sentence
  const detectContextCategory = (text: string): 'food' | 'comfort' | 'general' | 'yes-no' | 'help' | 'auto' => {
    const lower = text.toLowerCase();
    
    // Food keywords
    const foodKeywords = ['food', 'eat', 'hungry', 'thirsty', 'drink', 'salad', 'pizza', 'burger', 'want', 'like', 'taste', 'meal', 'dinner', 'lunch', 'breakfast'];
    if (foodKeywords.some(kw => lower.includes(kw))) return 'food';
    
    // Comfort keywords (pain, temperature, mood)
    const comfortKeywords = ['hurt', 'pain', 'cold', 'hot', 'tired', 'sleep', 'comfortable', 'scared', 'sad', 'happy', 'mood', 'feel', 'fever', 'ache'];
    if (comfortKeywords.some(kw => lower.includes(kw))) return 'comfort';
    
    // Help keywords
    const helpKeywords = ['help', 'emergency', 'call', 'doctor', 'hospital', 'urgent', '911', 'need', 'sick', 'problem'];
    if (helpKeywords.some(kw => lower.includes(kw))) return 'help';
    
    // Yes/no questions are already handled in llm.ts
    if (/^(is|are|am|was|were|do|does|did|have|has|had|can|could|will|would|should|may|might|must)\s/i.test(lower)) {
      return 'yes-no';
    }
    
    return 'auto';
  };

  // Category-specific suggestion sets
  const getCategorySuggestions = () => {
    const categorySets: Record<string, Array<{ text: string, variant: 'default' | 'uncertainty' }>> = {
      'auto': suggestions, // Use AI-generated suggestions
      'yes-no': [
        { text: 'Yes', variant: 'default' },
        { text: 'No', variant: 'default' },
        { text: 'Maybe', variant: 'uncertainty' },
        { text: "I am not sure", variant: 'uncertainty' },
      ],
      'food': [
        { text: 'Pizza', variant: 'default' },
        { text: 'Tacos', variant: 'default' },
        { text: 'Salad', variant: 'default' },
        { text: 'Sandwich', variant: 'default' },
        { text: 'Pasta', variant: 'default' },
        { text: 'Burger', variant: 'default' },
        { text: 'Water', variant: 'default' },
        { text: "Not hungry", variant: 'uncertainty' },
      ],
      'comfort': [
        { text: "I am cold", variant: 'default' },
        { text: "I am hot", variant: 'default' },
        { text: "I am tired", variant: 'default' },
        { text: 'I need a break', variant: 'default' },
        { text: 'Can you help?', variant: 'default' },
        { text: 'That hurts', variant: 'default' },
        { text: 'More please', variant: 'default' },
        { text: "I am okay", variant: 'uncertainty' },
      ],
      'general': [
        { text: 'Yes', variant: 'default' },
        { text: 'No', variant: 'default' },
        { text: 'Thank you', variant: 'default' },
        { text: 'Please', variant: 'default' },
        { text: 'Hello', variant: 'default' },
        { text: 'Goodbye', variant: 'default' },
        { text: 'Sorry', variant: 'default' },
        { text: "I do not know", variant: 'uncertainty' },
      ],
      'help': [
        { text: 'I need help', variant: 'default' },
        { text: 'Emergency', variant: 'default' },
        { text: 'Call doctor', variant: 'default' },
        { text: 'Call 911', variant: 'default' },
        { text: 'Something is wrong', variant: 'default' },
        { text: 'Get someone', variant: 'default' },
        { text: 'Hurry!', variant: 'default' },
        { text: 'Please wait', variant: 'uncertainty' },
      ],
    };

    return categorySets[activeCategory] || categorySets['general'];
  };

  // Filter suggestions based on active category
  const getFilteredSuggestions = () => {
    return getCategorySuggestions();
  };

  const handleTileClick = (text: string) => {
    // 1. Speak it with selected gender
    speechManagerRef.current?.speak(text, voiceGender);
    // 2. Add to chat as 'assistant' (Me)
    const newMsg: Message = { role: 'assistant', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMsg]);
    // 3. Add to phrase history
    addToHistory(text);
  };

  const clearTranscript = () => {
    setMessages([]);
    setInterim('');
    setErrorMsg(null);
  };

  const resetApp = () => {
    // Clear all state
    setMessages([]);
    setInterim('');
    setSuggestions([
      { text: "Yes", variant: 'default' },
      { text: "No", variant: 'default' },
      { text: "Thank you", variant: 'default' },
      { text: "Please", variant: 'default' },
      { text: "I need help", variant: 'default' },
      { text: "Wait", variant: 'default' },
      { text: "I don't know", variant: 'uncertainty' }
    ]);
    setErrorMsg(null);
    setFontSizePreset('medium');
    setActiveCategory('auto');
    setShowCustomPanel(false);
    setVoiceGender('female');
    
    // Clear all localStorage
    localStorage.removeItem('speakeasy_favorites');
    localStorage.removeItem('speakeasy_custom_phrases');
    localStorage.removeItem('speakeasy_phrase_history');
    localStorage.removeItem('speakeasy_font_size');
    
    // Update state
    setFavorites([]);
    setCustomPhrases([]);
    setPhraseHistory([]);
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

      <main className="flex-1 flex gap-4 max-w-7xl mx-auto w-full h-[calc(100vh-140px)] overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {errorMsg && (
            <div className="bg-red-100 text-red-700 p-4 rounded-xl border border-red-200">
              Error: {errorMsg}
            </div>
          )}

          <TranscriptionStream messages={messages} interimTranscript={interim} fontSize={fontSize} />

          <FavoritePhrases 
            favorites={favorites} 
            onSelect={handleTileClick}
            onRemoveFavorite={removeFromFavorites}
          />

          <CategoryFilter activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

          <div className="flex-none">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Suggested Responses</h2>
              <button
                onClick={() => setShowCustomPanel(true)}
                className="text-xs px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors font-semibold"
                title="Manage custom phrases"
              >
                + Custom
              </button>
            </div>
            <ResponseGrid
              suggestions={getFilteredSuggestions()}
              onSelect={handleTileClick}
              isLoading={isLoading}
              onAddFavorite={addToFavorites}
              isFavorite={(text) => favorites.includes(text)}
            />
          </div>

          <ControlBar
            isListening={isListening}
            onToggleListening={toggleListening}
            onClear={clearTranscript}
            onReset={resetApp}
            fontSizePreset={fontSizePreset}
            onSetFontSize={setFontSize}
          />
        </div>

        <PhraseHistory 
          history={phraseHistory}
          onSelect={handleTileClick}
          onClear={clearHistory}
        />

        <CustomPhrasesPanel
          isOpen={showCustomPanel}
          customPhrases={customPhrases}
          onClose={() => setShowCustomPanel(false)}
          onAdd={addCustomPhrase}
          onRemove={removeCustomPhrase}
        />
      </main>
    </div>
  );
}

export default App;
