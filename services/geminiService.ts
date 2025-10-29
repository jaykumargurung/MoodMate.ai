
import { GoogleGenAI, Chat, GenerateContentResponse, Modality, GroundingMetadata, LiveSession } from "@google/genai";
import { MODELS, MOODMATE_SYS_INS } from '../constants';
import { GeolocationState } from "../types";

// Ensure API_KEY is available
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chatInstance: Chat | null = null;

export const initializeChat = (): Chat => {
  chatInstance = ai.chats.create({
    model: MODELS.CHAT,
    config: {
      systemInstruction: MOODMATE_SYS_INS,
    },
  });
  return chatInstance;
};

export const sendMessageToChat = async (message: string): Promise<GenerateContentResponse> => {
  if (!chatInstance) {
    initializeChat();
  }
  return chatInstance!.sendMessage({ message });
};

export const generateWithThinking = async (prompt: string): Promise<GenerateContentResponse> => {
  return await ai.models.generateContent({
    model: MODELS.THINKING,
    contents: `${MOODMATE_SYS_INS}\n\nUser Question: ${prompt}`,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
    },
  });
};

export const generateWithMaps = async (prompt: string, location: GeolocationState): Promise<GenerateContentResponse> => {
  return await ai.models.generateContent({
    model: MODELS.CHAT,
    contents: `${MOODMATE_SYS_INS}\n\nUser's current location is latitude: ${location.latitude}, longitude: ${location.longitude}. User Question: ${prompt}`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }
      }
    },
  });
};


export const generateWithSearch = async (prompt: string): Promise<GenerateContentResponse> => {
  return await ai.models.generateContent({
    model: MODELS.CHAT,
    contents: `${MOODMATE_SYS_INS}\n\nUser Question: ${prompt}`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
};

export const streamLowLatencyResponse = async (prompt: string) => {
    return await ai.models.generateContentStream({
        model: MODELS.LOW_LATENCY,
        contents: `${MOODMATE_SYS_INS}\n\nUser Question: ${prompt}`
    });
}

export const textToSpeech = async (text: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: MODELS.TTS,
    contents: [{ parts: [{ text: `Say in a warm, empathetic tone: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};


export const connectToLiveAPI = (callbacks: {
    onopen: () => void;
    onmessage: (message: any) => void;
    onerror: (e: any) => void;
    onclose: (e: any) => void;
}): Promise<LiveSession> => {
    return ai.live.connect({
        model: MODELS.LIVE,
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: MOODMATE_SYS_INS,
        },
    });
};


// --- UTILITY FUNCTIONS ---

export const parseGroundingSources = (groundingMetadata?: GroundingMetadata) => {
  if (!groundingMetadata?.groundingChunks) return [];
  return groundingMetadata.groundingChunks
    .map(chunk => {
      const source = chunk.web || chunk.maps;
      return source ? { title: source.title, uri: source.uri } : null;
    })
    .filter(Boolean);
};


// --- AUDIO UTILS ---

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
