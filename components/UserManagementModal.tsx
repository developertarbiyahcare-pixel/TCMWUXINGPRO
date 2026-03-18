
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, User, AlertCircle, Save, Settings, Database, Key, MapPin, Phone } from 'lucide-react';
import { UserAccount, AppSettings } from '../types';
import { db } from '../services/db';
import { getSupabase, isSupabaseConfigured } from '../supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

const UserManagementModal: React.FC<Props> = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'SUPER_SAINT' | 'SUPER_USER' | 'ADMIN' | 'REGULAR'>('REGULAR');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Settings state
  const [geminiKey, setGeminiKey] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');

  useEffect(() => {
    let channel: any;
    if (isOpen) {
      const fetchData = async () => {
        if (!isSupabaseConfigured()) {
          setUsers([currentUser]);
          return;
        }
        try {
          const supabase = getSupabase();
          const { data: userData, error: userError } = await supabase.from('users').select('*');
          if (!userError) setUsers(userData || []);

          const s = await db.settings.get();
          if (s) {
            setGeminiKey(s.geminiApiKey || '');
            setClinicName(s.clinicName || '');
            setClinicAddress(s.clinicAddress || '');
            setClinicPhone(s.clinicPhone || '');
          }
        } catch (e) {
          console.warn("Supabase fetch data skipped:", e);
        }
      };
      
      fetchData();

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabase();
          channel = supabase
            .channel('users_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
              fetchData();
            })
            .subscribe();
        } catch (e) {
          console.warn("Supabase real-time subscription skipped:", e);
        }
      }
    }
    return () => {
      if (channel && isSupabaseConfigured()) {
        try {
          const supabase = getSupabase();
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [isOpen]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newUsername.trim() || !newPassword.trim()) {
      setError('Username and password are required.');
      return;
    }

    const uid = Date.now().toString();
    
    // RBAC check for adding users
    if (currentUser.role !== 'SUPER_SAINT' && newRole !== 'REGULAR') {
      setError('Hanya SUPER SAINT USER yang bisa membuat akun dengan role tinggi.');
      return;
    }

    const result = await db.users.add({
      uid,
      username: newUsername.trim(),
      password: newPassword.trim(),
      role: newRole,
      createdAt: Date.now()
    });

    if (result) {
      setSuccessMsg(`User ${newUsername} added successfully.`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('REGULAR');
    } else {
      setError("Failed to add user.");
    }
  };

  const handleSaveSettings = async () => {
    setError('');
    setSuccessMsg('');
    const result = await db.settings.update({
      geminiApiKey: geminiKey,
      clinicName,
      clinicAddress,
      clinicPhone
    });
    if (result) {
      setSuccessMsg("Settings saved successfully.");
      window.location.reload(); // Reload to apply new API key and settings
    } else {
      setError("Failed to save settings.");
    }
  };

  const handleDelete = async (username: string, uid?: string, role?: string) => {
    if (username === currentUser.username) {
      setError("You cannot delete your own account.");
      return;
    }

    // RBAC check for deleting users
    if (currentUser.role !== 'SUPER_SAINT' && (role === 'SUPER_SAINT' || role === 'SUPER_USER' || role === 'ADMIN')) {
      setError("Hanya SUPER SAINT USER yang bisa menghapus akun dengan role tinggi.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;

    if (!uid) {
        setError("Cannot delete user without UID.");
        return;
    }

    const result = await db.users.delete(uid);
    if (result) {
      setSuccessMsg(`User ${username} deleted.`);
    } else {
      setError("Failed to delete user.");
    }
  };

  if (!isOpen) return null;

  const roleLabels: Record<string, string> = {
    SUPER_SAINT: 'SUPER SAINT USER',
    SUPER_USER: 'Super User',
    ADMIN: 'User Admin',
    REGULAR: 'Modul Biasa (Coba-coba)'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white border border-purple-100 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-100 bg-purple-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl border border-purple-200">
               <Shield className="w-6 h-6 text-tcm-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-purple-950 uppercase tracking-tighter">Master Control</h2>
              <p className="text-xs font-bold text-purple-500 uppercase tracking-widest">System Configuration & Access</p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-400 hover:text-purple-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 bg-purple-50/50 border-b border-purple-100">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'users' ? 'border-tcm-primary text-tcm-primary' : 'border-transparent text-purple-400 hover:text-purple-600'}`}
          >
            User Management
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'settings' ? 'border-tcm-primary text-tcm-primary' : 'border-transparent text-purple-400 hover:text-purple-600'}`}
          >
            System Settings
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           {error && (
              <div className="text-xs font-bold text-rose-500 flex items-center gap-2 bg-rose-50 p-3 rounded-xl border border-rose-100">
                 <AlertCircle className="w-4 h-4" /> {error}
              </div>
           )}
           {successMsg && (
              <div className="text-xs font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                 <AlertCircle className="w-4 h-4" /> {successMsg}
              </div>
           )}

           {activeTab === 'users' ? (
             <>
               {/* Add User Form */}
               <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 shadow-inner">
                  <h3 className="text-sm font-black text-tcm-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                     <UserPlus className="w-4 h-4" /> Add New User
                  </h3>
                  
                  <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                     <div>
                        <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Username</label>
                        <input 
                          type="text" 
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none shadow-sm transition-all"
                          placeholder="e.g. doctor1"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Password</label>
                        <input 
                          type="text" 
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none font-mono shadow-sm transition-all"
                          placeholder="Password"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Role</label>
                        <select 
                           value={newRole}
                           onChange={e => setNewRole(e.target.value as any)}
                           className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none shadow-sm transition-all"
                        >
                           <option value="REGULAR">Modul Biasa</option>
                           <option value="ADMIN">User Admin</option>
                           <option value="SUPER_USER">Super User</option>
                           <option value="SUPER_SAINT">SUPER SAINT USER</option>
                        </select>
                     </div>
                     <div>
                        <button type="submit" className="w-full bg-tcm-primary hover:brightness-110 active:scale-95 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-purple-900/20">
                           <Save className="w-4 h-4" /> Add User
                        </button>
                     </div>
                  </form>
               </div>

               {/* User List */}
               <div>
                  <h3 className="text-sm font-black text-purple-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" /> Registered Users ({users.length})
                  </h3>
                  <div className="border border-purple-100 rounded-2xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                     <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-purple-50 text-purple-500 font-black text-[10px] uppercase tracking-widest">
                           <tr>
                              <th className="px-6 py-4">Username</th>
                              <th className="px-6 py-4">Role</th>
                              <th className="px-6 py-4">Password</th>
                              <th className="px-6 py-4 text-right">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-50">
                           {users.map(u => (
                              <tr key={u.username} className="hover:bg-purple-50/50 transition-colors">
                                 <td className="px-6 py-4 font-bold text-purple-900 flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${u.role === 'SUPER_SAINT' ? 'bg-amber-100 text-amber-600' : u.role === 'SUPER_USER' ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-purple-100 text-purple-500'}`}>
                                      <User className="w-4 h-4" />
                                    </div>
                                    {u.username} 
                                    {u.username === currentUser.username && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md ml-2 font-black tracking-widest">YOU</span>}
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className={`text-[10px] px-3 py-1.5 rounded-lg uppercase font-black tracking-widest ${u.role === 'SUPER_SAINT' ? 'bg-amber-100 text-amber-700 border border-amber-200' : u.role === 'SUPER_USER' ? 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200' : 'bg-purple-100 text-purple-600 border border-purple-200'}`}>
                                       {roleLabels[u.role] || u.role}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 font-mono text-purple-400 text-xs">{u.password}</td>
                                 <td className="px-6 py-4 text-right">
                                    {u.username !== 'admin' && u.username !== currentUser.username && (
                                       <button 
                                          onClick={() => handleDelete(u.username, (u as any).uid, u.role)}
                                          className="text-purple-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all"
                                          title="Delete User"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
             </>
           ) : (
             <div className="space-y-6">
                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 space-y-4">
                  <h3 className="text-sm font-black text-tcm-primary uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4" /> Gemini AI Configuration
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Gemini API Key</label>
                    <input 
                      type="password" 
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none shadow-sm transition-all font-mono"
                      placeholder="Enter your Gemini API Key"
                    />
                    <p className="text-[10px] text-purple-400 mt-2 font-bold uppercase tracking-widest">Kunci ini digunakan untuk fitur Chat Diagnosa AI.</p>
                  </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 space-y-4">
                  <h3 className="text-sm font-black text-tcm-primary uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4" /> Clinic Information (Invoice)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Clinic Name</label>
                      <input 
                        type="text" 
                        value={clinicName}
                        onChange={e => setClinicName(e.target.value)}
                        className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none shadow-sm transition-all"
                        placeholder="TCM Clinic Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
                        <input 
                          type="text" 
                          value={clinicPhone}
                          onChange={e => setClinicPhone(e.target.value)}
                          className="w-full bg-white border border-purple-200 rounded-xl px-12 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none shadow-sm transition-all"
                          placeholder="+62..."
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3 w-4 h-4 text-purple-300" />
                      <textarea 
                        value={clinicAddress}
                        onChange={e => setClinicAddress(e.target.value)}
                        rows={3}
                        className="w-full bg-white border border-purple-200 rounded-xl px-12 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none shadow-sm transition-all resize-none"
                        placeholder="Clinic Address"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveSettings}
                  className="w-full bg-tcm-primary hover:brightness-110 active:scale-95 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-xl shadow-purple-900/20"
                >
                  <Save className="w-5 h-5" /> Save All Settings
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementModal;
