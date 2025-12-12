import React, { useState } from 'react';
import { Session, Project } from '../types';
import { MessageSquare, Plus, Trash2, X, Clock, Folder, FolderOpen, Pencil, Check } from 'lucide-react';

interface SidebarProps {
  sessions: Session[];
  projects: Project[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onCreateProject: (name: string) => void;
  onMoveSession: (sessionId: string, projectId?: string) => void;
  onDeleteProject: (projectId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  projects,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onCreateProject,
  onMoveSession,
  onDeleteProject,
  isOpen,
  onClose
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id)));

  const toggleProject = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setExpandedProjects(newSet);
  };

  const startEditing = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = (sessionId: string) => {
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle);
    }
    setEditingSessionId(null);
  };

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName);
      setNewProjectName('');
      setIsCreatingProject(false);
    }
  };

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, sessionId: string) => {
    e.dataTransfer.setData("sessionId", sessionId);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, projectId?: string) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData("sessionId");
    if (sessionId) {
      onMoveSession(sessionId, projectId);
    }
  };

  const renderSessionItem = (session: Session) => (
    <div
      key={session.id}
      draggable
      onDragStart={(e) => onDragStart(e, session.id)}
      onClick={() => {
        onSelectSession(session.id);
        if (window.innerWidth < 768) onClose();
      }}
      className={`
        group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border
        ${currentSessionId === session.id 
          ? 'bg-slate-800 border-slate-700 text-white shadow-sm' 
          : 'text-slate-400 border-transparent hover:bg-slate-900 hover:text-slate-200'
        }
      `}
    >
      <MessageSquare size={18} className={currentSessionId === session.id ? 'text-indigo-400' : 'text-slate-600'} />
      
      <div className="flex-1 overflow-hidden">
        {editingSessionId === session.id ? (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs p-1 rounded border border-indigo-500 focus:outline-none"
              autoFocus
              onBlur={() => saveTitle(session.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle(session.id);
                if (e.key === 'Escape') setEditingSessionId(null);
              }}
            />
            <button onMouseDown={() => saveTitle(session.id)} className="text-green-400 hover:text-green-300">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            <h3 className="text-sm font-medium truncate group-hover:text-slate-200">{session.title}</h3>
            <p className="text-[10px] text-slate-500 truncate">
              {new Date(session.timestamp).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {editingSessionId !== session.id && (
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => startEditing(session, e)}
            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-md"
            title="Rename"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => onDeleteSession(session.id, e)}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-md"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 bottom-0 w-72 bg-slate-950 border-r border-slate-800 z-40 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg tracking-tight">Library</h2>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl transition-colors font-medium shadow-lg shadow-indigo-900/20"
          >
            <Plus size={18} />
            New Problem
          </button>

          {!isCreatingProject ? (
            <button
              onClick={() => setIsCreatingProject(true)}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl transition-colors text-xs font-medium border border-slate-700"
            >
              <Folder size={14} /> Create Project
            </button>
          ) : (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
              <input
                autoFocus
                type="text"
                placeholder="Project Name"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                  if (e.key === 'Escape') setIsCreatingProject(false);
                }}
              />
              <button 
                onClick={handleCreateProject}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                <Check size={14} />
              </button>
              <button 
                onClick={() => setIsCreatingProject(false)}
                className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar space-y-1 pb-4">
          
          {/* Projects */}
          {projects.map(project => {
            const projectSessions = sessions.filter(s => s.projectId === project.id);
            const isExpanded = expandedProjects.has(project.id);

            return (
              <div 
                key={project.id} 
                className="mb-1"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, project.id)}
              >
                <div 
                  className="group flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white cursor-pointer hover:bg-slate-900 rounded-lg"
                  onClick={() => toggleProject(project.id)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <FolderOpen size={16} className="text-amber-500/80" /> : <Folder size={16} className="text-slate-600 group-hover:text-amber-500/80 transition-colors" />}
                    <span className="text-sm font-medium">{project.name}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500 group-hover:text-slate-400">
                      {projectSessions.length}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 hover:text-red-400 hover:bg-red-900/20 rounded transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-2 pl-2 border-l border-slate-800 space-y-1 mt-1">
                    {projectSessions.length === 0 ? (
                      <div className="text-[10px] text-slate-600 py-2 px-2 italic">Drag chats here</div>
                    ) : (
                      projectSessions.map(renderSessionItem)
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized Header (Implicit) */}
          <div 
            className="mt-4 mb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
             onDragOver={onDragOver}
             onDrop={(e) => onDrop(e, undefined)} // Undefined projectId means uncategorized
          >
            Uncategorized
          </div>

          <div 
            className="space-y-1 min-h-[50px]"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, undefined)}
          >
            {sessions.filter(s => !s.projectId).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 text-slate-700">
                <p className="text-xs">No active chats</p>
              </div>
            ) : (
              sessions.filter(s => !s.projectId).map(renderSessionItem)
            )}
          </div>

        </div>
      </div>
    </>
  );
};