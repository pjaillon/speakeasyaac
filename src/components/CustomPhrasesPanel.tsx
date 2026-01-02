import React, { useState } from 'react';

interface Props {
    isOpen: boolean;
    customPhrases: string[];
    onClose: () => void;
    onAdd: (phrase: string) => void;
    onRemove: (phrase: string) => void;
}

export const CustomPhrasesPanel: React.FC<Props> = ({ isOpen, customPhrases, onClose, onAdd, onRemove }) => {
    const [newPhrase, setNewPhrase] = useState('');

    const handleAdd = () => {
        if (newPhrase.trim().length > 0 && !customPhrases.includes(newPhrase.trim())) {
            onAdd(newPhrase.trim());
            setNewPhrase('');
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel rounded-3xl max-w-md w-full">
                <div className="flex justify-between items-center p-6 border-b border-[var(--outline)]">
                    <h2 className="text-xl font-semibold text-[var(--ink)]">Custom Phrases</h2>
                    <button
                        onClick={onClose}
                        className="text-[var(--ink-muted)] hover:text-[var(--ink)] text-2xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newPhrase}
                            onChange={(e) => setNewPhrase(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                            placeholder="Enter a phrase..."
                            className="flex-1 px-3 py-2 border border-[var(--outline)] rounded-full bg-[var(--surface-strong)] text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,111,120,0.35)]"
                        />
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-[var(--accent-2)] hover:bg-[#185c64] text-white font-semibold rounded-full transition-colors shadow-sm"
                        >
                            Add
                        </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {customPhrases.length === 0 ? (
                            <p className="text-sm text-[var(--ink-muted)] text-center py-4">No custom phrases yet</p>
                        ) : (
                            customPhrases.map((phrase) => (
                                <div
                                    key={phrase}
                                    className="flex justify-between items-center bg-[var(--surface-strong)] p-3 rounded-2xl border border-[var(--outline)]"
                                >
                                    <span className="text-sm text-[var(--ink)] break-words flex-1">
                                        {phrase}
                                    </span>
                                    <button
                                        onClick={() => onRemove(phrase)}
                                        className="ml-2 text-[var(--accent)] hover:text-[#e25b4a] font-bold"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-[var(--outline)]">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-[var(--surface-strong)] hover:bg-[rgba(28,27,31,0.08)] text-[var(--ink)] font-semibold rounded-full transition-colors border border-[var(--outline)]"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
