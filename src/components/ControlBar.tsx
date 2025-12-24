import React from 'react';

interface Props {
    isListening: boolean;
    onToggleListening: () => void;
    onClear: () => void;
    fontSize: number;
    onIncreaseFontSize: () => void;
    onDecreaseFontSize: () => void;
}

export const ControlBar: React.FC<Props> = ({ isListening, onToggleListening, onClear, fontSize, onIncreaseFontSize, onDecreaseFontSize }) => {
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
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onDecreaseFontSize}
                        title="Decrease font size"
                        className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-semibold"
                    >
                        A−
                    </button>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 w-12 text-center">
                        {(fontSize * 100).toFixed(0)}%
                    </span>
                    <button
                        onClick={onIncreaseFontSize}
                        title="Increase font size"
                        className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-semibold"
                    >
                        A+
                    </button>
                </div>
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
