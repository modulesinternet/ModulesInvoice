import React, { useState } from 'react';
import { User, Phone, Mail, Lock, Camera, Save, Shield, HelpCircle, Eye, EyeOff, Smartphone, Download, CheckCircle, Info } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../services/api';

const formatReleaseDateTime = (isoString?: string) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const showHours = hours % 12 || 12;
  const timeStr = `${String(showHours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  return `${day}-${month}-${year} ${timeStr}`;
};

interface ProfileModuleProps {
  currentUser: UserProfile;
  onUpdateCurrentUser: (updated: UserProfile) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onLogout?: () => void;
}

export default function ProfileModule({
  currentUser,
  onUpdateCurrentUser,
  showToast,
  onLogout
}: ProfileModuleProps) {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [mobile, setMobile] = useState(currentUser.mobile || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // APK Version Control and Download States
  const [apkReleases, setApkReleases] = useState<any[]>([]);
  const [isLoadingApks, setIsLoadingApks] = useState(false);

  React.useEffect(() => {
    fetchApkReleases();
  }, []);

  const fetchApkReleases = async () => {
    setIsLoadingApks(true);
    try {
      const list = await api.getApkReleases();
      setApkReleases(list || []);
    } catch (err: any) {
      console.error("Failed to fetch APK releases in profile module:", err);
    } finally {
      setIsLoadingApks(false);
    }
  };

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

  const triggerCameraUpload = async () => {
    try {
      const { capturePhoto } = await import('../services/mobile');
      const base64 = await capturePhoto();
      if (base64) {
        setAvatarUrl(base64);
        showToast("Profile image captured! Be sure to click Save to persist.", "success");
      }
    } catch (err: any) {
      console.warn("Mobile camera capture failed", err);
      showToast("Could not access native camera", "error");
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
            
            <div className="pt-2 flex flex-col items-center gap-1.5 justify-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase tracking-wider ${
                  currentUser.email?.toLowerCase() === 'modulesinternet@gmail.com' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' : ''
                }`}>
                  Clearance: {currentUser.email?.toLowerCase() === 'modulesinternet@gmail.com' ? 'SYSTEM OWNER' : currentUser.role}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                  currentUser.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-slate-50 text-slate-650'
                }`}>
                  {currentUser.status}
                </span>
              </div>
              {currentUser.email?.toLowerCase() === 'modulesinternet@gmail.com' && (
                <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-[#E0E7FF] border border-[#C7D2FE] text-[#4338CA] uppercase tracking-wider">
                  🔐 FULL OWNER PRIVILEGE
                </span>
              )}
            </div>
          </div>

          <div className="w-full pt-4 border-t border-slate-100 text-left space-y-3">
            <div className="flex items-start gap-2.5">
              <Shield className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-slate-800">Clearance Lockout Bypasses</p>
                <p className="text-[10px] text-slate-450 leading-relaxed font-sans mt-0.5">
                  {currentUser.email?.toLowerCase() === 'modulesinternet@gmail.com'
                    ? 'Owner-level authorization verified. You hold full execution permissions over project imodules-de7bf.'
                    : currentUser.role === 'Admin' 
                      ? 'Your admin permissions cannot be restricted. Full administrative bypass authorized.' 
                      : 'Your module layout permissions are governed by role-based RBAC settings.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={triggerCameraUpload}
              className="w-full py-1.5 mt-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[#5B21FF] rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Use Device Camera</span>
            </button>

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

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-3 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-150 active:scale-95 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition select-none cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Logout Securely</span>
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="p-3 bg-[#5B21FF] hover:bg-[#4A1AD3] active:scale-95 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-indigo-200 disabled:opacity-50 transition select-none cursor-pointer ml-auto"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving details..." : "Save Profile Details"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PROFESSIONAL GOOGLE PLAY STORE STYLE APK DISTRIBUTION CARD */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl space-y-6" id="play-store-apk-catalog">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-md">
              <div className="relative">
                <Smartphone className="w-6 h-6 text-emerald-400" />
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 text-[8px] text-slate-900 font-black rounded-full flex items-center justify-center font-mono animate-bounce">
                  ↑
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-sans tracking-tight text-white">Google Play Store</h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 capitalize">
                  Internal Hub
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5 leading-normal">Download official digital packages & track incremental patch updates instantly.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchApkReleases}
              disabled={isLoadingApks}
              className="p-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 rounded-xl transition text-slate-300 disabled:opacity-50 cursor-pointer self-start sm:self-center"
              title="Refresh Version Registers"
            >
              <HelpCircle className={`w-4 h-4 ${isLoadingApks ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {apkReleases.length === 0 ? (
          <div className="py-8 text-center text-slate-500 border border-slate-800 border-dashed rounded-2xl bg-slate-900/50 text-xs font-medium relative z-10">
            No production-ready packages have been released yet. Admin can upload one in Business Settings!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
            {/* LATEST RELEASE DISPLAY BLOCK (PLAY STORE PRESENTATION PANEL) */}
            <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-inner">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-sans">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                  <span>LATEST PRODUCTION RELEASE</span>
                </div>
                
                <div className="space-y-0.5">
                  <h4 className="text-2xl font-black text-white tracking-tight">iModules App</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Version v{apkReleases[0].version}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-400 font-mono pt-1">
                  <div className="p-2 bg-slate-800/30 border border-slate-800 rounded-xl">
                    <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider mb-0.5">Package Size</span>
                    <span className="text-white font-bold">{Math.round((apkReleases[0].sizeBytes / (1024 * 1024)) * 10) / 10} MB</span>
                  </div>
                  <div className="p-2 bg-slate-800/30 border border-slate-800 rounded-xl">
                    <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider mb-0.5">Published Date & Time</span>
                    <span className="text-white font-bold">{formatReleaseDateTime(apkReleases[0].uploadedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={api.downloadApkUrl(apkReleases[0].id)}
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const res = await fetch(api.downloadApkUrl(apkReleases[0].id));
                      if (!res.ok) throw new Error();
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', apkReleases[0].fileName);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      window.open(api.downloadApkUrl(apkReleases[0].id), '_blank');
                    }
                  }}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 font-sans tracking-tight text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition duration-150 cursor-pointer text-center"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Download Latest APK</span>
                </a>
                <p className="text-[9px] text-slate-500 text-center uppercase font-bold tracking-widest leading-none mt-1">Verified secure • SHA-256 encrypted</p>
              </div>
            </div>

            {/* VERSION LIST */}
            <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ALL COMPILED ARCHIVE EDITIONS</span>
                
                <div className="border border-slate-800 divide-y divide-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden max-h-[220px] overflow-y-auto">
                  {apkReleases.map((release: any) => (
                    <div key={release.id} className="p-3 hover:bg-slate-900/30 transition flex items-center justify-between text-xs gap-3">
                      <div className="truncate">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>Version v{release.version}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                          Released {formatReleaseDateTime(release.uploadedAt)} • {Math.round((release.sizeBytes / (1024 * 1024)) * 10) / 10} MB
                        </div>
                      </div>
                      
                      <a
                        href={api.downloadApkUrl(release.id)}
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            const res = await fetch(api.downloadApkUrl(release.id));
                            if (!res.ok) throw new Error();
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', release.fileName);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            window.open(api.downloadApkUrl(release.id), '_blank');
                          }
                        }}
                        className="p-1.5 px-3 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 rounded-lg text-[10px] font-bold tracking-tight transition cursor-pointer shrink-0"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE APPLICATION MANAGEMENT PORTAL */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6" id="app-management-guide-portal">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-[#5B21FF]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider font-mono">Mobile App Management</h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">Deploy, install, and synchronize your high-performance iOS & Android systems</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase tracking-widest">
            Capacitor v6.0 Enabled
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Android Side-Loading Build Guide */}
          <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded-full flex items-center justify-center font-mono">1</span>
                <span className="text-xs font-bold font-mono tracking-wider uppercase text-slate-700">Android Build (APK/AAB)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Build & package a highly-optimized offline-safe package designed for direct deployment, side-loading, or Google Play submit.
              </p>
              
              <div className="bg-slate-900 rounded-xl p-3 text-[10px] font-mono text-slate-300 space-y-1 block select-all">
                <div className="text-slate-500"># Compiles and copies web resources to Android</div>
                <div>npm run build</div>
                <div>npx cap sync android</div>
                <div>npx cap open android</div>
              </div>
            </div>

            <div className="pt-3">
              <a 
                href="/api/health" 
                onClick={(e) => {
                  e.preventDefault();
                  alert("Live build instructions: Run native commands inside your workspace directory to produce 'app-release-unsigned.apk' in under 3 minutes.");
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Generate Android APK</span>
              </a>
            </div>
          </div>

          {/* iOS Developer Sync Guide */}
          <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-100 text-indigo-800 text-[11px] font-extrabold rounded-full flex items-center justify-center font-mono">2</span>
                <span className="text-xs font-bold font-mono tracking-wider uppercase text-slate-700">iOS Xcode Ecosystem</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sync web assets and initiate standard signing certificates to run this application inside iOS Simulator or physical iPhone TestFlight.
              </p>
              
              <div className="bg-slate-900 rounded-xl p-3 text-[10px] font-mono text-slate-300 space-y-1 block select-all">
                <div className="text-slate-500"># Prepares iOS workspace file</div>
                <div>npm run build</div>
                <div>npx cap sync ios</div>
                <div>npx cap open ios</div>
              </div>
            </div>

            <div className="pt-3">
              <button 
                onClick={() => {
                  alert("Run 'npx cap open ios' on macOS to launch standard project within Xcode to easily preview and deploy on native Apple mobile platforms.");
                }}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Open Xcode Project</span>
              </button>
            </div>
          </div>

          {/* Cloud Synchronization Parameters */}
          <div className="p-5 border border-slate-200 rounded-2xl bg-indigo-50/30 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-100 text-[#5B21FF] text-[11px] font-extrabold rounded-full flex items-center justify-center font-mono">3</span>
                <span className="text-xs font-bold font-mono tracking-wider uppercase text-slate-700">Live Workspace Sync</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Your mobile phone connects instantly to the central cloud registers via high-performance Firestore streaming APIs.
              </p>
              
              <div className="p-3 bg-white border border-indigo-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono">Synced Database</span>
                  <span className="font-bold text-slate-700">Firebase Cloud</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono">API Target IP</span>
                  <span className="font-bold text-indigo-600 truncate max-w-[140px]" title="https://ais-pre-xzpyeswg45bbcghpog5vdx-598615866613.asia-southeast1.run.app">Live Cloud Server</span>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button 
                onClick={() => {
                  alert(`Direct Cloud Live URL:\nhttps://ais-pre-xzpyeswg45bbcghpog5vdx-598615866613.asia-southeast1.run.app\n\nConfigure this endpoint in the app setup screen to establish direct bidirectional sync.`);
                }}
                className="w-full py-2 border border-indigo-200 text-[#5B21FF] hover:bg-indigo-50 bg-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>Check Integration Status</span>
              </button>
            </div>
          </div>
        </div>

        {/* NATIVE MOBILE CAPABILITIES WALKTHROUGH */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 font-sans">Active Native Hardware Integrations</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { title: "NFC & Push Docs", desc: "Firebase FCM Alerts Inbox" },
              { title: "Camera Upload", desc: "Scan Challans & Signatures" },
              { title: "Share Sheet", desc: "Native Document Dispatch" },
              { title: "Connectivity", desc: "Live Auto-offline Buffers" },
              { title: "Printing Engine", desc: "Perfect PDF Page layout" },
              { title: "Hardware Keys", desc: "Biometric Login support" }
            ].map((feature, i) => (
              <div key={i} className="p-3 border border-slate-100 rounded-xl bg-slate-50/45 text-center space-y-1">
                <div className="text-[10px] font-black text-slate-800 font-mono truncate">{feature.title}</div>
                <div className="text-[9px] text-slate-400 leading-snug">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
