import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ChatBubble } from './components/ChatBubble';
import { Sidebar } from './components/Sidebar';
import { LinkSessionModal } from './components/LinkSessionModal';
import { sendMessageToGemini, generateSolvedImage } from './services/geminiService';
import { db } from './services/db';
import { Message, Attachment, Session, Project } from './types';
import { Send, EyeOff, Loader2, Sparkles, Paperclip, Link2, X, FileText, Mic, Square, Music } from 'lucide-react';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showRevealOption, setShowRevealOption] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  
  // Attachments in the chat input
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Keep track of session metadata ref to allow saving without state stale closure issues
  const sessionMetadataRef = useRef<{ title: string, projectId?: string, timestamp: number } | null>(null);

  // Load data from DB
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedSessions, loadedProjects] = await Promise.all([
          db.getAllSessions(),
          db.getAllProjects()
        ]);
        setSessions(loadedSessions);
        setProjects(loadedProjects);
      } catch (e) {
        console.error("Failed to load data from DB", e);
      }
    };
    loadData();
  }, []);

  // Update session metadata ref when current session changes
  useEffect(() => {
    if (currentSessionId) {
      const sess = sessions.find(s => s.id === currentSessionId);
      if (sess) {
        sessionMetadataRef.current = {
          title: sess.title,
          projectId: sess.projectId,
          timestamp: sess.timestamp
        };
      }
    }
  }, [currentSessionId, sessions]);

  // Sync messages state to sessions state AND persist to DB
  useEffect(() => {
    if (currentSessionId && sessionMetadataRef.current) {
      const prevTitle = sessionMetadataRef.current.title;
      const newTitle = generateTitle(messages, prevTitle);
      
      const updatedSession: Session = {
        id: currentSessionId,
        messages: messages,
        title: newTitle,
        projectId: sessionMetadataRef.current.projectId,
        timestamp: sessionMetadataRef.current.timestamp
      };

      setSessions(prev => prev.map(s => s.id === currentSessionId ? updatedSession : s));
      
      if (messages.length > 0) {
          db.saveSession(updatedSession).catch(console.error);
      }
    }
  }, [messages, currentSessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, pendingAttachments]);

  const generateTitle = (msgs: Message[], currentTitle: string) => {
    if ((currentTitle === 'New Session' || currentTitle === 'New Problem') && msgs.length > 0) {
       const firstUserMsg = msgs.find(m => m.role === 'user' && !m.isSystemEvent);
       if (firstUserMsg) {
         if (firstUserMsg.attachments && firstUserMsg.attachments.length > 0 && !firstUserMsg.text) {
            return `Problem ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
         }
         return firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
       }
    }
    return currentTitle;
  };

  // --- Session Management ---

  const createNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: 'New Problem',
      timestamp: Date.now(),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setShowRevealOption(false);
    setIsSidebarOpen(false);
    setPendingAttachments([]);
    db.saveSession(newSession);
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setShowRevealOption(false);
      setIsSidebarOpen(false);
      setPendingAttachments([]);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this chat?")) {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      db.deleteSession(id);
    }
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions(prev => {
        const next = prev.map(s => s.id === id ? { ...s, title: newTitle } : s);
        const updated = next.find(s => s.id === id);
        if (updated) db.saveSession(updated);
        return next;
    });
  };

  const handleMoveSession = (sessionId: string, projectId?: string) => {
    setSessions(prev => {
        const next = prev.map(s => s.id === sessionId ? { ...s, projectId } : s);
        const updated = next.find(s => s.id === sessionId);
        if (updated) db.saveSession(updated);
        return next;
    });
  };

  // --- Project Management ---

  const handleCreateProject = (name: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name
    };
    setProjects(prev => [...prev, newProject]);
    db.saveProject(newProject);
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm("Delete this project? Chats will be moved to Uncategorized.")) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      db.deleteProject(projectId);
      
      setSessions(prev => {
          const next = prev.map(s => {
              if (s.projectId === projectId) {
                  const updated = { ...s, projectId: undefined };
                  db.saveSession(updated); 
                  return updated;
              }
              return s;
          });
          return next;
      });
    }
  };

  // --- Attachments & Audio ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      files.forEach(file => {
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPendingAttachments(prev => [...prev, {
              mimeType: file.type,
              data: reader.result as string,
              name: file.name
            }]);
          };
          reader.readAsDataURL(file);
        }
      });
      // Reset input so same file can be selected again if needed
      e.target.value = '';
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
             const base64String = reader.result as string;
             setPendingAttachments(prev => [...prev, {
                 mimeType: audioBlob.type || 'audio/webm',
                 data: base64String,
                 name: `Audio ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
             }]);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- Chat & Logic ---

  const handleInitialFilesSelected = async (attachments: Attachment[]) => {
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
       const newSession: Session = {
        id: Date.now().toString(),
        title: 'New Problem',
        timestamp: Date.now(),
        messages: []
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      activeSessionId = newSession.id;
      db.saveSession(newSession);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: attachments.length > 1 ? 'Here are my materials.' : 'Can you help me with this?',
      attachments: attachments
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(messages, { 
        attachments: attachments, 
        text: 'Analyze these materials. If there are notes, use them to guide me on the problem image.' 
      });

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages(prev => [...prev, userMsg, modelMsg]); 
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm having trouble connecting to my brain right now. Please try again.",
        isError: true
      };
      setMessages(prev => [...prev, userMsg, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendText = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    // Allow sending if there are attachments even if text is empty
    if (!textToSend.trim() && pendingAttachments.length === 0) return;

    if (!overrideText) {
      setInputText('');
      setPendingAttachments([]);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(messages, { 
        text: textToSend,
        attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
      });
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages([...newMessages, modelMsg]);
    } catch (error) {
       const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Something went wrong. Please try asking again.",
        isError: true
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkSession = async (targetSession: Session) => {
    if (!window.confirm(`Merge context from "${targetSession.title}" into this chat?`)) return;
    setIsLinkModalOpen(false);
    setIsLoading(true);

    // Format the history of the target session to inject as context
    const contextHistory = targetSession.messages
      .filter(m => !m.isSystemEvent && !m.isError) // Filter out meta messages
      .map(m => `[${m.role.toUpperCase()}]: ${m.text}`)
      .join('\n\n');

    const systemText = `[SYSTEM: IMPORTED CONTEXT FROM SESSION "${targetSession.title}"]\n${contextHistory}`;
    
    // Create a special system message object
    const systemMsg: Message = {
      id: Date.now().toString(),
      role: 'user', // Role must be user for the API to accept it in history
      text: systemText,
      isSystemEvent: true // Flag to render it differently in UI
    };

    const newMessages = [...messages, systemMsg];
    setMessages(newMessages);

    try {
      // We send a prompt to acknowledge the merge
      const responseText = await sendMessageToGemini(messages, { 
        text: `I have imported context from the session "${targetSession.title}". Please incorporate this knowledge into our current discussion.` 
      });
      
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages([...newMessages, modelMsg]);

    } catch (error) {
      console.error("Merge failed", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Failed to merge context.",
        isError: true
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Image Generation Logic for Reveal Answer ---

  const handleFillInAnswer = async () => {
    if (!window.confirm("I will solve the problem and write the answer directly on your image. Ready?")) return;

    setIsLoading(true);
    setShowRevealOption(false);

    try {
      const lastImageMsg = [...messages].reverse().find(m => m.role === 'user' && m.attachments?.some(a => a.mimeType.startsWith('image/')));
      
      if (!lastImageMsg || !lastImageMsg.attachments) {
        throw new Error("No image found to solve.");
      }
      
      const targetImage = lastImageMsg.attachments.find(a => a.mimeType.startsWith('image/'));
      if (!targetImage) throw new Error("Image attachment missing.");

      const userRequestMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: "Generate the solution in my handwriting on the image."
      };
      setMessages(prev => [...prev, userRequestMsg]);

      const generatedImageBase64 = await generateSolvedImage(targetImage.data);
      const generatedImageUrl = `data:image/jpeg;base64,${generatedImageBase64}`;

      const modelResponseMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I've written the solution on the image for you:",
        attachments: [{
          mimeType: 'image/jpeg',
          data: generatedImageUrl,
          name: 'solved_problem.jpg'
        }]
      };

      setMessages(prev => [...prev, modelResponseMsg]);

    } catch (error) {
      console.error("Generation failed", error);
       const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I couldn't generate the handwriting solution on the image. Please try the text-based reveal instead.",
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      
      <Sidebar 
        sessions={sessions}
        projects={projects}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={createNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onMoveSession={handleMoveSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <LinkSessionModal 
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        sessions={sessions}
        projects={projects}
        currentSessionId={currentSessionId}
        onLinkSession={handleLinkSession}
      />

      <div className="flex-1 flex flex-col h-full w-full bg-slate-900 relative">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 md:p-6 scrollbar-hide">
          
          {!currentSessionId || messages.length === 0 ? (
            /* Empty State - Show Uploader */
            <div className="h-full flex flex-col justify-center items-center">
              <div className="text-center mb-8 px-4">
                <h2 className="text-3xl font-bold text-white mb-3">SocraticSight</h2>
                <p className="text-slate-400 text-lg max-w-md mx-auto">
                  Upload problems, notes, or ask questions with your voice.
                </p>
              </div>
              <ImageUploader onFilesSelected={handleInitialFilesSelected} isLoading={isLoading} />
            </div>
          ) : (
            /* Chat State */
            <div className="flex flex-col pb-32">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-indigo-400 text-sm ml-2 animate-pulse mt-2">
                   <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

        </main>

        {/* Input Area (Only visible if session active and has messages) */}
        {currentSessionId && messages.length > 0 && (
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 pb-6 z-20">
            <div className="max-w-4xl mx-auto space-y-3">
              
              {/* Action Bar */}
              <div className="flex justify-between items-end px-1">
                 {/* Pending Attachments Preview */}
                 {pendingAttachments.length > 0 ? (
                   <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar max-w-[70%]">
                      {pendingAttachments.map((att, idx) => (
                        <div key={idx} className="relative group shrink-0 w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
                           {att.mimeType === 'application/pdf' ? (
                             <div className="w-full h-full flex items-center justify-center text-slate-500"><FileText size={16} /></div>
                           ) : att.mimeType.startsWith('audio/') ? (
                             <div className="w-full h-full flex items-center justify-center text-indigo-400"><Music size={16} /></div>
                           ) : (
                             <img src={att.data} className="w-full h-full object-cover opacity-70" alt="preview" />
                           )}
                           <button 
                            onClick={() => removePendingAttachment(idx)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <X size={12} className="text-white" />
                           </button>
                        </div>
                      ))}
                   </div>
                 ) : <div></div>}

                 <div className="flex items-center gap-2">
                    {!showRevealOption ? (
                      <button 
                        onClick={() => setShowRevealOption(true)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        I give up?
                      </button>
                    ) : (
                      <div className="flex gap-2 animate-in slide-in-from-right-2 fade-in">
                         <button 
                          onClick={() => handleSendText("REVEAL_ANSWER")}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-slate-700"
                        >
                          <EyeOff size={12} /> Text Answer
                        </button>
                        <button 
                          onClick={handleFillInAnswer}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-md shadow-indigo-900/30"
                        >
                          <Sparkles size={12} /> Fill in Answer
                        </button>
                      </div>
                    )}
                 </div>
              </div>

              {/* Main Input */}
              <div className="relative flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                
                {/* Tools - Left Side */}
                <div className="flex flex-col gap-1 pb-1 pl-1">
                   <button 
                    onClick={() => setIsLinkModalOpen(true)}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50 rounded-xl transition-colors"
                    title="Merge context from another chat"
                    disabled={isRecording}
                   >
                     <Link2 size={20} />
                   </button>
                   <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50 rounded-xl transition-colors"
                    title="Add attachment"
                    disabled={isRecording}
                   >
                     <Paperclip size={20} />
                   </button>
                   <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                   />
                </div>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendText();
                    }
                  }}
                  placeholder={
                    isRecording 
                      ? "Recording audio..." 
                      : pendingAttachments.length > 0 
                        ? "Add a message..." 
                        : "Type or use voice..."
                  }
                  className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 resize-none py-3 min-h-[50px] max-h-32"
                  rows={1}
                  disabled={isLoading || isRecording}
                />
                
                <div className="flex flex-col gap-1 pb-1 pr-1">
                   {isRecording ? (
                     <button
                       onClick={handleStopRecording}
                       className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-500 animate-pulse transition-all shadow-md mb-1"
                       title="Stop Recording"
                     >
                       <Square size={18} fill="currentColor" />
                     </button>
                   ) : (
                     <button
                       onClick={handleStartRecording}
                       disabled={isLoading}
                       className={`p-2 rounded-xl transition-colors mb-1 ${
                         isLoading 
                          ? 'text-slate-600 cursor-not-allowed' 
                          : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50'
                       }`}
                       title="Record Voice"
                     >
                       <Mic size={20} />
                     </button>
                   )}
                   
                   {!isRecording && (
                      <button
                        onClick={() => handleSendText()}
                        disabled={(!inputText.trim() && pendingAttachments.length === 0) || isLoading}
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all shadow-md"
                        title="Send Message"
                      >
                        <Send size={18} />
                      </button>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;