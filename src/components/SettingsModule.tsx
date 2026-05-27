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
  Image,
  Database,
  Download
} from 'lucide-react';
import { BusinessSettings } from '../types';
import SignaturePad from './SignaturePad';
import { api } from '../services/api';

interface SettingsModuleProps {
  settings: BusinessSettings;
  onSaveSettings: (settings: Partial<BusinessSettings>) => Promise<void>;
  onImportBackup?: (backup: any) => Promise<void>;
}

export default function SettingsModule({
  settings,
  onSaveSettings,
  onImportBackup
}: SettingsModuleProps) {
  const [success, setSuccess] = useState(false);

  // Form parameters
  const [companyName, setCompanyName] = useState(settings?.companyName || '');
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(settings?.faviconUrl || '');
  const [gstIn, setGstIn] = useState(settings?.gstIn || '');
  const [address, setAddress] = useState(settings?.address || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  const [bankName, setBankName] = useState(settings?.bankName || '');
  const [accountNum, setAccountNum] = useState(settings?.accountNum || '');
  const [ifscCode, setIfscCode] = useState(settings?.ifscCode || '');
  const [upiId, setUpiId] = useState(settings?.upiId || '');
  const [signatureUrl, setSignatureUrl] = useState(settings?.signatureUrl || '');
  const [timezone, setTimezone] = useState(settings?.timezone || 'Asia/Kolkata');
  const [gstOption, setGstOption] = useState(settings?.gstOption || 'standard');
  const [titleBarText, setTitleBarText] = useState(settings?.titleBarText || '');
  const [invoicePrefix, setInvoicePrefix] = useState(settings?.invoicePrefix || 'INV-');
  const [quotationPrefix, setQuotationPrefix] = useState(settings?.quotationPrefix || 'EST-');
  const [invoiceTheme, setInvoiceTheme] = useState<'navy' | 'minimal' | 'emerald'>(settings?.invoiceTheme || 'navy');
  const [moharSize, setMoharSize] = useState<number>(settings?.moharSize || 40);

  // Field/Section Level Visibility States
  const [showInvoiceGst, setShowInvoiceGst] = useState<boolean>(settings?.showInvoiceGst ?? true);
  const [showInvoiceLogo, setShowInvoiceLogo] = useState<boolean>(settings?.showInvoiceLogo ?? true);
  const [showInvoicePhone, setShowInvoicePhone] = useState<boolean>(settings?.showInvoicePhone ?? true);
  const [showInvoiceEmail, setShowInvoiceEmail] = useState<boolean>(settings?.showInvoiceEmail ?? true);
  const [showInvoiceAddress, setShowInvoiceAddress] = useState<boolean>(settings?.showInvoiceAddress ?? true);
  const [showInvoiceClientAddress, setShowInvoiceClientAddress] = useState<boolean>(settings?.showInvoiceClientAddress ?? true);
  const [showInvoiceClientPhone, setShowInvoiceClientPhone] = useState<boolean>(settings?.showInvoiceClientPhone ?? true);
  const [showInvoiceClientEmail, setShowInvoiceClientEmail] = useState<boolean>(settings?.showInvoiceClientEmail ?? true);
  const [showInvoiceClientGst, setShowInvoiceClientGst] = useState<boolean>(settings?.showInvoiceClientGst ?? true);
  const [showInvoiceHsn, setShowInvoiceHsn] = useState<boolean>(settings?.showInvoiceHsn ?? true);
  const [showInvoiceTaxSplit, setShowInvoiceTaxSplit] = useState<boolean>(settings?.showInvoiceTaxSplit ?? true);
  const [showInvoiceBankDetails, setShowInvoiceBankDetails] = useState<boolean>(settings?.showInvoiceBankDetails ?? true);
  const [showInvoiceUpiId, setShowInvoiceUpiId] = useState<boolean>(settings?.showInvoiceUpiId ?? true);
  const [showInvoiceQrCode, setShowInvoiceQrCode] = useState<boolean>(settings?.showInvoiceQrCode ?? true);
  const [showInvoiceSignature, setShowInvoiceSignature] = useState<boolean>(settings?.showInvoiceSignature ?? true);
  const [showInvoiceNotes, setShowInvoiceNotes] = useState<boolean>(settings?.showInvoiceNotes ?? true);

  // Synchronize internal state when settings prop updates (important when loaded after mounting)
  React.useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || '');
      setLogoUrl(settings.logoUrl || '');
      setFaviconUrl(settings.faviconUrl || '');
      setGstIn(settings.gstIn || '');
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setBankName(settings.bankName || '');
      setAccountNum(settings.accountNum || '');
      setIfscCode(settings.ifscCode || '');
      setUpiId(settings.upiId || '');
      setSignatureUrl(settings.signatureUrl || '');
      setTimezone(settings.timezone || 'Asia/Kolkata');
      setGstOption(settings.gstOption || 'standard');
      setTitleBarText(settings.titleBarText || '');
      setInvoicePrefix(settings.invoicePrefix || 'INV-');
      setQuotationPrefix(settings.quotationPrefix || 'EST-');
      setInvoiceTheme(settings.invoiceTheme || 'navy');
      setMoharSize(settings.moharSize || 40);
      setShowInvoiceGst(settings.showInvoiceGst ?? true);
      setShowInvoiceLogo(settings.showInvoiceLogo ?? true);
      setShowInvoicePhone(settings.showInvoicePhone ?? true);
      setShowInvoiceEmail(settings.showInvoiceEmail ?? true);
      setShowInvoiceAddress(settings.showInvoiceAddress ?? true);
      setShowInvoiceClientAddress(settings.showInvoiceClientAddress ?? true);
      setShowInvoiceClientPhone(settings.showInvoiceClientPhone ?? true);
      setShowInvoiceClientEmail(settings.showInvoiceClientEmail ?? true);
      setShowInvoiceClientGst(settings.showInvoiceClientGst ?? true);
      setShowInvoiceHsn(settings.showInvoiceHsn ?? true);
      setShowInvoiceTaxSplit(settings.showInvoiceTaxSplit ?? true);
      setShowInvoiceBankDetails(settings.showInvoiceBankDetails ?? true);
      setShowInvoiceUpiId(settings.showInvoiceUpiId ?? true);
      setShowInvoiceQrCode(settings.showInvoiceQrCode ?? true);
      setShowInvoiceSignature(settings.showInvoiceSignature ?? true);
      setShowInvoiceNotes(settings.showInvoiceNotes ?? true);
    }
  }, [settings]);

  const compressImage = (
    fileOrBase64: File | string,
    maxWidth: number,
    maxHeight: number,
    quality: number = 0.8
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const isPng = typeof fileOrBase64 === 'string' 
          ? fileOrBase64.startsWith('data:image/png') 
          : fileOrBase64.type === 'image/png';

        const format = isPng ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(format, isPng ? undefined : quality));
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };

      if (typeof fileOrBase64 === 'string') {
        img.src = fileOrBase64;
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(fileOrBase64);
      }
    });
  };

  const processImageUpload = async (
    file: File,
    setter: (val: string) => void,
    maxWidth: number,
    maxHeight: number
  ) => {
    try {
      const compressedBase64 = await compressImage(file, maxWidth, maxHeight);
      setter(compressedBase64);
    } catch (err: any) {
      console.error("Optimization failed: ", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [sigMode, setSigMode] = useState<'draw' | 'upload' | 'link'>(() => {
    if (settings?.signatureUrl && settings.signatureUrl.startsWith('data:image')) {
      return 'draw';
    }
    return settings?.signatureUrl ? 'link' : 'draw';
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) {
      alert("Registered Firm Name is a required setting!");
      return;
    }

    try {
      const payload: Partial<BusinessSettings> = {
        companyName,
        gstIn: gstIn ? gstIn.toUpperCase() : '',
        address,
        phone,
        email,
        bankName,
        accountNum,
        ifscCode: ifscCode ? ifscCode.toUpperCase() : '',
        upiId,
        signatureUrl,
        timezone,
        gstOption,
        logoUrl,
        faviconUrl,
        titleBarText,
        invoicePrefix,
        quotationPrefix,
        invoiceTheme,
        moharSize: Number(moharSize || 40),
        showInvoiceGst,
        showInvoiceLogo,
        showInvoicePhone,
        showInvoiceEmail,
        showInvoiceAddress,
        showInvoiceClientAddress,
        showInvoiceClientPhone,
        showInvoiceClientEmail,
        showInvoiceClientGst,
        showInvoiceHsn,
        showInvoiceTaxSplit,
        showInvoiceBankDetails,
        showInvoiceUpiId,
        showInvoiceQrCode,
        showInvoiceSignature,
        showInvoiceNotes
      };

      await onSaveSettings(payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert("Error saving settings: " + (err.message || err));
    }
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

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase font-sans">Registered Firm Name</label>
              <input 
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            {/* Logo and Favicon uploads with previews and drag-and-drop triggers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-sans tracking-wider flex items-center justify-between">
                  <span>Firm Corporate Logo</span>
                  <span className="text-[8.5px] text-indigo-650 lowercase italic">Supports Drag-and-Drop</span>
                </label>
                <div 
                  className={`border-2 border-dashed rounded-2xl p-4 transition duration-200 flex flex-col items-center justify-center text-center space-y-2.5 ${
                    isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processImageUpload(file, setLogoUrl, 400, 150);
                    }
                  }}
                >
                  {logoUrl ? (
                    <div className="relative p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center h-20 w-36 shadow-xs group">
                      <img 
                        src={logoUrl} 
                        className="max-h-full max-w-full object-contain rounded-lg" 
                        alt="Logo preview" 
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogoUrl('');
                        }}
                        className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md transition font-bold cursor-pointer"
                        title="Remove Logo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2">
                      <Image className="w-8 h-8 text-slate-400 mb-1" />
                      <p className="text-[11px] text-slate-500">Drag &amp; drop logo file, or</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 items-center justify-center">
                    <button
                      type="button"
                      onClick={() => document.getElementById('logo-file-picker')?.click()}
                      className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10.5px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Browse image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Enter web URL of your corporate logo:");
                        if (url) {
                          setLogoUrl(url);
                        }
                      }}
                      className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-[10px] font-semibold rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <Link className="w-3 h-3 text-slate-500" />
                      <span>Paste URL</span>
                    </button>
                  </div>
                  <input 
                    type="file"
                    accept="image/*"
                    id="logo-file-picker"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        processImageUpload(file, setLogoUrl, 400, 150);
                      }
                    }}
                    className="hidden"
                  />
                </div>

                {/* Unified Title Bar option option to set */}
                <div className="space-y-1 pt-2">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase font-sans">Title Bar App Name</label>
                  <input
                    type="text"
                    value={titleBarText}
                    onChange={(e) => setTitleBarText(e.target.value)}
                    placeholder="e.g. Apex Digital Solutions"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    id="title-bar-text-setting"
                  />
                  <p className="text-[9px] text-slate-400">Sets the active name/title displayed in the navigation sidebar &amp; top toolbar.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-sans tracking-wider flex items-center justify-between">
                  <span>Portal Favicon</span>
                  <span className="text-[8.5px] text-indigo-650 lowercase italic">Supports Drag-and-Drop</span>
                </label>
                <div 
                  className={`border-2 border-dashed rounded-2xl p-4 transition duration-200 flex flex-col items-center justify-center text-center space-y-2.5 ${
                    isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processImageUpload(file, setFaviconUrl, 128, 128);
                    }
                  }}
                >
                  {faviconUrl ? (
                    <div className="relative p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center h-20 w-20 shadow-xs group">
                      <img 
                        src={faviconUrl} 
                        className="max-h-full max-w-full object-contain rounded-lg" 
                        alt="Favicon preview" 
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFaviconUrl('');
                        }}
                        className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md transition font-bold cursor-pointer"
                        title="Remove Favicon"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2">
                      <Sparkles className="w-8 h-8 text-slate-400 mb-1" />
                      <p className="text-[11px] text-slate-500">Drag &amp; drop favicon file, or</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 items-center justify-center">
                    <button
                      type="button"
                      onClick={() => document.getElementById('favicon-file-picker')?.click()}
                      className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10.5px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Browse image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Enter web URL of your favicon:");
                        if (url) {
                          setFaviconUrl(url);
                        }
                      }}
                      className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-[10px] font-semibold rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <Link className="w-3 h-3 text-slate-500" />
                      <span>Paste URL</span>
                    </button>
                  </div>
                  <input 
                    type="file"
                    accept="image/*"
                    id="favicon-file-picker"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        processImageUpload(file, setFaviconUrl, 128, 128);
                      }
                    }}
                    className="hidden"
                  />
                </div>
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
                        processImageUpload(file, setSignatureUrl, 350, 120);
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
                          processImageUpload(file, setSignatureUrl, 350, 120);
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

          {/* Box 4: Invoice Template & Output Settings */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 text-sm font-display border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Invoice Template &amp; Output Settings</span>
            </h3>

            {/* Prefix formats (Invoice & Quotation Series Setup) */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">1. Prefixes &amp; Series Setup</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Invoice Series Prefix</label>
                    <input 
                      type="text"
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                      placeholder="e.g. INV-"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Quotation Prefix</label>
                    <input 
                      type="text"
                      value={quotationPrefix}
                      onChange={(e) => setQuotationPrefix(e.target.value)}
                      placeholder="e.g. EST-"
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono focus:border-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-slate-400">Newly raised documents will automatically generate series serial codes prefixed with these parameters.</p>
              </div>

              {/* Design Theme selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Default Invoice Theme Color</label>
                <select
                  value={invoiceTheme}
                  onChange={(e) => setInvoiceTheme(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="navy">Classic Navy Slate (Corporate)</option>
                  <option value="minimal">Swiss Minimalist (Monochrome)</option>
                  <option value="emerald">Executive Teal (Modern Mint)</option>
                </select>
                <p className="text-[9px] text-slate-400">Determines the default design theme applied when loading customer invoices for review.</p>
              </div>

              {/* Mohar / Signature size controller */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Mohar Stamp &amp; Sign Height</label>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{moharSize}px</span>
                </div>
                <input 
                  type="range"
                  min="25"
                  max="150"
                  value={moharSize}
                  onChange={(e) => setMoharSize(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[9px] text-slate-400">Adjusts the scale (height) of the official company stamp image on exported vouchers.</p>
              </div>

              {/* Customizable visible fields */}
              <div className="space-y-3 font-sans">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1.5">2. Template Field Visibilities</span>

                {/* Section: Header */}
                <div className="space-y-2">
                  <span className="text-[9px] font-extrabold text-indigo-500 block">Header / Seller Info</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceGst}
                        onChange={(e) => setShowInvoiceGst(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Company GST</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceLogo}
                        onChange={(e) => setShowInvoiceLogo(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Corporate Logo</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoicePhone}
                        onChange={(e) => setShowInvoicePhone(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Phone No</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceEmail}
                        onChange={(e) => setShowInvoiceEmail(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Email Address</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent col-span-2">
                      <input 
                        type="checkbox"
                        checked={showInvoiceAddress}
                        onChange={(e) => setShowInvoiceAddress(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Registered Postal Address</span>
                    </label>
                  </div>
                </div>

                {/* Section: Client */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <span className="text-[9px] font-extrabold text-indigo-500 block">Recipient (Billed-to) Particulars</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceClientAddress}
                        onChange={(e) => setShowInvoiceClientAddress(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Street Address</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceClientPhone}
                        onChange={(e) => setShowInvoiceClientPhone(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Phone No</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceClientEmail}
                        onChange={(e) => setShowInvoiceClientEmail(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Email</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceClientGst}
                        onChange={(e) => setShowInvoiceClientGst(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Client GSTIN</span>
                    </label>
                  </div>
                </div>

                {/* Section: Items Table */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <span className="text-[9px] font-extrabold text-indigo-500 block">Deliverables Table Columns</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceHsn}
                        onChange={(e) => setShowInvoiceHsn(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show SKU/HSN Code</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceTaxSplit}
                        onChange={(e) => setShowInvoiceTaxSplit(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Tax Split Rate</span>
                    </label>
                  </div>
                </div>

                {/* Section: Sign off & QR Code */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <span className="text-[9px] font-extrabold text-indigo-500 block">Signatures &amp; Settlements</span>
                  <div className="grid grid-cols-2 gap-2 font-medium">
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceBankDetails}
                        onChange={(e) => setShowInvoiceBankDetails(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Bank Details</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceUpiId}
                        onChange={(e) => setShowInvoiceUpiId(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show UPI ID Line</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceQrCode}
                        onChange={(e) => setShowInvoiceQrCode(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Scan-to-Pay QR</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent">
                      <input 
                        type="checkbox"
                        checked={showInvoiceSignature}
                        onChange={(e) => setShowInvoiceSignature(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Stamp signature</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-medium whitespace-nowrap cursor-pointer selection:bg-transparent col-span-2">
                      <input 
                        type="checkbox"
                        checked={showInvoiceNotes}
                        onChange={(e) => setShowInvoiceNotes(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-0"
                      />
                      <span>Show Ledger Notes / Warnings</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save panel */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-display">
                <Save className="w-4 h-4 text-indigo-600" />
                <span>Apply System Configuration</span>
              </h4>
              <p className="text-xs text-slate-505 text-slate-500 mt-1 leading-normal">
                Updating profile configurations saves changes to company headers, banking parameters, and PDF invoice templates universally.
              </p>
            </div>

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl text-xs font-bold leading-none select-none">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Configurations persisted successfully!</span>
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white transition rounded-2xl text-xs font-bold font-sans shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-indigo-700/20 active:scale-[0.99]"
              id="save-settings-btn"
            >
              <Save className="w-4 h-4 text-white" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
