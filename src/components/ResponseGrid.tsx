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
                    <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
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
                                ? 'bg-sky-500 hover:bg-sky-600'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            } text-white font-bold py-6 px-4 rounded-xl shadow-lg transform transition active:scale-95 text-sm md:text-base break-words line-clamp-3 h-full flex items-center justify-center text-center`}
                        title={item.text}
                    >
                        {item.text}
                    </button>
                    {onAddFavorite && isFavorite && (
                        <button
                            onClick={() => onAddFavorite(item.text)}
                            className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity ${
                                isFavorite(item.text)
                                    ? 'bg-yellow-400 text-yellow-900'
                                    : 'bg-gray-600 text-white hover:bg-gray-700'
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
