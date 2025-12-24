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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Custom Phrases</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
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
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            Add
                        </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {customPhrases.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No custom phrases yet</p>
                        ) : (
                            customPhrases.map((phrase) => (
                                <div
                                    key={phrase}
                                    className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
                                >
                                    <span className="text-sm text-gray-800 dark:text-gray-200 break-words flex-1">
                                        {phrase}
                                    </span>
                                    <button
                                        onClick={() => onRemove(phrase)}
                                        className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
