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

export async function generateSuggestions(history: string, currentUtterance: string): Promise<{ suggestions: string[], uncertaintyResponse: string, correctedText?: string }> {
    if (!openai) {
        console.warn("OpenAI API key missing or invalid. Using mock suggestions.");
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            suggestions: MOCK_SUGGESTIONS,
            uncertaintyResponse: "I'm not sure",
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
                        "5. Output exactly 6 to 8 standard options (1-3 words max).\n" +
                        "6. PROVIDE a specific, highly contextual 'uncertainty_response' (e.g. 'Hmmm...', 'What?', 'Not sure yet', 'Let me think') that specifically fits the input. vary this logic.\n" +
                        "7. DO NOT enumerate suggestions (no 1. 2. etc).\n" +
                        "8. DO NOT end suggestions with a period.\n" +
                        "9. Return ONLY a JSON object: { \"suggestions\": string[], \"uncertainty_response\": string, \"corrected_text\": string }"
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

        // Helper to clean suggestions (remove numbers, dots)
        const cleanText = (s: string) => s.replace(/^[\d\-\.\)\s]+/, '').replace(/\.$/, '').trim();

        try {
            const parsed = JSON.parse(jsonContent);
            const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
            const suggestions = rawSuggestions.slice(0, 8).map(cleanText);

            let uncertaintyResponse = typeof parsed.uncertainty_response === 'string' ? parsed.uncertainty_response : "I don't know";
            uncertaintyResponse = cleanText(uncertaintyResponse);

            const correctedText = typeof parsed.corrected_text === 'string' ? parsed.corrected_text : currentUtterance;

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
                correctedText: currentUtterance
            };
        }

    } catch (error) {
        console.error("LLM Generation Error:", error);
        throw error;
    }
}
