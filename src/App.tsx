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

const getBinaryOptionsFromText = (text: string) => {
  const sentence = text
    .split(/[?.!]/)
    .map(part => part.trim())
    .filter(Boolean)
    .slice(-1)[0];
  if (!sentence || !/\bor\b/i.test(sentence)) return [] as string[];

  const parts = sentence.split(/\bor\b/i).map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return [] as string[];

  const left = parts[parts.length - 2];
  const right = parts[parts.length - 1];
  const trimPunctuation = (value: string) => value.replace(/^[^\w]+|[^\w]+$/g, '').trim();
  const stopWords = new Set([
    'who', 'what', 'which', 'is', 'are', 'am', 'was', 'were', 'do', 'does', 'did',
    'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must', 'the', 'a', 'an',
    'your', 'my', 'our', 'their', 'his', 'her', 'preferred', 'favorite', 'favourite',
    'child', 'person', 'pet', 'option', 'choice', 'choose', 'pick', 'one'
  ]);

  const scrubOption = (value: string) => {
    const tokens = trimPunctuation(value).split(/\s+/).filter(Boolean);
    while (tokens.length > 1 && stopWords.has(tokens[0].toLowerCase())) {
      tokens.shift();
    }
    return trimPunctuation(tokens.join(' '));
  };

  const leftOption = scrubOption(left);
  const rightOption = scrubOption(right);

  if (!leftOption || !rightOption) return [] as string[];
  return [leftOption, rightOption];
};

const ensureBinarySuggestions = (text: string, suggestions: string[]) => {
  const normalized = (value: string) => value.trim().toLowerCase();
  const existing = new Set(suggestions.map(normalized));
  const next = [...suggestions];

  const options = getBinaryOptionsFromText(text);
  if (options.length === 2) {
    options.forEach(option => {
      if (!existing.has(normalized(option))) {
        next.unshift(option);
        existing.add(normalized(option));
      }
    });
    const neutralOption = "Can't choose";
    if (!existing.has(normalized(neutralOption))) {
      next.push(neutralOption);
      existing.add(normalized(neutralOption));
    }
    return next;
  }

  if (detectContextCategory(text) === 'yes-no') {
    ['Yes', 'No'].reverse().forEach(option => {
      if (!existing.has(normalized(option))) {
        next.unshift(option);
        existing.add(normalized(option));
      }
    });
  }

  return next;
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

        const normalizedText = correctedText || text;
        if (normalizedText) {
          setLastUtterance(normalizedText);
          const detectedCategory = detectContextCategory(normalizedText);
          if (detectedCategory === 'auto') {
            if (autoDetectedCategoryRef.current && activeCategoryRef.current !== 'auto') {
              autoDetectedCategoryRef.current = false;
              setActiveCategory('auto');
            }
          } else {
            autoDetectedCategoryRef.current = true;
            if (detectedCategory !== activeCategoryRef.current) {
              setActiveCategory(detectedCategory);
            }
          }
        }

        if (newSuggestions.length > 0) {
          const binaryAwareSuggestions = ensureBinarySuggestions(normalizedText, newSuggestions);
          const structuredSuggestions = binaryAwareSuggestions.map(s => ({ text: s, variant: 'default' as const }));
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
    <div className="min-h-screen text-[var(--ink)] px-4 md:px-8 py-6 flex flex-col">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-2)] via-[var(--accent)] to-[var(--accent-3)]">
            SpeakEasy
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">AI-Powered AAC Assistant</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleVoice}
            className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--ink)] rounded-full text-sm font-semibold border border-[var(--outline)] shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <span className="text-[var(--ink-muted)]">Voice:</span>
            <span className="font-semibold">{voiceGender === 'female' ? '👩 Female' : '👨 Male'}</span>
          </button>

          {isMockMode() && (
            <div className="bg-[rgba(242,179,75,0.2)] text-[var(--ink)] px-3 py-1 rounded-full text-xs font-semibold border border-[rgba(242,179,75,0.45)]">
              Mock Mode (No API Key)
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full h-[calc(100vh-170px)] overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {errorMsg && (
            <div className="bg-[rgba(242,109,91,0.12)] text-[var(--ink)] p-4 rounded-2xl border border-[rgba(242,109,91,0.3)]">
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
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                Suggested Responses
              </h2>
              <button
                onClick={() => setShowCustomPanel(true)}
                className="text-xs px-3 py-1 bg-[rgba(31,111,120,0.15)] text-[var(--accent-2)] rounded-full hover:bg-[rgba(31,111,120,0.25)] transition-colors font-semibold"
                title="Manage custom phrases"
              >
                + Custom
              </button>
            </div>
            {activeCategory === 'numbers' && (
              <div className="mb-3 rounded-2xl border border-[rgba(31,111,120,0.25)] bg-[rgba(31,111,120,0.12)] px-4 py-3">
                <div className="text-[var(--accent-2)] font-semibold">
                  Number: {numericInput || '—'}{numericUnit ? ` ${numericUnit}` : ''}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {unitOptions.map(unit => (
                    <button
                      key={unit}
                      onClick={() => setNumericUnit(prev => prev === unit ? '' : unit)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        numericUnit === unit
                          ? 'bg-[var(--accent-2)] text-white'
                          : 'bg-[rgba(31,111,120,0.16)] text-[var(--accent-2)] hover:bg-[rgba(31,111,120,0.28)]'
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
