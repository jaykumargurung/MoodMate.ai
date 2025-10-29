
import React, { useState } from 'react';
import { AppMode } from './types';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { ChatInterface } from './components/ChatInterface';
import { VoiceInterface } from './components/VoiceInterface';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);

  return (
    <div className="h-screen w-screen bg-base flex flex-col font-sans">
      <Header />
      <ModeSelector currentMode={mode} onModeChange={setMode} />
      <main className="flex-1 max-w-2xl w-full mx-auto pb-4 px-4 flex flex-col">
        {mode === AppMode.VOICE ? (
            <VoiceInterface />
        ) : (
            <ChatInterface mode={mode} />
        )}
      </main>
    </div>
  );
};

export default App;
