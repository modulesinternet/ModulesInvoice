import React, { useState, useRef } from 'react';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  CreditCard, 
  Signature, 
  Save, 
  CheckCircle2, 
  Globe2,
  Lock,
  Edit2,
  UploadCloud,
  Link,
  FileImage,
  Sparkles,
  RefreshCw,
  Image
} from 'lucide-react';
import { BusinessSettings } from '../types';
import SignaturePad from './SignaturePad';

interface SettingsModuleProps {
  settings: BusinessSettings;
  onSaveSettings: (settings: Partial<BusinessSettings>) => Promise<void>;
}

export default function SettingsModule({
  settings,
  onSaveSettings
}: SettingsModuleProps) {
  const [success, setSuccess] = useState(false);

  // Form parameters
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [gstIn, setGstIn] = useState(settings.gstIn);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [bankName, setBankName] = useState(settings.bankName);
  const [accountNum, setAccountNum] = useState(settings.accountNum);
  const [ifscCode, setIfscCode] = useState(settings.ifscCode);
  const [upiId, setUpiId] = useState(settings.upiId);
  const [signatureUrl, setSignatureUrl] = useState(settings.signatureUrl);
  const [timezone, setTimezone] = useState(settings.timezone || 'Asia/Kolkata');
  const [gstOption, setGstOption] = useState(settings.gstOption || 'standard');

  const [sigMode, setSigMode] = useState<'draw' | 'upload' | 'link'>(() => {
    if (settings.signatureUrl && settings.signatureUrl.startsWith('data:image')) {
      return 'draw';
    }
    return settings.signatureUrl ? 'link' : 'draw';
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !gstIn || !bankName || !accountNum || !ifscCode || !upiId) {
      alert("All specified settings parameters must be fully documented!");
      return;
    }

    const payload: Partial<BusinessSettings> = {
      companyName,
      gstIn: gstIn.toUpperCase(),
      address,
      phone,
      email,
      bankName,
      accountNum,
      ifscCode: ifscCode.toUpperCase(),
      upiId,
      signatureUrl,
      timezone,
      gstOption
    };

    await onSaveSettings(payload);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6" id="settings-module-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Business Settings</h1>
          <p className="text-sm text-slate-500 font-sans">Document system tax identities, bank sweep accounts, timezone and active taxation modes (GST options).</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: PRIMARY PROFILE */}
        <div className="lg:col-span-2 space-y-6">
          {/* Box 1: Corporate Profile */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm font-display border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Corporate Branding &amp; Tax Registration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Registered Firm Name</label>
                <input 
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-sans">Corporate GSTIN Identification</label>
                <input 
                  type="text"
                  required
                  maxLength={15}
                  value={gstIn}
                  onChange={(e) => setGstIn(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Registered Address</label>
              <textarea 
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Firm Email Desk</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Firm Telephone</label>
                <input 
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* Box 1.5: Localization & Taxation Preference */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm font-display border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-indigo-500" />
              <span>Localization &amp; GST Taxation Setup</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">System Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (Indian Standard Time - GMT+5:30)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT - GMT+8:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
                <p className="text-[10px] text-slate-400 font-sans">Applies India/Kolkata standard time layout to log entries, activity registries, and reporting calendars.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">GST Taxation Mode</label>
                <select
                  value={gstOption}
                  onChange={(e) => setGstOption(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="standard">Standard GST (CGST/SGST/IGST Active)</option>
                  <option value="zero_tax">0% GST Setup (No Tax displayed on Invoices)</option>
                </select>
                <p className="text-[10px] text-slate-400 font-sans">Selecting 0% GST overrides all billing lines to be tax-free and completely hides all tax calculations & columns on invoices.</p>
              </div>
            </div>
          </div>

          {/* Box 2: Banking Particulars */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm font-display border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span>Banking Account Settlements Details</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</label>
                <input 
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">IFSC Routing Code</label>
                <input 
                  type="text"
                  required
                  maxLength={11}
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Account Number</label>
                <input 
                  type="text"
                  required
                  value={accountNum}
                  onChange={(e) => setAccountNum(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">VPA / BHIM UPI ID</label>
                <input 
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ADDITIONAL & SIGNATURE */}
        <div className="space-y-6">
          {/* Box 3: Stamp & Signatures */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="font-bold text-slate-900 text-sm font-display flex items-center gap-2">
                <Signature className="w-4 h-4 text-indigo-500" />
                <span>Authorized Business Signature</span>
              </h3>
            </div>

            {/* TAB CONTAINER */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSigMode('draw')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer select-none ${
                  sigMode === 'draw'
                    ? 'bg-white text-indigo-600 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Draw (Drag)</span>
              </button>
              <button
                type="button"
                onClick={() => setSigMode('upload')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer select-none ${
                  sigMode === 'upload'
                    ? 'bg-white text-indigo-600 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setSigMode('link')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer select-none ${
                  sigMode === 'link'
                    ? 'bg-white text-indigo-600 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Link className="w-3.5 h-3.5" />
                <span>Image URL</span>
              </button>
            </div>

            {/* TAB PANELS */}
            <div className="space-y-4">
              {sigMode === 'draw' && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-medium">Use your cursor, trackpad, or touch screen inside the canvas box below to record signature strokes.</p>
                  <SignaturePad 
                    value={signatureUrl}
                    onChange={(val) => setSignatureUrl(val)}
                  />
                </div>
              )}

              {sigMode === 'upload' && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-medium">Upload a transparent PNG, JPG, or SVG containing your corporate signature/stamp.</p>
                  
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setSignatureUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-50/40' 
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      const input = document.getElementById('signature-file-upload');
                      if (input) input.click();
                    }}
                  >
                    <input
                      id="signature-file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setSignatureUrl(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-indigo-600 animate-bounce' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Drag &amp; drop signature files here</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">or click to browse your desktop files</p>
                    </div>
                  </div>
                </div>
              )}

              {sigMode === 'link' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-400 font-medium">Link any globally public image address containing a valid signature glyph/stamp mark.</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Image Link Reference (HTTPS)</label>
                    <div className="relative">
                      <input 
                        type="url"
                        placeholder="https://example.com/signature.png"
                        value={signatureUrl}
                        onChange={(e) => setSignatureUrl(e.target.value)}
                        className="w-full text-xs p-2.5 pl-9 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-[#1e1b4b]"
                      />
                      <Link className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE DIGITAL GRAPHICS PREVIEW OUTCOMES */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <FileImage className="w-3.5 h-3.5 text-slate-500" />
                    <span>Real-Time Output Preview</span>
                  </label>
                  {signatureUrl && (
                    <button
                      type="button"
                      onClick={() => setSignatureUrl('')}
                      className="text-[9px] font-bold text-rose-500 hover:text-rose-600 transition cursor-pointer flex items-center gap-0.5"
                    >
                      Remove Stamp Signature
                    </button>
                  )}
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-center h-24 relative overflow-hidden transition select-none">
                  {signatureUrl ? (
                    <img 
                      src={signatureUrl} 
                      className="max-h-16 w-auto object-contain cursor-zoom-in animate-fade-in" 
                      alt="Stamp signature preview" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <Signature className="w-8 h-8" strokeWidth={1} />
                      <span className="text-[10px] font-medium text-slate-400 font-sans mt-1">No signature registered yet</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save panel */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4">
            <div>
              <span className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">firm locks state</span>
              <h4 className="font-bold text-sm text-slate-150 mt-1">Audit Ledger Integrity</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Updating profile configurations commits instant log alerts onto the double-entry security indexes.</p>
            </div>

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold leading-none select-none">
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                <span>Firm profiles updated successfully</span>
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-white text-slate-900 hover:bg-slate-50 transition rounded-xl text-xs font-bold font-display shadow-md flex items-center justify-center gap-2 cursor-pointer"
              id="save-settings-btn"
            >
              <Save className="w-4 h-4 text-indigo-600" />
              <span>Commit System Parameters</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
