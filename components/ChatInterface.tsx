
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppMode, Message as MessageType } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { sendMessageToChat, generateWithThinking, generateWithMaps, generateWithSearch, parseGroundingSources, streamLowLatencyResponse, textToSpeech, decode, decodeAudioData } from '../services/geminiService';
import { Message } from './Message';
import { SendIcon, VolumeIcon } from './icons/Icons';

interface ChatInterfaceProps {
    mode: AppMode;
}

const placeholderMessages: Record<AppMode, string> = {
    [AppMode.CHAT]: "How are you feeling today?",
    [AppMode.THINKING]: "Ask a complex or thoughtful question...",
    [AppMode.VOICE]: ""
};

const introMessages: Record<AppMode, string> = {
    [AppMode.CHAT]: "Hello! I'm MoodMate. Let's talk about what's on your mind.",
    [AppMode.THINKING]: "Welcome to Deep Thought mode. I'm ready to explore complex topics with you.",
    [AppMode.VOICE]: ""
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ mode }) => {
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { location, error: geoError } = useGeolocation();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages([{ id: 'intro', text: introMessages[mode], sender: 'ai' }]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: MessageType = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            let response;
            let sources;

            const lowerCaseInput = input.toLowerCase();
            const useMaps = lowerCaseInput.includes('nearby') || lowerCaseInput.includes('around here') || lowerCaseInput.includes('place to');
            const useSearch = lowerCaseInput.includes('latest') || lowerCaseInput.includes('news') || lowerCaseInput.includes('who is');

            if (mode === AppMode.THINKING) {
                response = await generateWithThinking(input);
            } else if (useMaps && location) {
                 response = await generateWithMaps(input, location);
                 sources = parseGroundingSources(response.candidates?.[0]?.groundingMetadata);
            } else if (useSearch) {
                 response = await generateWithSearch(input);
                 sources = parseGroundingSources(response.candidates?.[0]?.groundingMetadata);
            } else {
                 response = await sendMessageToChat(input);
            }
            
            const aiMessage: MessageType = {
                id: (Date.now() + 1).toString(),
                text: response.text,
                sender: 'ai',
                sources: sources
            };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: MessageType = {
                id: (Date.now() + 1).toString(),
                text: "I'm having a little trouble connecting right now. Please try again later.",
                sender: 'ai'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleTTS = useCallback(async (text: string) => {
        try {
            const base64Audio = await textToSpeech(text);
            if(base64Audio) {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                const audioBytes = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
            }
        } catch (error) {
            console.error("Error with Text-to-Speech:", error);
        }
    }, []);

    return (
        <div className="flex flex-col h-full bg-surface rounded-t-3xl shadow-subtle overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((msg, index) => (
                   <div key={msg.id} className="group relative">
                        <Message message={msg} />
                        {msg.sender === 'ai' && !isLoading && index === messages.length - 1 && (
                            <button 
                                onClick={() => handleTTS(msg.text)}
                                className="absolute left-12 -bottom-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-gray-200 hover:bg-gray-300 rounded-full"
                                title="Read aloud"
                            >
                                <VolumeIcon className="w-4 h-4 text-gray-600" />
                            </button>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="p-3 rounded-2xl bg-surface rounded-bl-none shadow-subtle flex items-center space-x-2">
                           <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                           <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                           <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-base border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={placeholderMessages[mode]}
                        className="flex-1 w-full px-4 py-3 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-3 bg-primary text-white rounded-full hover:bg-primary-focus disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </form>
                {geoError && <p className="text-xs text-red-500 mt-2 text-center">{geoError}</p>}
            </div>
        </div>
    );
};
