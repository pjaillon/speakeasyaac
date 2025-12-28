/// <reference types="dom-speech-recognition" />
export class SpeechManager {
    private recognition: SpeechRecognition | null = null;
    private isListening: boolean = false;
    private onResultCallback: (text: string, isFinal: boolean) => void;

    constructor(onResult: (text: string, isFinal: boolean) => void) {
        this.onResultCallback = onResult;
        this.initRecognition();
    }

    private initRecognition() {
        const SpeechRecognition = SpeechManager.getSpeechRecognitionConstructor();
        if (!SpeechRecognition) {
            console.error("Speech Recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            this.onResultCallback(finalTranscript || interimTranscript, !!finalTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech Recognition Error:", event.error);
        };

        recognition.onend = () => {
            if (this.isListening) {
                // Auto-restart if it stops unexpectedly while we want it to listen
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (error) {
                        console.warn("Failed to restart recognition", error);
                    }
                }, 100);
            }
        };

        this.recognition = recognition;
    }

    public start() {
        if (!this.recognition) return;
        if (this.isListening) return;
        try {
            this.recognition.start();
            this.isListening = true;
        } catch (error) {
            console.error("Could not start recognition:", error);
        }
    }

    public stop() {
        if (!this.recognition) return;
        this.isListening = false;
        this.recognition.stop();
    }

    public speak(text: string, gender: 'male' | 'female' = 'female') {
        if (!window.speechSynthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);

        // Simple voice selection strategy
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;

        // Try to find a voice matching the gender criteria
        // Note: Browsers don't standardly expose 'gender' property on SpeechSynthesisVoice, 
        // so we often rely on names (e.g. "Daniel" vs "Samantha" on Mac) or just pick standard ones.
        // For Mac/iOS: 
        // Female: Samantha, Karen, Tessa
        // Male: Daniel, Rishi, Alex

        const preferredHelper = (v: SpeechSynthesisVoice) => {
            const name = v.name.toLowerCase();
            if (gender === 'female') return name.includes('samantha') || name.includes('female') || name.includes('victoria');
            return name.includes('daniel') || name.includes('male') || name.includes('alex');
        };

        selectedVoice = voices.find(v => v.lang.startsWith('en') && preferredHelper(v));

        // Fallback to any English voice
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith('en'));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        window.speechSynthesis.speak(utterance);
    }

    private static getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
        type WindowWithSpeechRecognition = Window & {
            SpeechRecognition?: new () => SpeechRecognition;
            webkitSpeechRecognition?: new () => SpeechRecognition;
        };

        const typedWindow = window as WindowWithSpeechRecognition;
        return typedWindow.SpeechRecognition ?? typedWindow.webkitSpeechRecognition ?? null;
    }
}
