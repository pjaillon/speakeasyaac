import React from 'react';

interface Props {
    history: string[];
    onSelect: (text: string) => void;
    onClear: () => void;
}

export const PhraseHistory: React.FC<Props> = ({ history, onSelect, onClear }) => {
    if (history.length === 0) {
        return (
            <div className="w-full lg:w-64 glass-panel p-4 flex items-center justify-center">
                <p className="text-sm text-[var(--ink-muted)] text-center">No recent phrases yet</p>
            </div>
        );
    }

    return (
        <div className="w-full lg:w-64 glass-panel p-4 flex flex-col lg:h-full">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Recent</h3>
                <button
                    onClick={onClear}
                    className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    title="Clear history"
                >
                    Clear
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
                {history.map((phrase, idx) => (
                    <button
                        key={`${phrase}-${idx}`}
                        onClick={() => onSelect(phrase)}
                        className="w-full text-left bg-[var(--surface-strong)] hover:bg-[rgba(28,27,31,0.08)] p-3 rounded-2xl text-sm text-[var(--ink)] transition-colors line-clamp-2 break-words border border-[var(--outline)]"
                        title={phrase}
                    >
                        {phrase}
                    </button>
                ))}
            </div>
        </div>
    );
};
