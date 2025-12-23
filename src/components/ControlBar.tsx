import React from 'react';

interface Props {
    isListening: boolean;
    onToggleListening: () => void;
    onClear: () => void;
}

export const ControlBar: React.FC<Props> = ({ isListening, onToggleListening, onClear }) => {
    return (
        <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex space-x-4">
                <button
                    onClick={onToggleListening}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-full font-bold transition-colors ${isListening
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                >
                    <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
                    {isListening && <span className="animate-pulse">●</span>}
                </button>
            </div>
            <div>
                <button
                    onClick={onClear}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium px-4"
                >
                    Clear Transcript
                </button>
            </div>
        </div>
    );
};
