
import React from 'react';
import { Message as MessageType } from '../types';
import { LinkIcon } from './icons/Icons';
import { marked } from 'marked';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const parsedHtml = marked.parse(message.text) as string;

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          AI
        </div>
      )}
      <div className={`max-w-md md:max-w-lg p-3 rounded-2xl ${isUser ? 'bg-primary text-white rounded-br-none' : 'bg-surface text-text-primary rounded-bl-none shadow-subtle'}`}>
         <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: parsedHtml }} />
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-xs font-semibold mb-1.5 flex items-center">
              <LinkIcon className="w-4 h-4 mr-1.5" /> Sources:
            </h4>
            <ul className="space-y-1">
              {message.sources.map((source, index) => (
                <li key={index}>
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline break-all">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
          U
        </div>
      )}
    </div>
  );
};
