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

export function isMockMode(): boolean {
    return !openai;
}

export async function generateSuggestions(history: string, currentUtterance: string): Promise<{ suggestions: string[], correctedText?: string }> {
    if (!openai) {
        console.warn("OpenAI API key missing or invalid. Using mock suggestions.");
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            suggestions: MOCK_SUGGESTIONS,
            correctedText: currentUtterance
        };
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an assistive communication aid for a user who cannot speak. " +
                        "Your goal is to suggest short responses for the user to say. " +
                        "CRITICAL INSTRUCTIONS:\n" +
                        "1. ACT AS THE USER. Do not behave like an AI assistant. If the input is 'Are you human?', suggest 'Yes'.\n" +
                        "2. PUNCTUATE the 'Current Utterance' based on context (add . ? !).\n" +
                        "3. Focus on the 'Current Utterance' for suggestions.\n" +
                        "4. INCLUDE open/uncertain options (e.g., 'Maybe', 'I don't know', 'We will see') if relevant to the question.\n" +
                        "5. Output exactly 6 to 8 options (1-3 words max).\n" +
                        "6. Return a JSON object: { \"suggestions\": string[], \"corrected_text\": string }"
                },
                {
                    role: "user",
                    content: `History: "${history}"\nCurrent Utterance: "${currentUtterance}"`
                }
            ],
            temperature: 0.7,
        });

        let content = response.choices[0].message.content || "";
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(content);
            const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 8) : [];
            const correctedText = typeof parsed.corrected_text === 'string' ? parsed.corrected_text : currentUtterance;

            // Fallback if suggestions empty but array parsed directly (legacy format support)
            if (Array.isArray(parsed)) {
                return { suggestions: parsed.slice(0, 8), correctedText: currentUtterance };
            }

            return { suggestions, correctedText };

        } catch (e) {
            console.warn("JSON Parse failed, attempting fallback split", content);
            // Fallback: assume line split is just suggestions, no correction
            const fallbackSuggestions = content.split('\n')
                .map(s => s.replace(/^-\s*/, '').trim())
                .filter(s => s.length > 0)
                .slice(0, 8);

            return { suggestions: fallbackSuggestions, correctedText: currentUtterance };
        }

    } catch (error) {
        console.error("LLM Generation Error:", error);
        throw error;
    }
}
