import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage, ChatSession } from '../types';

type DbSession = {
  id: string;
  user_id: string;
  subject: string;
  ai_provider?: string | null;
  created_at: string;
  last_active: string;
  is_archived?: boolean | null;
  metadata?: any;
};

type DbMessage = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | null;
  created_at?: string | null;
  metadata?: any;
};

function mapDbSession(row: DbSession): ChatSession {
  const created = new Date(row.created_at);
  const updated = new Date(row.last_active);
  const title = row.metadata?.title || row.subject || `Chat ${created.toLocaleDateString()}`;
  return {
    id: row.id,
    title,
    messages: [],
    isActive: !(row.is_archived ?? false),
    metadata: row.metadata || undefined,
    createdAt: created,
    updatedAt: updated,
  };
}

function mapDbMessage(row: DbMessage): ChatMessage {
  const ts = row.timestamp || row.created_at || new Date().toISOString();
  const created = new Date(ts);
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    sessionId: row.session_id,
    metadata: row.metadata || undefined,
    createdAt: created,
    updatedAt: created,
  } as ChatMessage;
}

export class AITutorRepository {
  async listSessionsWithMessages(userId: string): Promise<ChatSession[]> {
    const { data: sessRows, error: sessErr } = await supabase
      .from('ai_tutor_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_active', { ascending: false });

    if (sessErr) throw new Error(sessErr.message);
    const sessions = (sessRows || []).map(mapDbSession);

    if (sessions.length === 0) return sessions;
    const ids = sessions.map(s => s.id);
    const { data: msgRows, error: msgErr } = await supabase
      .from('ai_tutor_messages')
      .select('*')
      .in('session_id', ids)
      .order('timestamp', { ascending: true });
    if (msgErr) throw new Error(msgErr.message);

    const bySession: Record<string, ChatMessage[]> = {};
    for (const row of msgRows || []) {
      const msg = mapDbMessage(row as any);
      (bySession[msg.sessionId] ||= []).push(msg);
    }

    for (const s of sessions) {
      s.messages = bySession[s.id] || [];
      if (s.messages.length) {
        s.updatedAt = new Date(s.messages[s.messages.length - 1].createdAt as any);
      }
    }

    return sessions;
  }

  async createSession(userId: string, params: { title?: string; subject?: string; provider?: string }): Promise<ChatSession> {
    const subject = params.subject || 'General';
    const metadata = { title: params.title || subject };
    const { data, error } = await supabase
      .from('ai_tutor_sessions')
      .insert({
        user_id: userId,
        subject,
        ai_provider: params.provider || 'deepseek',
        metadata,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapDbSession(data as any);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase.from('ai_tutor_sessions').delete().eq('id', sessionId);
    if (error) throw new Error(error.message);
  }

  async insertMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: Date }): Promise<ChatMessage> {
    const { role, content, metadata } = message;
    const ts = (message.createdAt ? message.createdAt.toISOString() : new Date().toISOString());
    const { data, error } = await supabase
      .from('ai_tutor_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        timestamp: ts,
        metadata: metadata || {},
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapDbMessage(data as any);
  }

  async updateAssistantMessageContent(messageId: string, content: string, metadata?: any): Promise<void> {
    const { error } = await supabase
      .from('ai_tutor_messages')
      .update({ content, metadata: metadata || {} })
      .eq('id', messageId);
    if (error) throw new Error(error.message);
  }

  async touchSession(sessionId: string, patch?: { metadata?: any; subject?: string }): Promise<void> {
    const now = new Date().toISOString();
    const update: any = { 
      last_active: now,
      updated_at: now // Update both columns for compatibility
    };
    if (patch?.metadata) update.metadata = patch.metadata;
    if (patch?.subject) update.subject = patch.subject;
    
    try {
      const { error } = await supabase
        .from('ai_tutor_sessions')
        .update(update)
        .eq('id', sessionId);
      if (error) throw new Error(error.message);
    } catch (error) {
      // Fallback: Try with only updated_at if last_active fails
      if (error instanceof Error && error.message.includes('last_active')) {
        console.warn('Fallback: Updating session with updated_at only', { sessionId });
        const fallbackUpdate = { ...update };
        delete fallbackUpdate.last_active;
        
        const { error: fallbackError } = await supabase
          .from('ai_tutor_sessions')
          .update(fallbackUpdate)
          .eq('id', sessionId);
        if (fallbackError) throw new Error(fallbackError.message);
      } else {
        throw error;
      }
    }
  }
}

