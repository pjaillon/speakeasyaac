import React from 'react';

type Category = 'auto' | 'food' | 'comfort' | 'general' | 'yes-no' | 'help';

interface Props {
    activeCategory: Category;
    onCategoryChange: (category: Category) => void;
}

export const CategoryFilter: React.FC<Props> = ({ activeCategory, onCategoryChange }) => {
    const categories: { id: Category; label: string; emoji: string }[] = [
        { id: 'auto', label: 'Auto', emoji: '🤖' },
        { id: 'food', label: 'Food', emoji: '🍽️' },
        { id: 'comfort', label: 'Comfort', emoji: '😌' },
        { id: 'general', label: 'General', emoji: '💬' },
        { id: 'yes-no', label: 'Yes/No', emoji: '❓' },
        { id: 'help', label: 'Help', emoji: '🆘' },
    ];

    return (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => onCategoryChange(cat.id)}
                    className={`px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors text-sm ${
                        activeCategory === cat.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                >
                    {cat.emoji} {cat.label}
                </button>
            ))}
        </div>
    );
};
