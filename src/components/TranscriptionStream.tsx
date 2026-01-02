import React, { useEffect, useRef } from 'react';

export interface Message {
    role: 'user' | 'assistant'; // 'user' is the person speaking to me, 'assistant' is ME (the AAC user)
    content: string;
    timestamp: number;
}

interface Props {
    messages: Message[];
    interimTranscript: string;
    fontSize: number;
}

export const TranscriptionStream: React.FC<Props> = ({ messages, interimTranscript, fontSize }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, interimTranscript]);

    return (
        <div className="flex-1 glass-panel rounded-3xl p-5 overflow-y-auto mb-4 flex flex-col gap-4">
            {messages.length === 0 && !interimTranscript && (
                <div className="flex-1 flex items-center justify-center text-[var(--ink-muted)] italic">
                    Listening for conversation...
                </div>
            )}

            {messages.map((msg, idx) => (
                <div
                    key={msg.timestamp + idx}
                    className={`flex fade-in-up ${msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                        className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${msg.role === 'assistant'
                                ? 'bg-[var(--accent)] text-white rounded-br-none'
                                : 'bg-[var(--surface-strong)] text-[var(--ink)] rounded-bl-none border border-[var(--outline)]'
                            }`}
                        style={{ fontSize: `${fontSize}rem` }}
                    >
                        {msg.content}
                    </div>
                </div>
            ))}

            {interimTranscript && (
                <div className="flex justify-start fade-in-up">
                    <div
                        className="max-w-[80%] rounded-2xl px-5 py-3 shadow-sm bg-[rgba(28,27,31,0.08)] text-[var(--ink-muted)] rounded-bl-none animate-pulse italic"
                        style={{ fontSize: `${fontSize}rem` }}
                    >
                        {interimTranscript} ...
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
};
