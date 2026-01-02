import React from 'react';

interface Props {
    favorites: string[];
    onSelect: (text: string) => void;
    onRemoveFavorite: (text: string) => void;
}

export const FavoritePhrases: React.FC<Props> = ({ favorites, onSelect, onRemoveFavorite }) => {
    if (favorites.length === 0) {
        return null;
    }

    return (
        <div className="mb-4">
            <h3 className="text-xs font-semibold text-[var(--ink-muted)] mb-2 uppercase tracking-[0.26em]">Favorites</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {favorites.map((phrase) => (
                    <div key={phrase} className="relative group">
                        <button
                            onClick={() => onSelect(phrase)}
                            className="w-full bg-[var(--accent-3)] hover:bg-[#e0a23c] text-[var(--ink)] font-semibold py-3 px-3 rounded-2xl shadow-md transform transition hover:-translate-y-0.5 active:translate-y-0 text-sm break-words line-clamp-2 h-full flex items-center justify-center text-center ring-1 ring-black/5"
                            title={phrase}
                        >
                            {phrase}
                        </button>
                        <button
                            onClick={() => onRemoveFavorite(phrase)}
                            className="absolute top-0 right-0 bg-[var(--accent)] hover:bg-[#e25b4a] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove from favorites"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
