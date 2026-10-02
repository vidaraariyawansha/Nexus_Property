import { AdvisorIntent, AdvisorSearchCriteria } from '../types/aiAdvisor.js';

export interface SessionContext {
  sessionId: string;
  userId?: string;
  language: 'en' | 'si' | 'ta';
  lastIntent?: AdvisorIntent;
  searchCriteria?: AdvisorSearchCriteria;
  lastPropertyIds?: string[];
  contextPropertyId?: string;
  pendingConfirmation?: {
    action: string;
    description: string;
    payload: Record<string, any>;
  };
  turnCount: number;
  lastActivity: number;
}

const sessions = new Map<string, SessionContext>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Periodic cleanup of expired sessions
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, sess] of sessions.entries()) {
    if (now - sess.lastActivity > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export function getOrCreateSession(sessionId?: string, userId?: string, language: 'en' | 'si' | 'ta' = 'en'): SessionContext {
  const id = sessionId && sessionId.trim() ? sessionId.trim() : `sess_${Math.random().toString(36).substring(2, 12)}`;
  let sess = sessions.get(id);

  if (!sess) {
    sess = {
      sessionId: id,
      userId,
      language,
      turnCount: 0,
      lastActivity: Date.now(),
    };
    sessions.set(id, sess);
  } else {
    sess.lastActivity = Date.now();
    if (userId && !sess.userId) sess.userId = userId;
    if (language) sess.language = language;
  }

  return sess;
}

export function updateSessionContext(sessionId: string, updates: Partial<SessionContext>): SessionContext {
  const sess = getOrCreateSession(sessionId);
  Object.assign(sess, updates);
  sess.lastActivity = Date.now();
  sess.turnCount += 1;
  sessions.set(sessionId, sess);
  return sess;
}

export function clearSessionContext(sessionId: string): void {
  sessions.delete(sessionId);
}
