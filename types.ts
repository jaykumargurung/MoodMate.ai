
export enum AppMode {
  CHAT = 'Chat',
  VOICE = 'Voice Chat',
  THINKING = 'Deep Thought',
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  sources?: GroundingSource[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GeolocationState {
  latitude: number;
  longitude: number;
}
