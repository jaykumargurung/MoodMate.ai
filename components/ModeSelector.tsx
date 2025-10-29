
import React from 'react';
import { AppMode } from '../types';
import { BrainIcon, ChatBubbleIcon, MicIcon } from './icons/Icons';

interface ModeSelectorProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const icons: Record<AppMode, React.ReactNode> = {
    [AppMode.CHAT]: <ChatBubbleIcon className="w-5 h-5 mr-2"/>,
    [AppMode.VOICE]: <MicIcon className="w-5 h-5 mr-2"/>,
    [AppMode.THINKING]: <BrainIcon className="w-5 h-5 mr-2"/>,
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex justify-center p-4">
      <div className="flex space-x-2 bg-base p-1.5 rounded-full shadow-subtle">
        {Object.values(AppMode).map((mode) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50
              ${currentMode === mode ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:bg-gray-200'}`}
          >
            {icons[mode]}
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
};
