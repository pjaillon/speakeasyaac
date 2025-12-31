import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SpeechManager } from './services/speech';
import { generateSuggestions, isMockMode } from './services/llm';
import { TranscriptionStream, type Message } from './components/TranscriptionStream';
import { ResponseGrid } from './components/ResponseGrid';
import { ControlBar } from './components/ControlBar';
import { FavoritePhrases } from './components/FavoritePhrases';
import { CategoryFilter } from './components/CategoryFilter';
import { PhraseHistory } from './components/PhraseHistory';
import { CustomPhrasesPanel } from './components/CustomPhrasesPanel';

type SuggestionVariant = 'default' | 'uncertainty';
type Suggestion = { text: string; variant: SuggestionVariant };
type VoiceGender = 'female' | 'male';
type FontSizePreset = 'small' | 'medium' | 'large';
type Category = 'auto' | 'food' | 'comfort' | 'general' | 'yes-no' | 'help' | 'numbers';

const STORAGE_KEYS = {
  favorites: 'speakeasy_favorites',
  customPhrases: 'speakeasy_custom_phrases',
  phraseHistory: 'speakeasy_phrase_history',
  fontSize: 'speakeasy_font_size'
} as const;

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { text: 'Yes', variant: 'default' },
  { text: 'No', variant: 'default' },
  { text: 'Thank you', variant: 'default' },
  { text: 'Please', variant: 'default' },
  { text: 'I need help', variant: 'default' },
  { text: 'Wait', variant: 'default' },
  { text: "I don't know", variant: 'uncertainty' }
];

const CATEGORY_SUGGESTIONS: Record<Exclude<Category, 'auto' | 'numbers'>, Suggestion[]> = {
  'yes-no': [
    { text: 'Yes', variant: 'default' },
    { text: 'No', variant: 'default' },
    { text: 'Maybe', variant: 'uncertainty' },
    { text: 'I am not sure', variant: 'uncertainty' },
  ],
  food: [
    { text: 'Pizza', variant: 'default' },
    { text: 'Tacos', variant: 'default' },
    { text: 'Salad', variant: 'default' },
    { text: 'Sandwich', variant: 'default' },
    { text: 'Pasta', variant: 'default' },
    { text: 'Burger', variant: 'default' },
    { text: 'Water', variant: 'default' },
    { text: 'Not hungry', variant: 'uncertainty' },
  ],
  comfort: [
    { text: 'I am cold', variant: 'default' },
    { text: 'I am hot', variant: 'default' },
    { text: 'I am tired', variant: 'default' },
    { text: 'I need a break', variant: 'default' },
    { text: 'Can you help?', variant: 'default' },
    { text: 'That hurts', variant: 'default' },
    { text: 'More please', variant: 'default' },
    { text: 'I am okay', variant: 'uncertainty' },
  ],
  general: [
    { text: 'Yes', variant: 'default' },
    { text: 'No', variant: 'default' },
    { text: 'Thank you', variant: 'default' },
    { text: 'Please', variant: 'default' },
    { text: 'Hello', variant: 'default' },
    { text: 'Goodbye', variant: 'default' },
    { text: 'Sorry', variant: 'default' },
    { text: 'I do not know', variant: 'uncertainty' },
  ],
  help: [
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

const NUMBER_SUGGESTIONS: Suggestion[] = [
  { text: '1', variant: 'default' },
  { text: '2', variant: 'default' },
  { text: '3', variant: 'default' },
  { text: '4', variant: 'default' },
  { text: '5', variant: 'default' },
  { text: '6', variant: 'default' },
  { text: '7', variant: 'default' },
  { text: '8', variant: 'default' },
  { text: '9', variant: 'default' },
  { text: '0', variant: 'default' },
  { text: 'Del', variant: 'uncertainty' },
  { text: 'Enter', variant: 'default' },
];

const FONT_SIZE_MAP: Record<FontSizePreset, number> = {
  small: 0.875,
  medium: 1,
  large: 1.5,
};

const NUMBER_UNITS = [
  {
    keywords: ['mile', 'miles', 'distance', 'far', 'drive', 'walk', 'km', 'kilometer', 'kilometre'],
    units: ['miles', 'km', 'ft'],
  },
  {
    keywords: ['weight', 'weigh', 'heavy', 'light', 'lbs', 'pound', 'kg', 'kilogram'],
    units: ['lbs', 'kg'],
  },
  {
    keywords: ['height', 'tall', 'length', 'long', 'width', 'size', 'inch', 'inches', 'cm', 'centimeter', 'centimetre'],
    units: ['cm', 'in', 'ft'],
  },
  {
    keywords: ['temperature', 'temp', 'degree', 'degrees', 'fahrenheit', 'celsius'],
    units: ['°F', '°C'],
  },
  {
    keywords: ['time', 'minute', 'minutes', 'hour', 'hours', 'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years'],
    units: ['min', 'hours', 'days'],
  },
  {
    keywords: ['price', 'cost', 'dollar', 'dollars', 'cent', 'cents', 'money', 'pay'],
    units: ['$', 'dollars', 'cents'],
  },
  {
    keywords: ['speed', 'mph', 'km/h'],
    units: ['mph', 'km/h'],
  },
  {
    keywords: ['percent', 'percentage', '%'],
    units: ['%'],
  },
  {
    keywords: ['volume', 'drink', 'water', 'milk', 'oz', 'ounce', 'ml', 'liter', 'litre', 'cup', 'cups'],
    units: ['oz', 'ml', 'cups'],
  },
] as const;

const safeLocalStorageGet = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage`, error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write ${key} to localStorage`, error);
  }
};

const readJSONFromStorage = <T,>(key: string, fallback: T): T => {
  const raw = safeLocalStorageGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to parse ${key} from localStorage`, error);
    return fallback;
  }
};

const writeJSONToStorage = (key: string, value: unknown) => {
  safeLocalStorageSet(key, JSON.stringify(value));
};

const getDefaultSuggestions = (): Suggestion[] => DEFAULT_SUGGESTIONS.map(s => ({ ...s }));

const getStoredFontSizePreset = (): FontSizePreset => {
  const stored = safeLocalStorageGet(STORAGE_KEYS.fontSize);
  if (stored === 'small' || stored === 'medium' || stored === 'large') {
    return stored;
  }
  return 'medium';
};

const isNumberRelatedQuestion = (text: string) => {
  const lower = text.toLowerCase();
  const hasNumberSignal = /\d/.test(lower) ||
    /\b(how many|how much|number|amount|quantity|percent|percentage|weight|weigh|distance|far|length|long|tall|height|width|size|speed|temperature|degree|degrees|age|old|time|minute|minutes|hour|hours|day|days|cost|price|dollar|dollars|cent|cents|pay|fee|rate)\b/i.test(lower);
  if (!hasNumberSignal) return false;

  return /\?$/.test(text.trim()) ||
    /\b(how many|how much|what number|which number|what amount|what time|how long|how far|how tall|how old|how big|how heavy|how fast)\b/i.test(lower);
};

const getContextualUnits = (contextText: string) => {
  const lower = contextText.toLowerCase();
  const match = NUMBER_UNITS.find(entry => entry.keywords.some(keyword => lower.includes(keyword)));
  if (match) {
    return match.units;
  }
  return ['cm', 'in', 'lbs', 'kg', '%'];
};


const detectContextCategory = (text: string): Category => {
  const lower = text.toLowerCase();

  if (isNumberRelatedQuestion(text)) return 'numbers';

  const foodKeywords = ['food', 'eat', 'hungry', 'thirsty', 'drink', 'salad', 'pizza', 'burger', 'want', 'like', 'taste', 'meal', 'dinner', 'lunch', 'breakfast'];
  if (foodKeywords.some(kw => lower.includes(kw))) return 'food';

  const comfortKeywords = ['hurt', 'pain', 'cold', 'hot', 'tired', 'sleep', 'comfortable', 'scared', 'sad', 'happy', 'mood', 'feel', 'fever', 'ache'];
  if (comfortKeywords.some(kw => lower.includes(kw))) return 'comfort';

  const helpKeywords = ['help', 'emergency', 'call', 'doctor', 'hospital', 'urgent', '911', 'need', 'sick', 'problem'];
  if (helpKeywords.some(kw => lower.includes(kw))) return 'help';

  if (/^(is|are|am|was|were|do|does|did|have|has|had|can|could|will|would|should|may|might|must)\s/i.test(lower)) {
    return 'yes-no';
  }

  return 'auto';
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [interim, setInterim] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => getDefaultSuggestions());
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice Selection State
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  
  // Font Size State ('small' | 'medium' | 'large')
  const [fontSizePreset, setFontSizePreset] = useState<FontSizePreset>(() => getStoredFontSizePreset());
  const fontSize = FONT_SIZE_MAP[fontSizePreset];

  // Favorites, Custom Phrases, History, and Category state
  const [favorites, setFavorites] = useState<string[]>(() => readJSONFromStorage<string[]>(STORAGE_KEYS.favorites, []));
  const [customPhrases, setCustomPhrases] = useState<string[]>(() => readJSONFromStorage<string[]>(STORAGE_KEYS.customPhrases, []));
  const [phraseHistory, setPhraseHistory] = useState<string[]>(() => readJSONFromStorage<string[]>(STORAGE_KEYS.phraseHistory, []));
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('auto');
  const [numericInput, setNumericInput] = useState('');
  const [numericUnit, setNumericUnit] = useState('');
  const [lastUtterance, setLastUtterance] = useState('');

  const speechManagerRef = useRef<SpeechManager | null>(null);
  const activeCategoryRef = useRef<Category>(activeCategory);
  const autoDetectedCategoryRef = useRef(false);

  useEffect(() => {
    writeJSONToStorage(STORAGE_KEYS.favorites, favorites);
  }, [favorites]);

  useEffect(() => {
    writeJSONToStorage(STORAGE_KEYS.customPhrases, customPhrases);
  }, [customPhrases]);

  useEffect(() => {
    writeJSONToStorage(STORAGE_KEYS.phraseHistory, phraseHistory);
  }, [phraseHistory]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.fontSize, fontSizePreset);
  }, [fontSizePreset]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== 'numbers') {
      setNumericInput('');
      setNumericUnit('');
    }
  }, [activeCategory]);

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

        if (correctedText || text) {
          const normalizedText = correctedText || text;
          setLastUtterance(normalizedText);
          const detectedCategory = detectContextCategory(normalizedText);
          if (activeCategoryRef.current === 'auto') {
            if (detectedCategory !== 'auto') {
              autoDetectedCategoryRef.current = true;
              setActiveCategory(detectedCategory);
            }
          } else if (autoDetectedCategoryRef.current) {
            if (detectedCategory === 'auto') {
              autoDetectedCategoryRef.current = false;
              setActiveCategory('auto');
            } else if (detectedCategory !== activeCategoryRef.current) {
              autoDetectedCategoryRef.current = true;
              setActiveCategory(detectedCategory);
            }
          }
        }

        if (newSuggestions.length > 0) {
          const structuredSuggestions = newSuggestions.map(s => ({ text: s, variant: 'default' as const }));
          setSuggestions(structuredSuggestions);
        }
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Failed to generate suggestions';
        setErrorMsg(message);
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

  const setFontSize = (preset: FontSizePreset) => {
    setFontSizePreset(preset);
  };

  const handleCategoryChange = (category: Category) => {
    autoDetectedCategoryRef.current = false;
    setActiveCategory(category);
  };

  const handleNumberTile = (text: string) => {
    if (/^\d$/.test(text)) {
      setNumericInput(prev => `${prev}${text}`);
      return;
    }

    if (text === 'Del') {
      if (numericInput.length > 0) {
        setNumericInput(prev => prev.slice(0, -1));
      } else {
        setNumericUnit('');
      }
      return;
    }

    if (text === 'Enter') {
      if (numericInput.trim().length === 0) return;
      const spokenValue = numericUnit ? `${numericInput} ${numericUnit}` : numericInput;
      handleTileClick(spokenValue);
      setNumericInput('');
      setNumericUnit('');
    }
  };

  const handleSuggestionSelect = (text: string) => {
    if (activeCategory === 'numbers') {
      handleNumberTile(text);
      return;
    }
    handleTileClick(text);
  };

  const addToFavorites = (phrase: string) => {
    setFavorites(prev => [...new Set([...prev, phrase])]);
  };

  const removeFromFavorites = (phrase: string) => {
    setFavorites(prev => prev.filter(f => f !== phrase));
  };

  const addCustomPhrase = (phrase: string) => {
    setCustomPhrases(prev => [...new Set([...prev, phrase])]);
  };

  const removeCustomPhrase = (phrase: string) => {
    setCustomPhrases(prev => prev.filter(p => p !== phrase));
  };

  const addToHistory = (phrase: string) => {
    setPhraseHistory(prev => [phrase, ...prev.filter(p => p !== phrase)].slice(0, 20));
  };

  const clearHistory = () => {
    setPhraseHistory([]);
  };

  const filteredSuggestions = useMemo(() => {
    if (activeCategory === 'auto') {
      return suggestions;
    }
    if (activeCategory === 'numbers') {
      return NUMBER_SUGGESTIONS;
    }
    return CATEGORY_SUGGESTIONS[activeCategory] ?? CATEGORY_SUGGESTIONS.general;
  }, [activeCategory, suggestions]);

  const unitOptions = useMemo(() => getContextualUnits(lastUtterance), [lastUtterance]);

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
    setSuggestions(getDefaultSuggestions());
    setErrorMsg(null);
    setFontSizePreset('medium');
    setActiveCategory('auto');
    setShowCustomPanel(false);
    setVoiceGender('female');
    autoDetectedCategoryRef.current = false;
    setNumericInput('');
    setNumericUnit('');
    setLastUtterance('');
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

          <CategoryFilter activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

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
            {activeCategory === 'numbers' && (
              <div className="mb-3 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 bg-indigo-50/80 dark:bg-indigo-950/40 px-4 py-3">
                <div className="text-indigo-700 dark:text-indigo-200 font-semibold">
                  Number: {numericInput || '—'}{numericUnit ? ` ${numericUnit}` : ''}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {unitOptions.map(unit => (
                    <button
                      key={unit}
                      onClick={() => setNumericUnit(prev => prev === unit ? '' : unit)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        numericUnit === unit
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ResponseGrid
              suggestions={filteredSuggestions}
              onSelect={handleSuggestionSelect}
              isLoading={isLoading}
              onAddFavorite={activeCategory === 'numbers' ? undefined : addToFavorites}
              isFavorite={activeCategory === 'numbers' ? undefined : (text) => favorites.includes(text)}
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
