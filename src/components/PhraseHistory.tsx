import React from 'react';

interface Props {
    history: string[];
    onSelect: (text: string) => void;
    onClear: () => void;
}

export const PhraseHistory: React.FC<Props> = ({ history, onSelect, onClear }) => {
    if (history.length === 0) {
        return (
            <div className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No recent phrases yet</p>
            </div>
        );
    }

    return (
        <div className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent</h3>
                <button
                    onClick={onClear}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                        className="w-full text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-3 rounded-lg text-sm text-gray-800 dark:text-gray-200 transition-colors line-clamp-2 break-words"
                        title={phrase}
                    >
                        {phrase}
                    </button>
                ))}
            </div>
        </div>
    );
};
