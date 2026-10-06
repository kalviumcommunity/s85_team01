const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
}

export interface DocumentItem {
  id: string;
  originalName: string;
  pageCount: number;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
  _count?: {
    chunks: number;
  };
}

export interface Citation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  evidence: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  citations: Citation[];
}

export interface MessageItem {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  createdAt: string;
  messages: MessageItem[];
}

function getStoredToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pharma_token');
  }
  return null;
}

function setStoredToken(token: string | null) {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('pharma_token', token);
    } else {
      localStorage.removeItem('pharma_token');
    }
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default content-type to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  async register(email: string, password: string, name?: string): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setStoredToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  // Documents
  async getDocuments(): Promise<{ documents: DocumentItem[] }> {
    return request<{ documents: DocumentItem[] }>('/api/documents');
  },

  async getDocument(id: string): Promise<{ document: DocumentItem }> {
    return request<{ document: DocumentItem }>(`/api/documents/${id}`);
  },

  async uploadDocument(file: File): Promise<{ document: DocumentItem }> {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ document: DocumentItem }>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async deleteDocument(id: string): Promise<void> {
    await request(`/api/documents/${id}`, { method: 'DELETE' });
  },

  getDocumentFileUrl(id: string): string {
    const token = getStoredToken();
    return `${API_BASE}/api/documents/${id}/file${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  // Chat
  async sendChat(
    question: string,
    documentIds?: string[],
    conversationId?: string
  ): Promise<ChatResponse> {
    return request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ question, documentIds, conversationId }),
    });
  },

  async getConversations(): Promise<{ conversations: ConversationItem[] }> {
    return request<{ conversations: ConversationItem[] }>('/api/chat/conversations');
  },
};
