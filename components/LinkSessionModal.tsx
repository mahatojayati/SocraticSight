import React, { useState } from 'react';
import { Session, Project } from '../types';
import { X, Folder, MessageSquare, Search } from 'lucide-react';

interface LinkSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  projects: Project[];
  currentSessionId: string | null;
  onLinkSession: (session: Session) => void;
}

export const LinkSessionModal: React.FC<LinkSessionModalProps> = ({
  isOpen,
  onClose,
  sessions,
  projects,
  currentSessionId,
  onLinkSession
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Filter out current session and apply search
  const filteredSessions = sessions.filter(s => 
    s.id !== currentSessionId && 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Link Knowledge</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-800">
           <div className="relative">
             <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
             <input 
                type="text"
                placeholder="Search chats to merge..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
             />
           </div>
           <p className="mt-2 text-xs text-slate-500">
             Select a chat to import its context into your current session.
           </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
           {filteredSessions.length === 0 ? (
             <div className="text-center py-8 text-slate-500 text-sm">No other chats found.</div>
           ) : (
             <div className="space-y-1">
               {filteredSessions.map(session => {
                 const project = projects.find(p => p.id === session.projectId);
                 return (
                   <button
                     key={session.id}
                     onClick={() => onLinkSession(session)}
                     className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-left group border border-transparent hover:border-slate-700"
                   >
                     <div className="bg-indigo-900/20 p-2 rounded-lg text-indigo-400 group-hover:text-indigo-300">
                       <MessageSquare size={18} />
                     </div>
                     <div className="flex-1 overflow-hidden">
                       <h4 className="text-sm font-medium text-slate-200 truncate">{session.title}</h4>
                       <div className="flex items-center gap-2 mt-0.5">
                         {project && (
                           <span className="flex items-center gap-1 text-[10px] text-amber-500/80 bg-amber-900/10 px-1.5 rounded">
                             <Folder size={10} /> {project.name}
                           </span>
                         )}
                         <span className="text-[10px] text-slate-500">
                           {new Date(session.timestamp).toLocaleDateString()}
                         </span>
                       </div>
                     </div>
                   </button>
                 );
               })}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
