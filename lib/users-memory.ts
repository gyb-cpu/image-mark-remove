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

// Helper to get or create user
export function getUser(email: string): User | null {
  return users[email] || null;
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
  return user;
}

// Helper to add usage record
export function addUsageRecord(email: string, record: Omit<UsageRecord, 'id' | 'userId' | 'createdAt'>): UsageRecord {
  const user = users[email];
  if (!user) throw new Error('User not found');
  
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
  const user = users[email];
  if (!user) return null;
  
  users[email] = { ...user, ...updates };
  return users[email];
}