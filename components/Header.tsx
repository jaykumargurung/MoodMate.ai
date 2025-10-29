
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center py-6 md:py-8 px-4">
      <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
        MoodMate ☀️
      </h1>
      <p className="mt-2 text-md md:text-lg text-text-secondary">
        Your emotionally intelligent AI friend. How are you feeling today?
      </p>
    </header>
  );
};
