/// <reference types="dom-speech-recognition" />
export class SpeechManager {
    private recognition: SpeechRecognition | null = null;
    private isListening: boolean = false;
    private onResultCallback: (text: string, isFinal: boolean) => void;
    private voices: SpeechSynthesisVoice[] = [];
    private restartTimer: number | null = null;

    constructor(onResult: (text: string, isFinal: boolean) => void) {
        this.onResultCallback = onResult;
        this.initRecognition();
        this.initVoices();
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
            const retryableErrors = new Set(['no-speech', 'audio-capture', 'network', 'aborted']);
            if (retryableErrors.has(event.error)) {
                this.scheduleRestart();
            } else {
                this.isListening = false;
            }
        };

        recognition.onend = () => {
            if (this.isListening) {
                // Auto-restart if it stops unexpectedly while we want it to listen
                this.scheduleRestart();
            }
        };

        this.recognition = recognition;
    }

    private initVoices() {
        if (!window.speechSynthesis) return;
        this.refreshVoices();
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            this.refreshVoices();
        });
    }

    private refreshVoices() {
        this.voices = window.speechSynthesis.getVoices();
    }

    public start() {
        if (!this.recognition) return;
        if (this.isListening) return;
        try {
            this.clearRestartTimer();
            this.recognition.start();
            this.isListening = true;
        } catch (error) {
            console.error("Could not start recognition:", error);
        }
    }

    public stop() {
        if (!this.recognition) return;
        this.isListening = false;
        this.clearRestartTimer();
        this.recognition.stop();
    }

    public speak(text: string, gender: 'male' | 'female' = 'female') {
        if (!window.speechSynthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = this.voices.length > 0 ? this.voices : window.speechSynthesis.getVoices();
        const selectedVoice = SpeechManager.pickBestVoice(voices, gender);

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

    private static pickBestVoice(voices: SpeechSynthesisVoice[], gender: 'male' | 'female') {
        const genderHints = gender === 'female'
            ? ['samantha', 'victoria', 'karen', 'tessa', 'female']
            : ['daniel', 'alex', 'rishi', 'male'];
        const premiumHints = ['enhanced', 'premium', 'neural'];

        const englishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith('en'));
        const ranked = englishVoices.length > 0 ? englishVoices : voices;

        const isGenderMatch = (voice: SpeechSynthesisVoice) => {
            const name = voice.name.toLowerCase();
            return genderHints.some(hint => name.includes(hint));
        };

        const isPremium = (voice: SpeechSynthesisVoice) => {
            const name = voice.name.toLowerCase();
            return premiumHints.some(hint => name.includes(hint));
        };

        return (
            ranked.find(voice => isPremium(voice) && isGenderMatch(voice)) ??
            ranked.find(voice => isGenderMatch(voice)) ??
            ranked.find(voice => isPremium(voice)) ??
            ranked[0] ??
            null
        );
    }

    private scheduleRestart() {
        if (!this.isListening || !this.recognition) return;
        if (this.restartTimer !== null) return;
        this.restartTimer = window.setTimeout(() => {
            this.restartTimer = null;
            if (!this.isListening || !this.recognition) return;
            try {
                this.recognition.start();
            } catch (error) {
                console.warn("Failed to restart recognition", error);
                this.scheduleRestart();
            }
        }, 250);
    }

    private clearRestartTimer() {
        if (this.restartTimer === null) return;
        window.clearTimeout(this.restartTimer);
        this.restartTimer = null;
    }
}
