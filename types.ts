export type Role = 'user' | 'model';

export interface Attachment {
  mimeType: string;
  data: string; // Base64 string
  name?: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  isError?: boolean;
  isSystemEvent?: boolean; // Used for merged context or system notifications
}

export interface Session {
  id: string;
  title: string;
  projectId?: string; 
  timestamp: number;
  messages: Message[];
}

export interface Project {
  id: string;
  name: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}
