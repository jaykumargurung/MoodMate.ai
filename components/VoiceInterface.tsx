
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { connectToLiveAPI, decode, decodeAudioData, encode } from '../services/geminiService';
import { MicIcon, StopIcon } from './icons/Icons';
import { Blob, LiveServerMessage, LiveSession } from '@google/genai';

interface Transcription {
    user: string;
    ai: string;
    isFinal: boolean;
}

export const VoiceInterface: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
    const [currentInterim, setCurrentInterim] = useState({ user: '', ai: ''});

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const stopListening = useCallback(async () => {
        if (!isListening) return;
        setIsListening(false);
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session:", e);
            }
        }
        sessionPromiseRef.current = null;
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        inputAudioContextRef.current?.close();
        inputAudioContextRef.current = null;
        
        setCurrentInterim({user: '', ai: ''});
        setTranscriptions(prev => {
           const last = prev[prev.length -1];
           if(last && !last.isFinal) {
               return [...prev.slice(0, -1), {...last, isFinal: true}];
           }
           return prev;
        });

    }, [isListening]);

    const startListening = async () => {
        if (isListening) return;
        setIsListening(true);
        setTranscriptions([]);
        setCurrentInterim({ user: '', ai: ''});

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            sessionPromiseRef.current = connectToLiveAPI({
                onopen: () => {
                    console.log('Session opened.');
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => handleServerMessage(message),
                onerror: (e: any) => { console.error('Session error:', e); stopListening(); },
                onclose: (e: any) => { console.log('Session closed.'); stopListening(); },
            });
             await sessionPromiseRef.current;

        } catch (error) {
            console.error('Error starting voice session:', error);
            setIsListening(false);
        }
    };
    
    const handleServerMessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
            setCurrentInterim(prev => ({...prev, ai: prev.ai + message.serverContent!.outputTranscription!.text}));
        }
        if (message.serverContent?.inputTranscription) {
            setCurrentInterim(prev => ({...prev, user: prev.user + message.serverContent!.inputTranscription!.text}));
        }

        if (message.serverContent?.turnComplete) {
            setTranscriptions(prev => [...prev, { user: currentInterim.user, ai: currentInterim.ai, isFinal: true}]);
            setCurrentInterim({ user: '', ai: '' });
        }

        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
        if (base64Audio && outputAudioContextRef.current) {
            const outputCtx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
        }

        if (message.serverContent?.interrupted) {
            for (const source of audioSourcesRef.current.values()) {
                source.stop();
            }
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
        }
    };


    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    return (
        <div className="flex flex-col h-full bg-surface rounded-t-3xl shadow-subtle p-6 text-center items-center justify-between">
            <div className="w-full">
                <h2 className="text-xl font-semibold text-text-primary">Voice Conversation</h2>
                <p className="text-text-secondary mt-1">
                    {isListening ? "I'm listening..." : "Tap the button to start talking."}
                </p>
                <div className="mt-6 w-full h-64 overflow-y-auto bg-base p-4 rounded-xl space-y-4 text-left">
                    {transcriptions.map((t, i) => (
                        <div key={i}>
                            <p><strong className="text-primary">You:</strong> {t.user}</p>
                            <p><strong className="text-secondary">AI:</strong> {t.ai}</p>
                        </div>
                    ))}
                    {(currentInterim.user || currentInterim.ai) && (
                         <div>
                            <p className="text-gray-500"><strong className="text-primary">You:</strong> {currentInterim.user}</p>
                            <p className="text-gray-500"><strong className="text-secondary">AI:</strong> {currentInterim.ai}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6">
                <button
                    onClick={isListening ? stopListening : startListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4
                        ${isListening ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300 animate-pulse' : 'bg-primary hover:bg-primary-focus focus:ring-primary/50'}`}
                >
                    {isListening ? (
                        <StopIcon className="w-10 h-10 text-white" />
                    ) : (
                        <MicIcon className="w-10 h-10 text-white" />
                    )}
                </button>
            </div>
        </div>
    );
};
