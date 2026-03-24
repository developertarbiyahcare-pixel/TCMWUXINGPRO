
import { UserAccount } from '../types';
import { db } from './db';
import { getSupabase, isSupabaseConfigured } from '../supabase';

// Ensure DB is initialized
export const getUsers = async (): Promise<UserAccount[]> => {
  return await db.users.getAll();
};

export const saveUser = async (user: UserAccount): Promise<{ success: boolean, message: string }> => {
  // Simple validation
  if (!user.username || !user.password) {
      return { success: false, message: 'Username and password are required.' };
  }
  
  const success = await db.users.add(user);
  if (success) {
      return { success: true, message: 'User successfully saved to database.' };
  } else {
      return { success: false, message: 'Username already exists.' };
  }
};

export const deleteUser = async (username: string): Promise<{ success: boolean, message: string }> => {
  if (username === 'admin') {
      return { success: false, message: 'Cannot delete the main admin account.' };
  }
  
  const success = await db.users.delete(username);
  if (success) {
      return { success: true, message: 'User deleted from database.' };
  } else {
      return { success: false, message: 'User not found.' };
  }
};

export const login = async (email: string, password: string): Promise<UserAccount | null> => {
  if (!isSupabaseConfigured()) {
    // Fallback to local/custom DB if Supabase is not configured
    const users = await getUsers();
    const user = users.find(u => u.username === email && u.password === password);
    return user || null;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      return {
        uid: data.user.id,
        username: data.user.user_metadata.full_name || data.user.email || 'User',
        password: '', // Don't store password in memory
        role: data.user.user_metadata.role || 'REGULAR',
        createdAt: new Date(data.user.created_at).getTime()
      };
    }
    return null;
  } catch (e: any) {
    console.error("Supabase Login Error:", e);
    // Fallback to custom DB for legacy accounts if needed, 
    // but usually we want to stick to Supabase Auth now.
    const users = await getUsers();
    const user = users.find(u => u.username === email && u.password === password);
    return user || null;
  }
};

export const register = async (email: string, password: string, fullName: string): Promise<{ success: boolean, message: string }> => {
  if (!isSupabaseConfigured()) {
    const ok = await db.users.register({ username: email, password });
    return ok ? { success: true, message: 'Registrasi berhasil!' } : { success: false, message: 'Registrasi gagal.' };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'REGULAR'
        }
      }
    });

    if (error) throw error;
    
    if (data.user) {
      // Also add to our custom users table for management if needed
      await db.users.add({
        uid: data.user.id,
        username: fullName || email,
        password: '', // Don't store password
        role: 'REGULAR',
        createdAt: Date.now()
      });
      return { success: true, message: 'Registrasi berhasil! Silakan cek email Anda untuk konfirmasi (jika diaktifkan).' };
    }
    return { success: false, message: 'Terjadi kesalahan saat registrasi.' };
  } catch (e: any) {
    console.error("Supabase Register Error:", e);
    return { success: false, message: e.message || 'Terjadi kesalahan saat registrasi.' };
  }
};
