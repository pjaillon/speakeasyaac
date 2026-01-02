import React from 'react';

interface Props {
    isListening: boolean;
    onToggleListening: () => void;
    onClear: () => void;
    onReset: () => void;
    fontSizePreset: 'small' | 'medium' | 'large';
    onSetFontSize: (preset: 'small' | 'medium' | 'large') => void;
}

export const ControlBar: React.FC<Props> = ({ isListening, onToggleListening, onClear, onReset, fontSizePreset, onSetFontSize }) => {
    return (
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 glass-panel p-4 rounded-3xl">
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={onToggleListening}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all shadow-md hover:shadow-lg ${isListening
                            ? 'bg-[var(--accent)] hover:bg-[#e25b4a] text-white'
                            : 'bg-[var(--accent-2)] hover:bg-[#185c64] text-white'
                        }`}
                >
                    <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
                    {isListening && <span className="animate-pulse">●</span>}
                </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onSetFontSize('small')}
                        className={`px-3 py-2 text-sm rounded-full transition-all font-semibold border border-[var(--outline)] ${fontSizePreset === 'small'
                            ? 'bg-[var(--accent-2)] text-white shadow-sm'
                            : 'bg-[var(--surface-strong)] text-[var(--ink)] hover:bg-[rgba(31,111,120,0.12)]'
                            }`}
                        title="Small font size"
                    >
                        S
                    </button>
                    <button
                        onClick={() => onSetFontSize('medium')}
                        className={`px-4 py-2 text-sm rounded-full transition-all font-semibold border border-[var(--outline)] ${fontSizePreset === 'medium'
                            ? 'bg-[var(--accent-2)] text-white shadow-sm'
                            : 'bg-[var(--surface-strong)] text-[var(--ink)] hover:bg-[rgba(31,111,120,0.12)]'
                            }`}
                        title="Medium font size"
                    >
                        M
                    </button>
                    <button
                        onClick={() => onSetFontSize('large')}
                        className={`px-3 py-2 text-sm rounded-full transition-all font-semibold border border-[var(--outline)] ${fontSizePreset === 'large'
                            ? 'bg-[var(--accent-2)] text-white shadow-sm'
                            : 'bg-[var(--surface-strong)] text-[var(--ink)] hover:bg-[rgba(31,111,120,0.12)]'
                            }`}
                        title="Large font size"
                    >
                        L
                    </button>
                </div>
                <button
                    onClick={onClear}
                    className="px-4 py-2 bg-[var(--surface-strong)] hover:bg-[rgba(28,27,31,0.08)] text-[var(--ink)] font-semibold rounded-full transition-colors border border-[var(--outline)]"
                >
                    Clear Transcript
                </button>
                <button
                    onClick={onReset}
                    className="px-4 py-2 bg-[var(--accent)] hover:bg-[#e25b4a] text-white font-semibold rounded-full transition-colors shadow-sm"
                    title="Clear everything and reset the app"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};
