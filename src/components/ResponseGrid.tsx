import React from 'react';

interface Suggestion {
    text: string;
    variant: 'default' | 'uncertainty';
}

interface Props {
    suggestions: Suggestion[];
    onSelect: (text: string) => void;
    isLoading: boolean;
    onAddFavorite?: (text: string) => void;
    isFavorite?: (text: string) => boolean;
}

export const ResponseGrid: React.FC<Props> = ({ suggestions, onSelect, isLoading, onAddFavorite, isFavorite }) => {
    if (isLoading && suggestions.length === 0) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-64 animate-pulse">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-[rgba(28,27,31,0.08)] rounded-2xl"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {suggestions.map((item, index) => (
                <div key={index} className="relative group">
                    <button
                        onClick={() => onSelect(item.text)}
                        className={`w-full ${item.variant === 'uncertainty'
                                ? 'bg-[var(--accent)] hover:bg-[#e25b4a]'
                                : 'bg-[var(--accent-2)] hover:bg-[#185c64]'
                            } text-white font-semibold py-6 px-4 rounded-2xl shadow-lg transform transition hover:-translate-y-0.5 active:translate-y-0 text-sm md:text-base break-words line-clamp-3 h-full flex items-center justify-center text-center ring-1 ring-black/5`}
                        title={item.text}
                    >
                        {item.text}
                    </button>
                    {onAddFavorite && isFavorite && (
                        <button
                            onClick={() => onAddFavorite(item.text)}
                            className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all bg-white/90 shadow-sm border border-black/10 ${
                                isFavorite(item.text)
                                    ? 'text-[var(--accent-3)]'
                                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                            }`}
                            title={isFavorite(item.text) ? "Remove from favorites" : "Add to favorites"}
                        >
                            ★
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};
