import React, { useEffect, useRef } from 'react';

export interface Message {
    role: 'user' | 'assistant'; // 'user' is the person speaking to me, 'assistant' is ME (the AAC user)
    content: string;
    timestamp: number;
}

interface Props {
    messages: Message[];
    interimTranscript: string;
}

export const TranscriptionStream: React.FC<Props> = ({ messages, interimTranscript }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, interimTranscript]);

    return (
        <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-inner overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 flex flex-col space-y-4">
            {messages.length === 0 && !interimTranscript && (
                <div className="flex-1 flex items-center justify-center text-gray-400 italic">
                    Listening for conversation...
                </div>
            )}

            {messages.map((msg, idx) => (
                <div
                    key={msg.timestamp + idx}
                    className={`flex ${msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                        className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm text-lg ${msg.role === 'assistant'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-600'
                            }`}
                    >
                        {msg.content}
                    </div>
                </div>
            ))}

            {interimTranscript && (
                <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl px-5 py-3 shadow-sm text-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-bl-none animate-pulse italic">
                        {interimTranscript} ...
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
};
