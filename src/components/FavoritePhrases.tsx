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
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">⭐ Favorites</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {favorites.map((phrase) => (
                    <div key={phrase} className="relative group">
                        <button
                            onClick={() => onSelect(phrase)}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-3 rounded-lg shadow-md transform transition active:scale-95 text-sm break-words line-clamp-2 h-full flex items-center justify-center text-center"
                            title={phrase}
                        >
                            {phrase}
                        </button>
                        <button
                            onClick={() => onRemoveFavorite(phrase)}
                            className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
