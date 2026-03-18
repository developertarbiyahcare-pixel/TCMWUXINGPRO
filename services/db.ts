
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
      // Try local first for speed, then sync with Supabase
      const local = localStorage.getItem('tcm_app_settings');
      const localData = local ? JSON.parse(local) : null;

      if (!isSupabaseConfigured()) {
        if (localData && !localData.geminiApiKeys) {
          localData.geminiApiKeys = [];
        }
        return localData;
      }

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('settings').select('*').maybeSingle();
        if (error) throw error;
        
        // Sync local with remote
        if (data) {
          // Ensure geminiApiKeys exists even if column is missing in DB (though upsert would fail)
          const mergedData = {
            ...data,
            geminiApiKeys: data.geminiApiKeys || []
          };
          localStorage.setItem('tcm_app_settings', JSON.stringify(mergedData));
          return mergedData;
        }
        
        if (localData && !localData.geminiApiKeys) {
          localData.geminiApiKeys = [];
        }
        return localData;
      } catch (e) {
        console.error('Supabase Error (settings.get):', e);
        if (localData && !localData.geminiApiKeys) {
          localData.geminiApiKeys = [];
        }
        return localData;
      }
    },
    update: async (settings: AppSettings): Promise<{ success: boolean; error?: string }> => {
      console.log('DB: Attempting settings update', settings);
      
      try {
        // 1. Save to Local Storage first
        const settingsString = JSON.stringify(settings);
        localStorage.setItem('tcm_app_settings', settingsString);
        
        // Verify local save
        const verified = localStorage.getItem('tcm_app_settings');
        if (verified !== settingsString) {
          console.error('DB: LocalStorage verification failed!');
          return { success: false, error: "Local storage write failed. Your browser might be blocking storage." };
        }
        console.log('DB: LocalStorage save verified');

        // 2. Try Supabase if configured
        if (!isSupabaseConfigured()) {
          console.log('DB: Supabase not configured, using LocalStorage only.');
          return { success: true };
        }

        const supabase = getSupabase();
        const payload = { 
          id: 1, 
          geminiApiKey: settings.geminiApiKey,
          geminiApiKeys: settings.geminiApiKeys,
          clinicName: settings.clinicName,
          clinicAddress: settings.clinicAddress,
          clinicPhone: settings.clinicPhone
        };

        console.log('DB: Sending to Supabase', payload);
        const { error } = await supabase.from('settings').upsert(payload);
        
        if (error) {
          console.error('DB: Supabase Upsert Error', error);
          // We return success: true because LocalStorage worked, but we warn about the DB
          return { 
            success: true, 
            error: `Saved locally, but Cloud Sync failed: ${error.message}. Please check if the "settings" table has a "geminiApiKeys" column.` 
          };
        }

        console.log('DB: Supabase sync successful');
        return { success: true };
      } catch (e: any) {
        console.error('DB: Critical error in settings.update', e);
        return { success: false, error: e.message || "An unexpected error occurred while saving." };
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

