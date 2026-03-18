
import { UserAccount, SavedPatient, AppSettings } from '../types';
import { getSupabase, isSupabaseConfigured } from '../supabase';

export const DEFAULT_ADMIN: UserAccount = {
  uid: 'admin-init',
  username: 'admin',
  password: 'admin123', 
  role: 'SUPER_SAINT',
  createdAt: Date.now()
};

export const db = {
  settings: {
    get: async (): Promise<AppSettings | null> => {
      if (!isSupabaseConfigured()) return null;
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('settings').select('*').single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error('Supabase Error (settings.get):', e);
        return null;
      }
    },
    update: async (settings: AppSettings): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;
      try {
        const supabase = getSupabase();
        const { error } = await supabase.from('settings').upsert({ id: 1, ...settings });
        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Supabase Error (settings.update):', e);
        return false;
      }
    }
  },
  users: {
    getAll: async (): Promise<UserAccount[]> => {
      if (!isSupabaseConfigured()) return [DEFAULT_ADMIN];
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        // If Supabase has users, don't return the hardcoded DEFAULT_ADMIN
        if (data && data.length > 0) return data;
        // Only return DEFAULT_ADMIN if the database is empty
        return [DEFAULT_ADMIN];
      } catch (e) {
        console.error('Supabase Error (users.getAll):', e);
        return [DEFAULT_ADMIN];
      }
    },
    add: async (user: UserAccount): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;
      try {
        const supabase = getSupabase();
        const userData = { ...user, uid: user.uid || Date.now().toString() };
        const { error } = await supabase.from('users').upsert(userData);
        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Supabase Error (users.add):', e);
        return false;
      }
    },
    register: async (user: Omit<UserAccount, 'uid' | 'createdAt' | 'role'>): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;
      try {
        const supabase = getSupabase();
        // Check if user exists
        const { data: existing } = await supabase.from('users').select('username').eq('username', user.username).maybeSingle();
        if (existing) return false;

        const { error } = await supabase.from('users').insert({
          uid: Date.now().toString(),
          username: user.username,
          password: user.password,
          role: 'REGULAR',
          createdAt: Date.now()
        });
        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Supabase Error (users.register):', e);
        return false;
      }
    },
    delete: async (uid: string): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;
      try {
        const supabase = getSupabase();
        const { error } = await supabase.from('users').delete().eq('uid', uid);
        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Supabase Error (users.delete):', e);
        return false;
      }
    }
  },
  patients: {
    getAll: async (): Promise<SavedPatient[]> => {
      if (!isSupabaseConfigured()) return [];
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error } = await supabase.from('patients').select('*').eq('authorUid', user.id);
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error('Supabase Error (patients.getAll):', e);
        return [];
      }
    },
    add: async (patient: SavedPatient) => {
      if (!isSupabaseConfigured()) return;
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const patientWithAuth = { ...patient, authorUid: user.id };
        const { error } = await supabase.from('patients').upsert(patientWithAuth);
        if (error) throw error;
      } catch (e) {
        console.error('Supabase Error (patients.add):', e);
      }
    },
    delete: async (id: string) => {
      if (!isSupabaseConfigured()) return;
      try {
        const supabase = getSupabase();
        const { error } = await supabase.from('patients').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Supabase Error (patients.delete):', e);
      }
    }
  }
};

