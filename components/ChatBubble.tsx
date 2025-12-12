import React from 'react';
import { Message } from '../types';
import { Bot, User, AlertCircle, FileText, Youtube, ExternalLink, Link2, Music } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const isSystem = message.isSystemEvent;

  // Handle System/Context Messages
  if (isSystem) {
    return (
      <div className="flex w-full mb-6 justify-center">
        <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-400">
           <Link2 size={12} className="text-indigo-400" />
           <span className="font-medium">{message.text.split('\n')[0].replace('[SYSTEM: ', '').replace(']', '')}</span>
        </div>
      </div>
    );
  }

  // Parse YouTube search term
  const youtubeRegex = /VIDEO_SEARCH:\s*(.+)/;
  const match = message.text.match(youtubeRegex);
  const videoTerm = match ? match[1].trim() : null;
  
  // Clean text by removing the metadata tag
  const displayText = message.text.replace(youtubeRegex, '').trim();

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg mt-1 ${
          isUser 
            ? 'bg-indigo-600 text-white' 
            : isError 
              ? 'bg-red-900/50 text-red-400 border border-red-800' 
              : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
        }`}>
          {isUser ? <User size={20} /> : isError ? <AlertCircle size={20} /> : <Bot size={20} />}
        </div>

        {/* Content Bubble */}
        <div className="flex flex-col gap-2 w-full min-w-0">
          {/* Attachments Grid */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`grid gap-2 mb-1 ${message.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {message.attachments.map((att, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                  {att.mimeType === 'application/pdf' ? (
                    <div className="flex items-center justify-center h-32 bg-slate-800 p-4">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FileText size={32} />
                        <span className="text-xs font-medium truncate max-w-full px-2">{att.name || 'PDF Document'}</span>
                      </div>
                    </div>
                  ) : att.mimeType.startsWith('audio/') ? (
                    <div className="flex items-center justify-center h-20 bg-slate-800 p-3 w-full min-w-[200px]">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                          <Music size={14} className="text-indigo-400" />
                        </div>
                        <audio controls src={att.data} className="w-full h-8" />
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={att.data} 
                      alt={`Attachment ${idx + 1}`} 
                      className="h-auto max-h-60 w-full object-cover" 
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {displayText && (
            <div className={`flex flex-col shadow-md rounded-2xl p-5 ${
              isUser 
                ? 'bg-indigo-600 text-white rounded-tr-sm' 
                : isError
                  ? 'bg-red-900/20 text-red-200 border border-red-800 rounded-tl-sm'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
            }`}>
              <div className="prose prose-invert prose-sm max-w-none break-words whitespace-pre-wrap leading-relaxed">
                {displayText}
              </div>

              {/* YouTube Recommendation Chip */}
              {videoTerm && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-2">
                  <a 
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(videoTerm)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-red-600/20"
                  >
                    <Youtube size={16} />
                    Watch: {videoTerm}
                    <ExternalLink size={12} className="ml-1 opacity-50" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};