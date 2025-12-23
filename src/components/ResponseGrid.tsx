import React from 'react';

interface Props {
    suggestions: string[];
    onSelect: (text: string) => void;
    isLoading: boolean;
}

export const ResponseGrid: React.FC<Props> = ({ suggestions, onSelect, isLoading }) => {
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
            {suggestions.map((text, index) => (
                <button
                    key={index}
                    onClick={() => onSelect(text)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 px-4 rounded-xl shadow-lg transform transition active:scale-95 text-lg md:text-xl break-words"
                >
                    {text}
                </button>
            ))}
        </div>
    );
};
