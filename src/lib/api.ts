/**
 * Sprout API Client
 * Manages communication with the local Express backend.
 */

const API_URL = '/api';

export interface User {
  id: number;
  email: string;
  displayName: string;
  freezes_count: number;
  theme: 'light' | 'dark';
}

export interface Habit {
  id: number;
  user_id: number;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly';
  category: string;
  level: number;
  target_streak: number;
  is_adapted: boolean;
  reminder_time?: string;
  reminder_days?: string;
  created_at: string;
}

export interface HabitEntry {
  id: number;
  habit_id: number;
  user_id: number;
  date: string;
  completed: boolean;
  is_freeze: boolean;
  notes: string;
  mood?: string;
  adapted_from?: string;
}

class SproutAPI {
  private token: string | null = localStorage.getItem('sprout_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('sprout_token', token);
    else localStorage.removeItem('sprout_token');
  }

  getToken() {
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  }

  // Auth
  async register(data: any) {
    const res = await this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
    this.setToken(res.token);
    return res;
  }

  async login(data: any) {
    const res = await this.request('/auth/login', { method: 'POST', body: JSON.stringify(data) });
    this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateSettings(data: { theme: 'light' | 'dark' }) {
    return this.request('/auth/settings', { method: 'PATCH', body: JSON.stringify(data) });
  }

  // Habits
  async getHabits(): Promise<Habit[]> {
    return this.request('/habits');
  }

  async createHabit(data: Partial<Habit>): Promise<Habit> {
    return this.request('/habits', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateHabit(id: number, data: Partial<Habit>): Promise<void> {
    return this.request(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteHabit(id: number): Promise<void> {
    return this.request(`/habits/${id}`, { method: 'DELETE' });
  }

  // Entries
  async getEntries(): Promise<HabitEntry[]> {
    return this.request('/entries');
  }

  async createEntry(data: Partial<HabitEntry>): Promise<void> {
    return this.request('/entries', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteEntry(data: { habit_id: number, date: string }): Promise<void> {
    const params = new URLSearchParams({ habit_id: data.habit_id.toString(), date: data.date });
    return this.request(`/entries?${params.toString()}`, { method: 'DELETE' });
  }

  async updateEntry(id: number, data: Partial<HabitEntry>): Promise<void> {
    return this.request(`/entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteEntryById(id: number): Promise<void> {
    return this.request(`/entries/${id}`, { method: 'DELETE' });
  }

  async getStats(): Promise<any> {
    return this.request('/stats');
  }

  async getAchievements(): Promise<any[]> {
    return this.request('/achievements');
  }
}

export const api = new SproutAPI();
