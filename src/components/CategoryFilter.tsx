import React from 'react';

type Category = 'auto' | 'food' | 'comfort' | 'general' | 'yes-no' | 'help' | 'numbers';

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
        { id: 'numbers', label: 'Numbers', emoji: '🔢' },
        { id: 'help', label: 'Help', emoji: '🆘' },
    ];

    return (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => onCategoryChange(cat.id)}
                    className={`px-3 py-2 rounded-full font-semibold whitespace-nowrap transition-all text-sm border ${
                        activeCategory === cat.id
                            ? 'bg-[var(--accent-2)] text-white border-transparent shadow-sm'
                            : 'bg-[var(--surface-strong)] text-[var(--ink)] border-[var(--outline)] hover:bg-[rgba(31,111,120,0.12)]'
                    }`}
                >
                    {cat.emoji} {cat.label}
                </button>
            ))}
        </div>
    );
};
