import React from 'react';

interface Props {
    isListening: boolean;
    onToggleListening: () => void;
    onClear: () => void;
    onReset: () => void;
    fontSizePreset: 'small' | 'medium' | 'large';
    onSetFontSize: (preset: 'small' | 'medium' | 'large') => void;
}

export const ControlBar: React.FC<Props> = ({ isListening, onToggleListening, onClear, onReset, fontSizePreset, onSetFontSize }) => {
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
                        onClick={() => onSetFontSize('small')}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors font-semibold ${fontSizePreset === 'small'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                            }`}
                        title="Small font size"
                    >
                        S
                    </button>
                    <button
                        onClick={() => onSetFontSize('medium')}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors font-semibold ${fontSizePreset === 'medium'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                            }`}
                        title="Medium font size"
                    >
                        M
                    </button>
                    <button
                        onClick={() => onSetFontSize('large')}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors font-semibold ${fontSizePreset === 'large'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                            }`}
                        title="Large font size"
                    >
                        L
                    </button>
                </div>
                <button
                    onClick={onClear}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-semibold rounded-lg transition-colors"
                >
                    Clear Transcript
                </button>
                <button
                    onClick={onReset}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                    title="Clear everything and reset the app"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};
