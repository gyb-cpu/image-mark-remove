// Mock user storage - replace with Supabase when network is available
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  googleId?: string;
  password?: string;
  isPro: boolean;
  usageCount: number;
  lastReset: string;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'free' | 'active' | 'canceled' | 'past_due';
  createdAt: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  originalUrl?: string;
  resultUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  creditsUsed: number;
  createdAt: string;
}

// In-memory storage
export const users: Record<string, User> = {};
export const usageHistory: Record<string, UsageRecord[]> = {};

// Helper to get or create user (sync version for Edge runtime)
export function getUser(email: string): User | null {
  // Check memory first
  if (users[email]) return users[email];
  
  // Check KV storage (synchronous in Edge)
  const kv = (globalThis as any).USERS_KV;
  if (kv && typeof kv.get === 'function') {
    try {
      const raw = kv.get(`user:${email}`);
      if (raw) {
        const user = JSON.parse(raw);
        users[email] = user; // Cache in memory
        return user;
      }
    } catch (e) {
      console.error("KV get error:", e);
    }
  }
  
  return null;
}

// Helper to create user on first login
export function createUser(email: string, name?: string, avatar?: string, googleId?: string): User {
  if (users[email]) return users[email];
  
  const user: User = {
    id: Math.random().toString(36).slice(2),
    email,
    name,
    avatar,
    googleId,
    isPro: false,
    usageCount: 0,
    lastReset: new Date().toDateString(),
    subscriptionStatus: 'free',
    createdAt: new Date().toISOString()
  };
  
  users[email] = user;
  usageHistory[email] = [];
  
  // Also save to KV
  const kv = (globalThis as any).USERS_KV;
  if (kv && typeof kv.put === 'function') {
    kv.put(`user:${email}`, JSON.stringify(user)).catch(console.error);
  }
  
  return user;
}

// Helper to add usage record
export function addUsageRecord(email: string, record: Omit<UsageRecord, 'id' | 'userId' | 'createdAt'>): UsageRecord {
  let user = users[email];
  
  // Try to get from KV if not in memory
  if (!user) {
    const kv = (globalThis as any).USERS_KV;
    if (kv) {
      try {
        const raw = kv.get(`user:${email}`);
        if (raw) {
          user = JSON.parse(raw);
          users[email] = user;
        }
      } catch (e) {
        console.error("KV get error:", e);
      }
    }
  }
  
  if (!user) {
    // User not found, create one (Google login user)
    user = createUser(email, email.split('@')[0]);
  }
  
  const newRecord: UsageRecord = {
    ...record,
    id: Math.random().toString(36).slice(2),
    userId: user.id,
    createdAt: new Date().toISOString()
  };
  
  if (!usageHistory[email]) usageHistory[email] = [];
  usageHistory[email].unshift(newRecord);
  
  // Update user usage count
  user.usageCount += record.creditsUsed;
  
  return newRecord;
}

// Helper to get usage history
export function getUsageHistory(email: string, limit = 20): UsageRecord[] {
  return (usageHistory[email] || []).slice(0, limit);
}

// Helper to update user profile
export function updateUser(email: string, updates: Partial<User>): User | null {
  let user = users[email];
  
  // Try to get from KV if not in memory
  if (!user) {
    const kv = (globalThis as any).USERS_KV;
    if (kv) {
      try {
        const raw = kv.get(`user:${email}`);
        if (raw) {
          user = JSON.parse(raw);
          users[email] = user;
        }
      } catch (e) {
        console.error("KV get error:", e);
      }
    }
  }
  
  if (!user) return null;
  
  users[email] = { ...user, ...updates };
  
  // Save to KV
  const kv = (globalThis as any).USERS_KV;
  if (kv && typeof kv.put === 'function') {
    kv.put(`user:${email}`, JSON.stringify(users[email])).catch(console.error);
  }
  
  return users[email];
}
