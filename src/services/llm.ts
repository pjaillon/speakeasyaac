import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

let openai: OpenAI | null = null;
if (apiKey && apiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
    openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Enabling for client-side demo
    });
}

const MOCK_SUGGESTIONS = [
    "Yes", "No", "Maybe", "I don't know",
    "Can you repeat that?", "Thank you",
    "I need help", "Goodbye"
];

/**
 * Detects the type of sentence and adds appropriate punctuation
 * Questions: ends with ?
 * Exclamations: ends with !
 * Statements: ends with .
 */
function addPunctuation(text: string, originalUtterance?: string): string {
    text = text.trim();
    
    // Already has punctuation
    if (text && /[.!?]$/.test(text)) {
        return text;
    }

    // Check for question indicators
    const questionPatterns = [
        /^(is|are|am|was|were|do|does|did|have|has|had|can|could|will|would|should|may|might|must|what|when|where|why|which|who|whose|how)\s/i,
        /\b(right|yeah|ok|innit|huh)\s*$/i, // Tag questions
        /\?$/, // Already has question mark
    ];

    const isQuestion = questionPatterns.some(pattern => pattern.test(text));

    // Check for exclamation indicators
    const exclamationPatterns = [
        /\b(wow|awesome|amazing|great|excellent|incredible|fantastic|wonderful|horrible|terrible|dreadful|yay|hurray|help|watch out)\b/i,
        /^(no|yes)\s+(way|sir|ma'am|really|absolutely)/, // Strong emphatic
        /!$/, // Already has exclamation
    ];

    const isExclamation = exclamationPatterns.some(pattern => pattern.test(text)) ||
                          (originalUtterance && /[A-Z]/.test(originalUtterance[0]) && 
                           originalUtterance.toUpperCase() === originalUtterance && 
                           originalUtterance.length > 2); // All caps

    if (isQuestion) {
        return text + '?';
    } else if (isExclamation) {
        return text + '!';
    } else {
        return text + '.';
    }
}

export function isMockMode(): boolean {
    return !openai;
}

export async function generateSuggestions(history: string, currentUtterance: string): Promise<{ suggestions: string[], uncertaintyResponse: string, correctedText?: string }> {
    if (!openai) {
        console.warn("OpenAI API key missing or invalid. Using mock suggestions.");
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            suggestions: MOCK_SUGGESTIONS,
            uncertaintyResponse: "I'm not sure",
            correctedText: addPunctuation(currentUtterance)
        };
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an assistive communication aid for a user who cannot speak. " +
                        "Your goal is to suggest short responses for the user to say and to punctuate the user's input.\n\n" +
                        "CRITICAL INSTRUCTIONS:\n" +
                        "1. ACT AS THE USER. Do not behave like an AI assistant. If the input is 'Are you human?', suggest 'Yes'.\n" +
                        "2. PUNCTUATION: The 'corrected_text' field MUST BE FULLY PUNCTUATED:\n" +
                        "   - Add '?' if the input is a question or sounds inquisitive\n" +
                        "   - Add '!' if the input is emphatic or excited\n" +
                        "   - Add '.' otherwise\n" +
                        "   - ALWAYS end with proper punctuation. However, the 'suggestions' fields MUST NOT end with a period.\n" +
                        "3. Focus on the 'Current Utterance' for suggestions.\n" +
                        "4. INCLUDE open/uncertain options (e.g., 'Maybe', 'I don't know', 'We will see') if relevant to the question.\n" +
                        "5. Output exactly 6 to 8 standard options (1-3 words max).\n" +
                        "6. PROVIDE a specific, highly contextual 'uncertainty_response' (e.g. 'Hmmm...', 'What?', 'Not sure yet', 'Let me think') that specifically fits the current conversation.\n" +
                        "7. DO NOT enumerate suggestions (no 1. 2. etc).\n" +
                        "8. Return ONLY a JSON object: { \"suggestions\": string[], \"uncertainty_response\": string, \"corrected_text\": string }"
                },
                {
                    role: "user",
                    content: `History: "${history}"\nCurrent Utterance: "${currentUtterance}"`
                }
            ],
            temperature: 0.7,
        });

        let rawContent = response.choices[0].message.content || "";

        // Robust JSON extraction: Find first { and last }
        const firstBrace = rawContent.indexOf('{');
        const lastBrace = rawContent.lastIndexOf('}');
        let jsonContent = rawContent;
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonContent = rawContent.substring(firstBrace, lastBrace + 1);
        }

        // Helper to clean suggestions: remove numbers, dots, extra punctuation, normalize spacing
        const cleanText = (s: string) => {
            return s
                .replace(/^[\d\-\.\)\s]+/, '') // Remove leading numbers, dashes, dots, parens
                .replace(/[\*\`\"]+/g, '') // Remove asterisks, backticks, quotes
                .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
                .replace(/\.$/, '') // Remove trailing period
                .trim() // Trim whitespace
                .split(' ') // Capitalize first letter of each word
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
                .substring(0, 50); // Limit to 50 chars to fit in tiles
        };

        try {
            const parsed = JSON.parse(jsonContent);
            const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
            const suggestions = rawSuggestions.slice(0, 8).map(cleanText);

            let uncertaintyResponse = typeof parsed.uncertainty_response === 'string' ? parsed.uncertainty_response : "I don't know";
            uncertaintyResponse = cleanText(uncertaintyResponse);

            let correctedText = typeof parsed.corrected_text === 'string' ? parsed.corrected_text : currentUtterance;
            
            // Ensure corrected text ends with proper punctuation
            correctedText = addPunctuation(correctedText, currentUtterance);

            return { suggestions, uncertaintyResponse, correctedText };

        } catch (e) {
            console.warn("JSON Parse failed, attempting fallback split", rawContent);
            // Fallback: assume line split is just suggestions, but filter out anything that looks like code/JSON
            const fallbackSuggestions = rawContent.split('\n')
                .map(cleanText)
                .filter(s => s.length > 0 && !s.includes('{') && !s.includes('}'))
                .slice(0, 8);

            return {
                suggestions: fallbackSuggestions.length > 0 ? fallbackSuggestions : MOCK_SUGGESTIONS,
                uncertaintyResponse: "I'm not sure",
                correctedText: addPunctuation(currentUtterance)
            };
        }

    } catch (error) {
        console.error("LLM Generation Error:", error);
        throw error;
    }
}
