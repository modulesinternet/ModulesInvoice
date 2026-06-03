import React, { useState } from 'react';
import { User, Phone, Mail, Lock, Camera, Save, Shield, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface ProfileModuleProps {
  currentUser: UserProfile;
  onUpdateCurrentUser: (updated: UserProfile) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function ProfileModule({
  currentUser,
  onUpdateCurrentUser,
  showToast
}: ProfileModuleProps) {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [mobile, setMobile] = useState(currentUser.mobile || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // File reader for profile picture upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Profile image is too large. Please select an image under 2MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
        showToast("Profile image uploaded. Be sure to click Save to persist.", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Operator Name is a mandatory field.", "error");
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast("A valid corporate email address is required.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const updatedFields: any = {
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        avatarUrl: avatarUrl
      };
      if (password.trim() !== '') {
        updatedFields.password = password.trim();
      }

      // If running mock/local mode
      const response = await api.updateProfile(updatedFields);
      onUpdateCurrentUser(response);
      setPassword('');
      showToast("Security profile and details saved successfully!", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Could not update profile details.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="user-profile-view">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 tracking-tight">Your Operational Profile</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Manage your personal operator credentials and credentials clearance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Badge metadata, Identity and avatar picture */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 bg-slate-50 flex items-center justify-center shadow-md relative">
              {avatarUrl ? (
                <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar Preview" />
              ) : (
                <div className="w-full h-full bg-[#5B21FF] text-white font-extrabold text-4xl flex items-center justify-center font-display">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <label className="absolute bottom-1 right-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg border border-white cursor-pointer transition flex items-center justify-center">
              <Camera className="w-4 h-4" />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarChange} 
              />
            </label>
          </div>

          <div className="space-y-1.5 w-full">
            <h3 className="font-bold text-slate-800 text-base font-display">{name || 'Anonymous User'}</h3>
            <p className="text-xs text-slate-400 truncate tracking-wide">{email}</p>
            
            <div className="pt-2 flex items-center justify-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase tracking-wider">
                Clearance: {currentUser.role}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                currentUser.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-slate-50 text-slate-650'
              }`}>
                {currentUser.status}
              </span>
            </div>
          </div>

          <div className="w-full pt-4 border-t border-slate-100 text-left space-y-3">
            <div className="flex items-start gap-2.5">
              <Shield className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-slate-800">Clearance Lockout Bypasses</p>
                <p className="text-[10px] text-slate-450 leading-relaxed font-sans">
                  {currentUser.role === 'Admin' 
                    ? 'Your admin permissions cannot be restricted. Full administrative bypass authorized.' 
                    : 'Your module layout permissions are governed by role-based RBAC settings.'}
                </p>
              </div>
            </div>

            {avatarUrl && (
              <button
                type="button"
                onClick={() => {
                  setAvatarUrl('');
                  showToast("Profile image removed. Remember to click Save to persist.", "info");
                }}
                className="w-full py-1.5 mt-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 text-slate-600 rounded-xl text-[11px] font-bold transition"
              >
                Clear Avatar Photo
              </button>
            )}
          </div>
        </div>

        {/* Right column: Form details editing */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="border-b border-slate-150 border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono">Personal Identity Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wild font-mono block">Operator Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-250 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                    placeholder="E.g. Karan Sharma"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wild font-mono block">Corporate Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-250 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                    placeholder="username@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wild font-mono block">Mobile Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-250 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                    placeholder="E.g. +91 98765 43210"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wild font-mono block">Role Clearance (Read Only)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={currentUser.role}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed font-semibold block"
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-slate-150 border-slate-100 pb-4 pt-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono">Modify Portal Password</h3>
            </div>

            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wild font-mono block">New Security Password</label>
                <span className="text-[9.5px] italic text-slate-400 font-sans">Leave blank if unchanged</span>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-250 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="p-3 bg-[#5B21FF] hover:bg-[#4A1AD3] active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-indigo-200 disabled:opacity-50 transition select-none cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving details..." : "Save Profile Details"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
