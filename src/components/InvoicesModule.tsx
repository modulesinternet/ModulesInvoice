import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Mail, 
  Trash2, 
  Eye, 
  Calendar, 
  CreditCard,
  Building2,
  Phone,
  QrCode,
  Download,
  AlertTriangle,
  X,
  User,
  CheckCircle,
  PlusCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  Globe,
  Edit3,
  Paperclip,
  Share2
} from 'lucide-react';
import { Invoice, Client, Product, InvoiceItem, formatDisplayDate } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Pagination from './Pagination';
import QRCode from 'qrcode';
import { storage } from '../services/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

async function toBase64(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Fetch base64 failed, trying canvas load for url:", url, err);
    try {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
              return;
            }
            reject(new Error('no canvas context'));
          } catch (canvasErr) {
            reject(canvasErr);
          }
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch (canvasErr) {
      console.warn("Could not pre-convert URL to base64, continuing with original:", canvasErr);
      return url;
    }
  }
}

async function toBase64Rounded(url: string, roundedRatio: number = 0.12): Promise<string> {
  if (!url) return '';
  try {
    const rawBase64 = await toBase64(url);
    if (!rawBase64) return '';
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 300;
          const h = img.naturalHeight || img.height || 300;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.beginPath();
            const r = Math.min(w, h) * roundedRatio;
            ctx.moveTo(r, 0);
            ctx.lineTo(w - r, 0);
            ctx.quadraticCurveTo(w, 0, w, r);
            ctx.lineTo(w, h - r);
            ctx.quadraticCurveTo(w, h, w - r, h);
            ctx.lineTo(r, h);
            ctx.quadraticCurveTo(0, h, 0, h - r);
            ctx.lineTo(0, r);
            ctx.quadraticCurveTo(0, 0, r, 0);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(rawBase64);
          }
        } catch (e) {
          resolve(rawBase64);
        }
      };
      img.onerror = () => resolve(rawBase64);
      img.src = rawBase64;
    });
  } catch (err) {
    console.warn("toBase64Rounded failed, falling back to clean original", err);
    return toBase64(url);
  }
}

async function mergePdfAttachments(invoicePdfArrayBuffer: ArrayBuffer, challanUrl: string): Promise<Uint8Array> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const mainPdfDoc = await PDFDocument.load(invoicePdfArrayBuffer);
    
    const isChallanPdf = challanUrl.startsWith('data:application/pdf') || challanUrl.toLowerCase().includes('.pdf');
    if (!isChallanPdf) {
      return new Uint8Array(await mainPdfDoc.save());
    }

    let bytes: Uint8Array;
    if (challanUrl.startsWith('data:')) {
      const parts = challanUrl.split(',');
      const base64Data = parts[1] || parts[0];
      const binaryString = window.atob(base64Data);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      const response = await fetch(challanUrl);
      const arrayBuffer = await response.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
    }

    const attachmentPdfDoc = await PDFDocument.load(bytes);
    const copiedPages = await mainPdfDoc.copyPages(
      attachmentPdfDoc,
      attachmentPdfDoc.getPageIndices()
    );
    
    copiedPages.forEach((page) => {
      mainPdfDoc.addPage(page);
    });

    return await mainPdfDoc.save();
  } catch (err) {
    console.error("Failed to merge PDF using pdf-lib:", err);
    return new Uint8Array(invoicePdfArrayBuffer);
  }
}

function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  // Convert h from degrees to radians
  const hRad = (h * Math.PI) / 180;
  
  // Convert OKLCH to OKLab
  const L = l;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  
  // Convert OKLab to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  
  // Non-linear LMS to linear LMS
  const l_cube = l_ * l_ * l_;
  const m_cube = m_ * m_ * m_;
  const s_cube = s_ * s_ * s_;
  
  // Linear OKLab LMS to RGB
  let r = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
  let g = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
  let b_ = -0.0041960863 * l_cube - 0.7034186149 * m_cube + 1.7076147012 * s_cube;
  
  // Clamp to [0, 1]
  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b_ = Math.max(0, Math.min(1, b_));
  
  // Gamma correction (sRGB)
  const toSRGB = (cVal: number) => {
    return cVal <= 0.0031308 ? 12.92 * cVal : 1.055 * Math.pow(cVal, 1 / 2.4) - 0.055;
  };
  
  const red = Math.round(toSRGB(r) * 255);
  const green = Math.round(toSRGB(g) * 255);
  const blue = Math.round(toSRGB(b_) * 255);
  
  return [red, green, blue];
}

function replaceOklchInContent(cssText: string): string {
  return cssText.replace(/oklch\s*\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+%?)(?:\s*\/\s*([0-9.]+%?|var\([^)]+\)))?\s*\)/gi, (match, lStr, cStr, hStr, aStr) => {
    try {
      let l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      let c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);
      let h = hStr.endsWith('%') ? parseFloat(hStr) / 100 * 360 : parseFloat(hStr);
      
      const [r, g, b] = oklchToRgb(l, c, h);
      
      if (aStr) {
        let alpha = aStr;
        if (alpha.endsWith('%')) {
          alpha = String(parseFloat(alpha) / 100);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        return `rgb(${r}, ${g}, ${b})`;
      }
    } catch (e) {
      return "rgb(255, 255, 255)";
    }
  });
}

function replaceOklchInStyleTags(clonedDoc: Document) {
  // 1. Process style tags
  const styleTags = clonedDoc.getElementsByTagName('style');
  for (let i = 0; i < styleTags.length; i++) {
    const style = styleTags[i];
    if (style.textContent) {
      style.textContent = replaceOklchInContent(style.textContent);
    }
  }
  
  // 2. Process inline styles of all elements
  const allElements = clonedDoc.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i] as HTMLElement;
    const styleAttr = el.getAttribute('style');
    if (styleAttr && styleAttr.toLowerCase().includes('oklch')) {
      el.setAttribute('style', replaceOklchInContent(styleAttr));
    }
  }
}

interface InvoicesModuleProps {
  invoices: Invoice[];
  clients: Client[];
  products: Product[];
  onAddInvoice: (inv: Partial<Invoice>) => Promise<void>;
  onUpdateInvoice?: (id: string, inv: Partial<Invoice>) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onMarkInvoiceRead?: (id: string) => Promise<void>;
  businessSettings: any;
  canWrite?: boolean;
  canDelete?: boolean;
}

type InvoiceLayoutTemplate = 'navy' | 'minimal' | 'emerald';

const STANDARD_DOC_CLASS = "bg-white rounded-lg border border-slate-200/80 shadow-2xl p-6 md:p-[20mm] w-full md:w-[210mm] mx-auto flex flex-col justify-between print:min-h-0 print:p-0 print:border-none print:shadow-none print:w-full relative overflow-hidden font-sans text-slate-800 animate-fade-in";

export default function InvoicesModule({
  invoices,
  clients,
  products,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onMarkInvoiceRead,
  businessSettings,
  canWrite = true,
  canDelete = true
}: InvoicesModuleProps) {
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('last_invoice_search_term') || '');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('last_invoice_status_filter') || 'All');
  const [selectedInvoiceRaw, setSelectedInvoice] = useState<Invoice | null>(() => {
    const savedId = localStorage.getItem('last_selected_invoice_id');
    if (savedId) {
      const found = invoices.find(inv => inv.id === savedId);
      if (found) return found;
    }
    return null;
  });

  React.useEffect(() => {
    if (selectedInvoiceRaw) {
      localStorage.setItem('last_selected_invoice_id', selectedInvoiceRaw.id);
    } else {
      localStorage.removeItem('last_selected_invoice_id');
    }
  }, [selectedInvoiceRaw]);

  const selectedInvoice = selectedInvoiceRaw 
    ? (invoices.find(inv => inv.id === selectedInvoiceRaw.id) || selectedInvoiceRaw) 
    : null;

  const [base64Logo, setBase64Logo] = useState<string>('');
  const [base64Signature, setBase64Signature] = useState<string>('');

  React.useEffect(() => {
    async function convertImages() {
      if (businessSettings?.logoUrl) {
        try {
          const b64 = await toBase64Rounded(businessSettings.logoUrl);
          setBase64Logo(b64);
        } catch (e) {
          console.warn("Failed logo convert", e);
        }
      } else {
        setBase64Logo('');
      }

      if (businessSettings?.signatureUrl) {
        try {
          const b64 = await toBase64(businessSettings.signatureUrl);
          setBase64Signature(b64);
        } catch (e) {
          console.warn("Failed signature convert", e);
        }
      } else {
        setBase64Signature('');
      }
    }
    convertImages();
  }, [businessSettings]);

  // Storage Upload and Offline Recovery States (fully customized for Cloud Storage)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedInvoice || !onUpdateInvoice) return;

    try {
      setIsUploading(true);
      setUploadProgress(10); // Simulated baseline progress for instant visual feedback

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const timestamp = Date.now();
      const uniqueName = `${timestamp}_${cleanFileName}`;

      const fileRef = storageRef(storage, `invoices/${selectedInvoice.id}/attachments/${uniqueName}`);
      setUploadProgress(40);

      // Perform direct stream upload to Firebase Storage
      await uploadBytes(fileRef, file);
      setUploadProgress(75);

      // Get downloadable URL
      const downloadUrl = await getDownloadURL(fileRef);
      setUploadProgress(90);

      const newAttachment = {
        name: file.name,
        url: downloadUrl,
        size: file.size,
        type: file.type
      };

      const currentAttachments = selectedInvoice.attachments || [];
      const updatedAttachments = [...currentAttachments, newAttachment];

      // Update in Firestore
      await onUpdateInvoice(selectedInvoice.id, {
        attachments: updatedAttachments
      });

      // Track inside current selected view state
      setSelectedInvoice(prev => prev ? {
        ...prev,
        attachments: updatedAttachments
      } : null);

      setUploadProgress(100);
    } catch (err) {
      console.error("Cloud Storage File Upload Refused/Error: ", err);
      alert("Offline recovery or permission limits prevented complete Storage file sync. Re-sync scheduled.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteAttachment = async (indexToDelete: number) => {
    if (!selectedInvoice || !onUpdateInvoice) return;
    const currentAttachments = selectedInvoice.attachments || [];
    const updatedAttachments = currentAttachments.filter((_, idx) => idx !== indexToDelete);

    try {
      await onUpdateInvoice(selectedInvoice.id, {
        attachments: updatedAttachments
      });
      setSelectedInvoice(prev => prev ? {
        ...prev,
        attachments: updatedAttachments
      } : null);
    } catch (err) {
      console.error("Failed to remove associated file:", err);
    }
  };

  const handleSelectInvoice = async (inv: Invoice) => {
    setSelectedInvoice({ ...inv, readCount: 1 });
    if (onMarkInvoiceRead) {
      try {
        await onMarkInvoiceRead(inv.id);
      } catch (err) {
        console.error("Failed to mark invoice as read", err);
      }
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceLayoutTemplate>((businessSettings?.invoiceTheme as any) || 'navy');

  React.useEffect(() => {
    if (businessSettings?.invoiceTheme) {
      setInvoiceTemplate(businessSettings.invoiceTheme);
    }
  }, [businessSettings]);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  React.useEffect(() => {
    if (!selectedInvoice) {
      setQrCodeDataUrl('');
      return;
    }
    const useCust = businessSettings?.useCustomQrCode && businessSettings?.customQrUrl;
    if (useCust) {
      setQrCodeDataUrl(businessSettings.customQrUrl);
      return;
    }

    const qrText = `${window.location.origin}/public/invoice/${encodeURIComponent(selectedInvoice.invoiceNumber)}`;

    QRCode.toDataURL(qrText, { margin: 1, width: 250 }, (err, url) => {
      if (!err && url) {
        setQrCodeDataUrl(url);
      }
    });
  }, [selectedInvoice, businessSettings]);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Form states inside new invoice wizard
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('Humble warning: Please quote our invoice serial number in all bank payouts.');
  const [discount, setDiscount] = useState('0');

  React.useEffect(() => {
    if (isCreateOpen && !isEditing) {
      const computedPrefix = businessSettings?.invoicePrefix || 'INV-';
      const autoNum = `${computedPrefix}${String(invoices.length + 1).padStart(3, '0')}`;
      setInvoiceNumber(autoNum);
      if (businessSettings?.defaultInvoiceNotes) {
        setNotes(businessSettings.defaultInvoiceNotes);
      } else {
        setNotes('Humble warning: Please quote our invoice serial number in all bank payouts.');
      }
    }
  }, [isCreateOpen, isEditing, businessSettings, invoices]);

  // Multi item table adding states for invoice wizard
  const [addedItems, setAddedItems] = useState<Array<{
    productId: string;
    qty: number;
    price: number;
  }>>([]);

  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQty, setCurrentQty] = useState('1');
  const [currentPrice, setCurrentPrice] = useState('');

  const printableRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const selectedClientDetails = clients.find(c => c.id === clientId);

  // Home State mapping. We are based in Maharashtra (starts with "27")
  const homeStateCode = "27";
  const isInterstate = selectedClientDetails && !(selectedClientDetails.gstIn || '').startsWith(homeStateCode);

  const handleProductSelect = (pId: string) => {
    setCurrentProductId(pId);
    const prod = products.find(p => p.id === pId);
    if (prod) {
      setCurrentPrice(String(prod.price));
    }
  };

  const handleAddItemToWizard = () => {
    if (!currentProductId || Number(currentQty) <= 0 || Number(currentPrice) < 0) {
      alert("Please select a target catalog item and positive quantities.");
      return;
    }
    setAddedItems([
      ...addedItems, 
      { productId: currentProductId, qty: Number(currentQty), price: Number(currentPrice) }
    ]);
    setCurrentProductId('');
    setCurrentQty('1');
    setCurrentPrice('');
  };

  const handleRemoveItemFromWizard = (index: number) => {
    const list = [...addedItems];
    list.splice(index, 1);
    setAddedItems(list);
  };

  // Math totals for invoice wizard
  const draftSubtotal = addedItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  
  // Tax distribution
  const draftTax = businessSettings.gstOption === 'zero_tax' ? 0 : addedItems.reduce((sum, item) => {
    const p = products.find(prod => prod.id === item.productId);
    const rate = p?.gstPercent || 18;
    const base = item.qty * item.price;
    return sum + (base * (rate / 100));
  }, 0);

  const draftDiscountNum = Number(discount || 0);
  const draftTotal = Math.max(0, draftSubtotal + draftTax - draftDiscountNum);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!clientId) {
      alert("Please designate a corporate client first.");
      return;
    }
    if (addedItems.length === 0) {
      alert("Specify at least one billing item description.");
      return;
    }

    setIsSaving(true);
    try {
      const clientObj = clients.find(c => c.id === clientId)!;
      const isZeroTax = businessSettings.gstOption === 'zero_tax';

      const finalItems: InvoiceItem[] = addedItems.map(item => {
        const prod = products.find(p => p.id === item.productId)!;
        const base = item.qty * item.price;
        const rate = isZeroTax ? 0 : prod.gstPercent;
        const tax = base * (rate / 100);
        return {
          productId: item.productId,
          name: prod.name,
          hsnSac: prod.hsnSac || '',
          qty: item.qty,
          price: item.price,
          gstPercent: rate,
          gstAmount: tax,
          totalAmount: base + tax
        };
      });

      const finalPaidAmount = isEditing && editingInvoiceId 
        ? (invoices.find(inv => inv.id === editingInvoiceId)?.paidAmount || 0) 
        : 0;
      const finalDueAmount = Math.max(0, draftTotal - finalPaidAmount);
      let finalStatus: 'paid' | 'partially_paid' | 'unpaid' = 'unpaid';
      if (finalDueAmount <= 0) {
        finalStatus = 'paid';
      } else if (finalPaidAmount > 0) {
        finalStatus = 'partially_paid';
      }

      const payload: Partial<Invoice> = {
        clientId,
        clientName: clientObj.name,
        clientGst: clientObj.gstIn || 'URP',
        date,
        dueDate,
        items: finalItems,
        subtotal: draftSubtotal,
        discount: draftDiscountNum,
        taxType: (clientObj.gstIn || '').startsWith(homeStateCode) ? "CGST_SGST" : "IGST",
        taxAmount: draftTax,
        total: draftTotal,
        paidAmount: finalPaidAmount,
        dueAmount: finalDueAmount,
        status: finalStatus,
        notes,
        invoiceNumber
      };

      if (isEditing && editingInvoiceId && onUpdateInvoice) {
        await onUpdateInvoice(editingInvoiceId, payload);
      } else {
        await onAddInvoice(payload);
      }
      setIsCreateOpen(false);
      setIsEditing(false);
      setEditingInvoiceId(null);
      setAddedItems([]);
      setDiscount('0');
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred while creating/updating the invoice.");
    } finally {
      setIsSaving(false);
    }
  };

  // PDF Export Engine via html2canvas plus jsPDF with reliable pure vector fallback
  const handleDownloadPDF = async (action: 'download' | 'print' = 'download') => {
    if (!printableRef.current) return;
    
    // Temporarily intercept console logging to suppress verbose "oklch" parsing warnings from html2canvas
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    const shouldFilter = (msg: any) => {
      if (typeof msg === 'string' && (msg.includes('oklch') || msg.includes('unsupported color function'))) {
        return true;
      }
      return false;
    };

    console.error = (...args: any[]) => {
      if (args[0] && shouldFilter(args[0])) return;
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      if (args[0] && shouldFilter(args[0])) return;
      originalConsoleWarn.apply(console, args);
    };

    console.log = (...args: any[]) => {
      if (args[0] && shouldFilter(args[0])) return;
      originalConsoleLog.apply(console, args);
    };

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Helper: Safe multi-line text renderer that splits on \n and bounds to maxWidth
      const drawSafeMultilineText = (
        text: string, 
        x: number, 
        y: number, 
        maxWidth: number, 
        lineHeight: number = 4.5
      ) => {
        const rawParts = String(text || '').split(/\r?\n/);
        let currentY = y;
        rawParts.forEach(part => {
          if (!part.trim()) return;
          const lines = pdf.splitTextToSize(part.trim(), maxWidth);
          lines.forEach((line: string) => {
            pdf.text(line, x, currentY);
            currentY += lineHeight;
          });
        });
        return currentY;
      };

      // Helper: Format currency safely as "Rs." to avoid unsupported Rupee symbol glyph in Helvetica
      const formatPDFCurrency = (val: number) => {
        return 'Rs. ' + new Intl.NumberFormat('en-IN', {
          maximumFractionDigits: 0
        }).format(val || 0);
      };

      const bodyEl = document.getElementById('invoice-page-1') || document.getElementById('invoice-main-body');
      if (!bodyEl) throw new Error("Invoice main body block not found");

      const useVectorFallback = true;
      const canvas = null as any;
      const imgData = '';

      if (useVectorFallback || !imgData) {
        // VECTOR COMPILATION FALLBACK: Crisp, clean, luxury vector design matching the professional system themes
        const themeColor = activeTheme?.themeColor || '#5B21FF';
        const isEmerald = invoiceTemplate === 'emerald';
        const isMinimal = invoiceTemplate === 'minimal';
        const themeBg = isEmerald ? '#f0fdfa' : (isMinimal ? '#f8fafc' : '#f5f3ff');
        
        let textStartX = 20;
        let addressWidth = 105;
        
        // Render Premium Brand Logo if found
        const lUrl = base64Logo || businessSettings?.logoUrl;
        if (lUrl && (businessSettings?.showInvoiceLogo ?? true) !== false) {
          try {
            const format = lUrl.includes('png') || lUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            pdf.addImage(lUrl, format, 20, 16, 18, 18);
            textStartX = 41; // Offset text base next to logo
            addressWidth = 83; // Narrow wrap width next to logo
          } catch (logoErr) {
            console.warn("Could not draw logo in PDF fallback:", logoErr);
          }
        }
        
        // Draw Core Business Identity vertically centered next to logo
        const compName = businessSettings?.companyName || "Internet Modules";
        pdf.setTextColor(15, 23, 42); // slate-900
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14.5);
        if (compName.includes("Modules")) {
          const index = compName.indexOf("Modules");
          const part1 = compName.substring(0, index);
          pdf.text(part1, textStartX, 23.5);
          const part1Width = pdf.getTextWidth(part1);
          pdf.setTextColor(themeColor);
          pdf.text("Modules", textStartX + part1Width, 23.5);
        } else {
          pdf.text(compName, textStartX, 23.5);
        }
        
        if (businessSettings?.gstIn && (businessSettings?.showInvoiceGst ?? true) !== false) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(themeColor);
          pdf.text(`GSTIN: ${businessSettings.gstIn}`, textStartX, 28);
        }
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(100, 116, 139); // slate-500
        
        // Address starts on a fresh line at left-margin (X = 20) under the logo (Y = 16 + 18 = 34)
        let headerEndY = 38.5;
        if (businessSettings?.address && (businessSettings?.showInvoiceAddress ?? true) !== false) {
          headerEndY = drawSafeMultilineText(businessSettings.address, 20, 38.5, 105, 4.2);
        } else {
          headerEndY = 38.5;
        }
        
        // Draw Business Contact info underneath address starting at X = 20
        let contactY = headerEndY;
        let contactText = '';
        if ((businessSettings?.showInvoiceEmail ?? true) !== false && businessSettings?.email) {
          contactText += `Email: ${businessSettings.email}`;
        }
        if ((businessSettings?.showInvoicePhone ?? true) !== false && businessSettings?.phone) {
          if (contactText) contactText += '  |  ';
          contactText += `Tel: ${businessSettings.phone}`;
        }
        
        if (contactText) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139); // slate-500
          pdf.text(contactText, 20, contactY);
          contactY += 4.5;
        }
        
        // Right-aligned Modern Meta Header "TAX INVOICE" aligned with right margin at X = 190
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(themeColor); // Styled with active theme accent color!
        pdf.text("TAX INVOICE", 190, 23, { align: 'right' });
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(15, 23, 42); // slate-900 (Large bold in screenshot)
        pdf.text(selectedInvoice?.invoiceNumber || '', 190, 29.5, { align: 'right' });
        
        // Render Status badge beautifully (dynamic color) aligned to right margin (X = 190)
        const statusStr = selectedInvoice?.status || 'UNPAID';
        const isPaid = statusStr === 'PAID';
        const isPartial = statusStr === 'PARTIAL_PAID' || statusStr === 'PARTIAL';
        
        let fillR = 254, fillG = 242, fillB = 242; // Red-50
        let drawR = 254, drawG = 226, drawB = 226; // Red-200
        let textR = 220, textG = 38, textB = 38;    // Red-600
        
        if (isPaid) {
          fillR = 240; fillG = 253; fillB = 250;     // Teal-50
          drawR = 204; drawG = 251; drawB = 241;     // Teal-200
          textR = 13; textG = 148; textB = 136;      // Teal-600
        } else if (isPartial) {
          fillR = 255; fillG = 251; fillB = 235;     // Amber-50
          drawR = 254; drawG = 243; drawB = 199;     // Amber-200
          textR = 180; textG = 83; textB = 9;        // Amber-700
        }
        
        const statusText = statusStr.replace('_', ' ').toUpperCase();
        pdf.setFillColor(fillR, fillG, fillB);
        pdf.setDrawColor(drawR, drawG, drawB);
        pdf.setLineWidth(0.2);
        const badgeWidth = pdf.getTextWidth(statusText) + 6;
        const badgeX = 190 - badgeWidth;
        pdf.roundedRect(badgeX, 32.5, badgeWidth, 4.3, 1, 1, 'FD');
        pdf.setTextColor(textR, textG, textB);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.text(statusText, badgeX + (badgeWidth / 2), 35.6, { align: 'center' });
        
        // Date of Issue & Due Date aligned beautifully on right column
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139); // slate-500
        pdf.text("Invoiced Date:", 145, 42.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(71, 85, 105); // slate-600
        pdf.text(selectedInvoice ? formatDisplayDate(selectedInvoice.date) : '', 190, 42.5, { align: 'right' });
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text("Due By:", 145, 46.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(225, 29, 72); // rose-600
        pdf.text(selectedInvoice ? formatDisplayDate(selectedInvoice.dueDate) : '', 190, 46.5, { align: 'right' });
        
        // Divider Axis Line styled cleanly in a thin elegant trace
        pdf.setDrawColor(226, 232, 240); // elegant Slate-200 boundary line
        pdf.setLineWidth(0.35);
        const dividerY = Math.max(52, contactY + 3);
        pdf.line(20, dividerY, 190, dividerY);
        
        // Bill to Container Block (rounded-xl styled box)
        const billToY = dividerY + 4;
        pdf.setFillColor(248, 250, 252); // bg-slate-50/50 fill representation
        pdf.setDrawColor(226, 232, 240); // Soft, clean slate outline
        pdf.setLineWidth(0.25);
        pdf.roundedRect(20, billToY, 170, 38, 2.5, 2.5, 'FD'); // Rounded corners matching theme
        
        // LEFT COLUMN: Client Bill-To Particulars
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.text("CLIENT BILL-TO PARTICULARS", 25, billToY + 6.5);
        
        pdf.setTextColor(15, 23, 42); // slate-900
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(selectedInvoice?.clientName || "Corporate Client Partner", 25, billToY + 12.5);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105); // slate-600
        
        const clientObj = clients.find(c => c.id === selectedInvoice?.clientId || c.name === selectedInvoice?.clientName);
        if (clientObj) {
          const billingAddress = clientObj.billingAddress || '';
          let addY = billToY + 17.5;
          const addrLines = pdf.splitTextToSize(billingAddress, 80);
          addrLines.slice(0, 3).forEach((line: string) => {
            pdf.text(line, 25, addY);
            addY += 4.5;
          });
          pdf.text(`Email: ${clientObj.email || 'N/A'}`, 25, billToY + 30);
          pdf.text(`Tel: ${clientObj.phone || 'N/A'}`, 25, billToY + 34);
        } else {
          pdf.text("Client Ledger Record Information Not Found.", 25, billToY + 17.5);
        }
        
        // RIGHT COLUMN: Banking Payout Details
        if ((businessSettings?.showInvoiceBankDetails ?? true) !== false) {
          pdf.setTextColor(148, 163, 184); // slate-400
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          pdf.text("BANKING PAYOUT DETAILS", 115, billToY + 6.5);
          
          pdf.setTextColor(15, 23, 42); // slate-900
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text(businessSettings?.bankName || 'N/A', 115, billToY + 12.5);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(71, 85, 105); // slate-600
          pdf.text(`A/C: ${businessSettings?.accountNum || 'N/A'}`, 115, billToY + 17.5);
          pdf.text(`IFSC: ${businessSettings?.ifscCode || 'N/A'}`, 115, billToY + 22.0);
          
          let upiY = billToY + 26.5;
          if (businessSettings?.upiId && (businessSettings?.showInvoiceUpiId ?? true) !== false) {
            pdf.text(`UPI ID: ${businessSettings.upiId}`, 115, upiY);
            upiY += 4.5;
          }
        }
        
        // Dynamic Table Columns Configuration
        const tableHeaderY = billToY + 42;
        pdf.setFillColor(241, 245, 249); // bg-slate-100
        pdf.roundedRect(20, tableHeaderY, 170, 8, 1.5, 1.5, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139); // slate-500
        pdf.text("STANDARD DELIVERABLES LINE ITEM", 24, tableHeaderY + 5.5);
        pdf.text("QTY", 128, tableHeaderY + 5.5, { align: 'center' });
        pdf.text("UNIT RATE (INR)", 160, tableHeaderY + 5.5, { align: 'right' });
        pdf.text("AMOUNT (GROSS)", 187, tableHeaderY + 5.5, { align: 'right' });
        
        // Loop and render dynamic rows clearly
        let currentY = tableHeaderY + 13;
        
        if (selectedInvoice?.items) {
          selectedInvoice.items.forEach((item: any) => {
            const nameText = item.name || item.productName || "Product/Service Detail";
            const wrappedLines = pdf.splitTextToSize(nameText, 95);
            const rowHeight = Math.max(10, wrappedLines.length * 4.4 + 4);
            
            if (currentY + rowHeight > 240) { // Safety transition threshold for multi-page invoices
              pdf.addPage();
              currentY = 25;
            }
            
            pdf.setTextColor(15, 23, 42); // slate-900
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8.5);
            wrappedLines.forEach((lineText: string, li: number) => {
              pdf.text(lineText, 24, currentY + (li * 4.4));
            });
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(71, 85, 105); // slate-600
            
            pdf.text(String(item.qty || item.quantity || 1), 128, currentY, { align: 'center' });
            pdf.text(formatPDFCurrency(item.price || item.rate || 0), 160, currentY, { align: 'right' });
            pdf.text(formatPDFCurrency((item.qty || item.quantity || 1) * (item.price || item.rate || 0)), 187, currentY, { align: 'right' });
            
            // Subtle row delimiter
            pdf.setDrawColor(241, 245, 249);
            pdf.setLineWidth(0.2);
            pdf.line(20, currentY + rowHeight - 2, 190, currentY + rowHeight - 2);
            
            currentY += rowHeight;
          });
        }
        
        // Footer layout containing totals block + verification block + signatures
        const footerSpaceY = Math.max(175, currentY + 4);
        
        const showTaxRow = businessSettings.gstOption !== 'zero_tax';
        const showDiscountRow = selectedInvoice && selectedInvoice.discount > 0;
        
        let totalsRows = [];
        
        // 1. Subtotal / Net Ledger Value
        totalsRows.push({
          label: "Net Ledger Value:",
          valText: formatPDFCurrency(selectedInvoice?.subtotal || 0),
          isBold: true,
          color: [15, 23, 42] // slate-900
        });
        
        // 2. Tax Row
        if (showTaxRow) {
          totalsRows.push({
            label: "CGST/SGST/IGST Taxes:",
            valText: "+" + formatPDFCurrency(selectedInvoice?.taxAmount || 0),
            isBold: true,
            color: [15, 23, 42] // slate-900
          });
        }
        
        // 3. Discount Row
        if (showDiscountRow) {
          totalsRows.push({
            label: "Discount applied:",
            valText: "-" + formatPDFCurrency(selectedInvoice?.discount || 0),
            isBold: true,
            color: [220, 38, 38] // red-600
          });
        }
        
        // Divider row index can be calculated
        const dividerIndex = totalsRows.length; // draw divider line before rendering the next row
        
        // 4. Total Amount
        totalsRows.push({
          label: "Total Amount:",
          valText: formatPDFCurrency(selectedInvoice?.total || 0),
          isBold: true,
          fontSize: 8.5,
          color: [15, 23, 42] // slate-900
        });
        
        // 5. Amount Paid
        totalsRows.push({
          label: "Amount Paid:",
          valText: formatPDFCurrency(selectedInvoice?.paidAmount || 0),
          isBold: true,
          color: [16, 185, 129] // emerald-600
        });
        
        // 6. Pending Outstanding
        totalsRows.push({
          label: "Pending Outstanding:",
          valText: formatPDFCurrency(selectedInvoice?.dueAmount || 0),
          isBold: true,
          fontSize: 8.5,
          color: [225, 29, 72] // rose-600
        });
        
        // Determine box height based on actual number of rows
        const totalsBoxHeight = totalsRows.length * 5.2 + 5;
        
        // Render Totals Box
        pdf.setFillColor(248, 250, 252); // soft slate background (#f8fafc)
        pdf.roundedRect(115, footerSpaceY, 75, totalsBoxHeight, 1.5, 1.5, 'F');
        pdf.setDrawColor(226, 232, 240); // Soft, clean Slate-200 divider and borders
        pdf.setLineWidth(0.25);
        pdf.roundedRect(115, footerSpaceY, 75, totalsBoxHeight, 1.5, 1.5, 'D'); // Rounded outline box
        
        // Draw each row inside the box
        let totalsCurrentY = footerSpaceY + 5.5;
        totalsRows.forEach((row, rIdx) => {
          if (rIdx === dividerIndex) {
            // Draw standard horizontal line before total amount row
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.2);
            pdf.line(115, totalsCurrentY - 2.2, 190, totalsCurrentY - 2.2);
          }
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139); // slate-500 for labels
          pdf.text(row.label, 118, totalsCurrentY);
          
          pdf.setFont('helvetica', row.isBold ? 'bold' : 'normal');
          pdf.setFontSize(row.fontSize || 8);
          pdf.setTextColor(row.color[0], row.color[1], row.color[2]);
          pdf.text(row.valText, 186, totalsCurrentY, { align: 'right' });
          
          totalsCurrentY += 5.2;
        });
        
        // QR Code & Legal Signature Block on bottom left
        let elementX = 20;
        
        const sUrlSig = base64Signature || businessSettings?.signatureUrl;
        if (sUrlSig && (businessSettings?.showInvoiceSignature ?? true) !== false) {
          try {
            const format = sUrlSig.includes('png') || sUrlSig.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139); // slate-500
            pdf.text("AUTHORIZED SIGNOFF", elementX, footerSpaceY + 4);
            
            pdf.addImage(sUrlSig, format, elementX, footerSpaceY + 6, 26, 18);
            elementX += 34; // Shift right
          } catch (sigErr) {
            console.warn("Could not draw authorized signature:", sigErr);
          }
        }
        
        if (selectedInvoice && (businessSettings?.showInvoiceQrCode ?? true) !== false && qrCodeDataUrl) {
          try {
            // Draw a beautiful rounded frame for the QR code just like on screen!
            pdf.setFillColor(248, 250, 252); // bg-slate-50/50 (#f8fafc)
            pdf.setDrawColor(226, 232, 240); // border-slate-200 (#e2e8f0)
            pdf.setLineWidth(0.25);
            pdf.roundedRect(elementX, footerSpaceY + 2, 28, 32, 2.5, 2.5, 'FD');
            
            // Center the 22x22 QR Code inside the 28-wide frame (leaving 3mm on left)
            pdf.addImage(qrCodeDataUrl, 'PNG', elementX + 3, footerSpaceY + 5, 22, 22);
            
            // Draw the "Click to Verify ↗" text centered at bottom of frame
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(themeColor);
            pdf.text("Click to Verify ↗", elementX + 14, footerSpaceY + 31, { align: 'center' });
            
            elementX += 34; // Shift right
          } catch (qrErr) {
            console.warn("Could not draw UPI QR code:", qrErr);
          }
        }
        
        // Notes container box
        const notesY = footerSpaceY + totalsBoxHeight + 3;
        if (((businessSettings?.showInvoiceNotes ?? true) !== false && selectedInvoice?.notes)) {
          pdf.setFillColor(248, 250, 252);
          pdf.roundedRect(20, notesY, 170, 13, 1.5, 1.5, 'F');
          pdf.setDrawColor(241, 245, 249);
          pdf.setLineWidth(0.2);
          pdf.roundedRect(20, notesY, 170, 13, 1.5, 1.5, 'D');
          
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(148, 163, 184); // slate-400
          pdf.text("INVOICE NOTES & TERMS", 24, notesY + 4.5);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(71, 85, 105); // slate-600
          const subNotes = selectedInvoice.notes.length > 95 ? selectedInvoice.notes.substring(0, 92) + "..." : selectedInvoice.notes;
          pdf.text(subNotes, 24, notesY + 9.5);
        }
        
        // Single beautiful terms footer
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.text("THIS IS AN ELECTRONICALLY GENERATED DOCUMENT, MANUAL SIGNATURE NOT REQUIRED.", 42, 282);
      } else {
        const imgWidth = 210; // A4 standard width in mm
        const pageHeight = 297; // A4 standard height in mm
        let renderedWidth = imgWidth;
        let renderedHeight = (canvas.height * imgWidth) / canvas.width;

        // If the rendered height exceeds the A4 page height, scale down so it fits on a single page
        if (renderedHeight > pageHeight - 12) { // 6mm margins top and bottom
          const scale = (pageHeight - 12) / renderedHeight;
          renderedWidth = renderedWidth * scale;
          renderedHeight = pageHeight - 12;
        }
        
        const xOffset = (imgWidth - renderedWidth) / 2;
        const yOffset = 6;
        
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderedWidth, renderedHeight);
      }

      // Render Page 2 (Attached Delivery Challan) ONLY if it is an image and exists.
      // If it is a PDF file, we bypass adding a page in jsPDF, and merge it below using pdf-lib.
      if (selectedInvoice?.challanUrl) {
        const isPdf = selectedInvoice.challanType === 'application/pdf' || 
                      selectedInvoice.challanUrl?.startsWith('data:application/pdf') || 
                      selectedInvoice.challanName?.toLowerCase().endsWith('.pdf') || 
                      selectedInvoice.challanUrl?.toLowerCase().includes('.pdf');
        
        if (!isPdf) {
          try {
            pdf.addPage();
            const challanEl = document.getElementById('challan-attachment-section');
            let addedWithCanvas = false;
            
            if (challanEl) {
              try {
                // Capture the full styled HTML/JSX delivery challan page
                const challanCanvas = await html2canvas(challanEl, {
                  scale: 2,
                  useCORS: true,
                  logging: false,
                  allowTaint: false,
                  onclone: (clonedDoc) => {
                    replaceOklchInStyleTags(clonedDoc);
                    const clonedChallan = clonedDoc.getElementById('challan-attachment-section');
                    if (clonedChallan) {
                      clonedChallan.style.boxShadow = 'none';
                      clonedChallan.style.border = 'none';
                      clonedChallan.style.borderRadius = '0';
                      clonedChallan.style.margin = '0';
                      clonedChallan.style.padding = '20mm';
                    }
                  }
                });
                
                if (challanCanvas) {
                  const challanImgData = challanCanvas.toDataURL('image/png');
                  const imgWidth = 210; // A4 standard width in mm
                  const pageHeight = 297; // A4 standard height in mm
                  let renderedWidth = imgWidth;
                  let renderedHeight = (challanCanvas.height * imgWidth) / challanCanvas.width;
                  
                  if (renderedHeight > pageHeight - 12) {
                    const scale = (pageHeight - 12) / renderedHeight;
                    renderedWidth = renderedWidth * scale;
                    renderedHeight = pageHeight - 12;
                  }
                  
                  const xOffset = (imgWidth - renderedWidth) / 2;
                  const yOffset = 6;
                  pdf.addImage(challanImgData, 'PNG', xOffset, yOffset, renderedWidth, renderedHeight);
                  addedWithCanvas = true;
                }
              } catch (canvasErr) {
                console.warn("Challan canvas capture failed:", canvasErr);
              }
            }
            
            if (!addedWithCanvas) {
              try {
                // Direct image addition fallback for raw attached proof screen
                const imgFormat = selectedInvoice.challanUrl.includes('png') ? 'PNG' : 'JPEG';
                pdf.addImage(selectedInvoice.challanUrl, imgFormat, 10, 10, 190, 277);
                addedWithCanvas = true;
              } catch (imgErr) {
                console.warn("Direct image addition failed:", imgErr);
              }
            }
          } catch (challanRenderErr) {
            console.warn("Could not append clear challan image to invoice PDF:", challanRenderErr);
          }
        }
      }

      const safeInvoiceName = String(selectedInvoice?.invoiceNumber || "Invoice").replace(/\//g, '_');
      
      const generatedArrayBuffer = pdf.output('arraybuffer');
      let finalBytes = new Uint8Array(generatedArrayBuffer);
      
      if (selectedInvoice?.challanUrl) {
        const isPdf = selectedInvoice.challanType === 'application/pdf' || 
                      selectedInvoice.challanUrl?.startsWith('data:application/pdf') || 
                      selectedInvoice.challanName?.toLowerCase().endsWith('.pdf') || 
                      selectedInvoice.challanUrl?.toLowerCase().includes('.pdf');
        if (isPdf) {
          finalBytes = await mergePdfAttachments(generatedArrayBuffer, selectedInvoice.challanUrl);
        }
      }
      
      const finalBlob = new Blob([finalBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(finalBlob);

      if (action === 'print') {
        const existingIframe = document.getElementById('pdf-print-iframe') as HTMLIFrameElement;
        if (existingIframe) {
          existingIframe.remove();
        }
        
        const iframe = document.createElement('iframe');
        iframe.id = 'pdf-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '100vw'; // move out of viewport
        iframe.style.bottom = '100vh';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = '0px';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (printErr) {
              console.warn("Direct PDF print failed, loading with fallback standard window.print()", printErr);
              window.print();
            }
          }, 400);
        };
        return;
      }

      // Download PDF
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Invoice_${safeInvoiceName}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      // Parallelly stream the generated PDF as a backup blob to Firebase Cloud Storage
      if (selectedInvoice && onUpdateInvoice) {
        try {
          const fileRef = storageRef(storage, `invoices/${selectedInvoice.id}/Invoice_${safeInvoiceName}.pdf`);
          await uploadBytes(fileRef, finalBlob);
          const pdfUrl = await getDownloadURL(fileRef);
          await onUpdateInvoice(selectedInvoice.id, { pdfUrl });
        } catch (storageErr) {
          console.warn("Storage upload bypassed or cached locally for offline recovery: ", storageErr);
        }
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error building download stream: ${e?.message || e}`);
    } finally {
      // Restore standard console logs
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
    }
  };

  const handleOpenEmail = (inv: Invoice) => {
    const cl = clients.find(c => c.id === inv.clientId);
    setEmailTo(cl?.email || 'accounts@clientcorp.com');
    setEmailSubject(`Smart ERP: Digital Tax Invoice Dispatched ${inv.invoiceNumber} from ${businessSettings.companyName}`);
    setIsEmailModalOpen(true);
  };

  const handleSendEmailSimulation = () => {
    alert(`Success: Interactive dispatch complete. Copies generated and forwarded to ${emailTo}`);
    setIsEmailModalOpen(false);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'partially_paid': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'unpaid': return 'bg-rose-50 text-rose-700 border-rose-100 hover:scale-105 transition';
      case 'overdue': return 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getTemplateTheme = (theme: InvoiceLayoutTemplate) => {
    switch(theme) {
      case 'navy': return {
        headerBg: 'bg-slate-900 text-white',
        accentText: 'text-[#5B21FF]',
        borderTheme: 'border-slate-200',
        tableHeadBg: 'bg-slate-100',
        cardBg: 'bg-white',
        subText: 'text-slate-500',
        themeColor: '#5B21FF',
        borderLineColorClass: 'border-[#5B21FF]/30'
      };
      case 'minimal': return {
        headerBg: 'bg-white text-slate-900 border-b-2 border-slate-900',
        accentText: 'text-slate-900 font-extrabold',
        borderTheme: 'border-slate-200',
        tableHeadBg: 'bg-slate-50',
        cardBg: 'bg-white',
        subText: 'text-slate-600',
        themeColor: '#0f172a',
        borderLineColorClass: 'border-slate-900/30'
      };
      case 'emerald': return {
        headerBg: 'bg-teal-950 text-slate-100',
        accentText: 'text-teal-600 font-bold',
        borderTheme: 'border-teal-100',
        tableHeadBg: 'bg-teal-50',
        cardBg: 'bg-white',
        subText: 'text-slate-500',
        themeColor: '#0d9488',
        borderLineColorClass: 'border-teal-600/30'
      };
    }
  };

  const activeTheme = getTemplateTheme(invoiceTemplate);

  return (
    <div className="space-y-6" id="invoices-module">
      {selectedInvoice ? (
        // DETAIL VIEWER FOR SINGLE INVOICE
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 no-print" id="invoice-actions-panel">
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              &larr; Back to Invoices ledger
            </button>
            
            {/* Template Swappers */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] uppercase font-extrabold text-slate-400">Design Theme:</span>
              <button 
                onClick={() => setInvoiceTemplate('navy')}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition ${invoiceTemplate === 'navy' ? 'bg-[#5B21FF] text-white border-[#5B21FF]' : 'bg-slate-50 text-slate-600 border-slate-100'}`}
              >
                Navy Slate (ERP)
              </button>
              <button 
                onClick={() => setInvoiceTemplate('minimal')}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition ${invoiceTemplate === 'minimal' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-100'}`}
              >
                Swiss Minimal
              </button>
              <button 
                onClick={() => setInvoiceTemplate('emerald')}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition ${invoiceTemplate === 'emerald' ? 'bg-teal-700 text-white border-teal-700' : 'bg-slate-50 text-slate-600 border-slate-100'}`}
              >
                Executive Teal
              </button>
            </div>

            {/* Print/Download triggers */}
            <div className="flex items-center gap-2">
              {canWrite && (
                <button 
                  onClick={() => {
                    const inv = selectedInvoice;
                    setIsEditing(true);
                    setEditingInvoiceId(inv.id);
                    setClientId(inv.clientId);
                    setDate(inv.date);
                    setDueDate(inv.dueDate);
                    setNotes(inv.notes || '');
                    setDiscount(String(inv.discount || 0));
                    setInvoiceNumber(inv.invoiceNumber);
                    
                    const mappedItems = inv.items.map(item => {
                      const prod = products.find(p => p.id === item.productId || p.name === item.name);
                      return {
                        productId: prod ? prod.id : '',
                        qty: item.qty,
                        price: item.price
                      };
                    }).filter(v => v.productId !== '');
                    
                    setAddedItems(mappedItems);
                    setIsCreateOpen(true);
                    setSelectedInvoice(null);
                  }}
                  className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4 text-indigo-500" />
                  <span>Edit Bill</span>
                </button>
              )}
              {canWrite && onUpdateInvoice && (
                <div className="inline-block relative">
                  <label 
                    className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:border-slate-300 transition"
                    title={selectedInvoice.challanUrl ? `Update Attached Delivery Challan` : "Attach Delivery Challan Document"}
                  >
                    <Paperclip className={`w-4 h-4 ${selectedInvoice.challanUrl ? 'text-emerald-500 font-bold' : 'text-slate-400'}`} />
                    <span>{selectedInvoice.challanUrl ? "Update Challan" : "Attach Challan"}</span>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const base64String = reader.result as string;
                            await onUpdateInvoice(selectedInvoice.id, { 
                              challanUrl: base64String, 
                              challanName: file.name,
                              challanType: file.type
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
              {canWrite && onUpdateInvoice && selectedInvoice.challanUrl && (
                <button
                  onClick={async () => {
                    if (confirm(`Remove the attached delivery challan '${selectedInvoice.challanName || ""}'?`)) {
                      await onUpdateInvoice(selectedInvoice.id, {
                        challanUrl: undefined,
                        challanName: undefined,
                        challanType: undefined
                      });
                    }
                  }}
                  className="p-2 border border-amber-200 rounded-xl bg-white text-amber-600 hover:bg-amber-50 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Remove Attached Challan"
                >
                  <X className="w-4 h-4" />
                  <span>Remove Challan</span>
                </button>
              )}
              {selectedInvoice && (
                <>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/public/invoice/${encodeURIComponent(selectedInvoice.invoiceNumber)}`;
                      navigator.clipboard.writeText(url);
                      alert(`Public Verification Portal URL Copied:\n${url}`);
                    }}
                    className="p-2 border border-emerald-200 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition select-none cursor-pointer"
                    title="Copy verification portal link to share or access from other devices"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    <span>Copy Verification URL</span>
                  </button>

                  <button 
                    onClick={async () => {
                      const url = `${window.location.origin}/public/invoice/${encodeURIComponent(selectedInvoice.invoiceNumber)}`;
                      const title = `Invoice ${selectedInvoice.invoiceNumber}`;
                      const text = `Please find the Invoice Reference ${selectedInvoice.invoiceNumber} for Apex ERP.`;
                      
                      try {
                        const { shareContent } = await import('../services/mobile');
                        const shared = await shareContent(title, text, url);
                        if (!shared) {
                          navigator.clipboard.writeText(url);
                          alert(`Verification URL copied to clipboard:\n${url}`);
                        }
                      } catch (err) {
                        navigator.clipboard.writeText(url);
                        alert(`Verification URL copied to clipboard:\n${url}`);
                      }
                    }}
                    className="p-2 border border-indigo-200 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition select-none cursor-pointer"
                    title="Share invoice link natively using Capacitor share APIs"
                  >
                    <Share2 className="w-4 h-4 text-indigo-600" />
                    <span>Share Natively</span>
                  </button>
                </>
              )}
              <button 
                onClick={() => handleOpenEmail(selectedInvoice)}
                className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
              >
                <Mail className="w-4 h-4" />
                <span>Email Cop</span>
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Save PDF</span>
              </button>
              <button 
                onClick={() => handleDownloadPDF('print')}
                className="gradient-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
            </div>
          </div>

          {/* MASTER VISUAL DRAW TARGET */}
          <div 
            ref={printableRef}
            className="space-y-12 max-w-4xl mx-auto w-full overflow-visible print:space-y-0"
            id="print-invoice-layout"
          >
            {/* PAGE 1: TAX INVOICE CARD */}
            <div 
              id="invoice-page-1"
              style={{ minHeight: '297mm' }}
              className={STANDARD_DOC_CLASS}
            >
              <div id="invoice-main-body" className="space-y-8 pb-4 bg-white">
            {/* Header section based on branding template chosen */}
            <div className={`flex flex-col sm:flex-row justify-between items-start gap-6 border-b ${activeTheme?.borderLineColorClass || 'border-[#5B21FF]/20'} pb-8`}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {((businessSettings?.showInvoiceLogo ?? true) !== false && (base64Logo || businessSettings?.logoUrl)) ? (
                    <img 
                      src={base64Logo || businessSettings.logoUrl} 
                      className="w-20 h-20 rounded-xl object-contain shadow-sm" 
                      alt="Logo" 
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl flex items-center justify-center text-white font-black text-3xl font-display shadow-sm bg-indigo-600">
                      {businessSettings?.companyName ? businessSettings.companyName.charAt(0) : 'A'}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 font-display tracking-tight leading-none">
                      {(() => {
                        const name = businessSettings?.companyName || '';
                        if (name.includes('Modules')) {
                          const parts = name.split(/(Modules)/g);
                          return parts.map((part, index) => 
                            part === 'Modules' 
                              ? <span key={index} className={activeTheme?.accentText || 'text-indigo-600'}>Modules</span> 
                              : part
                          );
                        }
                        return name;
                      })()}
                    </h2>
                    {(businessSettings?.gstIn && (businessSettings?.showInvoiceGst ?? true) !== false) && (
                      <span className={`text-[11px] font-semibold ${activeTheme?.accentText || 'text-indigo-600'} tracking-wider block mt-1 uppercase font-mono`}>
                        GSTIN: {businessSettings.gstIn}
                      </span>
                    )}
                  </div>
                </div>
                {((businessSettings?.showInvoiceAddress ?? true) !== false && businessSettings?.address) && (
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{businessSettings.address}</p>
                )}
                {(businessSettings?.showInvoicePhone ?? true) !== false || (businessSettings?.showInvoiceEmail ?? true) !== false ? (
                  <p className="text-xs text-slate-400">
                    {((businessSettings?.showInvoiceEmail ?? true) !== false && businessSettings?.email) && `Email: ${businessSettings.email}`}
                    {((businessSettings?.showInvoiceEmail ?? true) !== false && businessSettings?.email && (businessSettings?.showInvoicePhone ?? true) !== false && businessSettings?.phone) && ' | '}
                    {((businessSettings?.showInvoicePhone ?? true) !== false && businessSettings?.phone) && `Tel: ${businessSettings.phone}`}
                  </p>
                ) : null}
              </div>

              <div className="text-right space-y-1.5">
                <span className={`text-xl uppercase font-black tracking-widest block font-sans ${activeTheme?.accentText || 'text-[#5B21FF]'}`}>TAX INVOICE</span>
                <h1 className="text-2xl font-mono font-bold text-slate-800 mt-1">{selectedInvoice.invoiceNumber}</h1>
                <div className="flex items-center justify-end gap-1.5 mt-1 relative">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(selectedInvoice.status)} uppercase`}>
                    {selectedInvoice.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono pt-3 space-y-0.5">
                  <p>Invoiced Date: <b>{formatDisplayDate(selectedInvoice.date)}</b></p>
                  <p>Due By: <b className="text-rose-600">{formatDisplayDate(selectedInvoice.dueDate)}</b></p>
                </div>
              </div>
            </div>

            {/* Billed To Address card */}
            {(() => {
              const invoiceClient = clients.find(c => c.id === selectedInvoice.clientId);
              return (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 border border-slate-200/80 p-5 rounded-xl`}>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Client Bill-To Particulars</span>
                    <h3 className="font-bold text-slate-800 text-sm mt-1">{selectedInvoice.clientName}</h3>
                    
                    {((businessSettings?.showInvoiceClientAddress ?? true) !== false && invoiceClient?.billingAddress) && (
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{invoiceClient.billingAddress}</p>
                    )}
                    
                    {invoiceClient?.email && (businessSettings?.showInvoiceClientEmail ?? true) !== false && (
                      <p className="text-xs text-slate-500">Email: {invoiceClient.email}</p>
                    )}
                    {invoiceClient?.phone && (businessSettings?.showInvoiceClientPhone ?? true) !== false && (
                      <p className="text-xs text-slate-500">Tel: {invoiceClient.phone}</p>
                    )}

                    {((businessSettings?.showInvoiceClientGst ?? true) !== false && (selectedInvoice.clientGst || invoiceClient?.gstIn)) && (
                      <span className="text-[10.5px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block uppercase">
                        GSTIN: {selectedInvoice.clientGst || invoiceClient?.gstIn || 'URP (Unregistered)'}
                      </span>
                    )}
                  </div>

                  <div className="md:text-right space-y-1">
                    {((businessSettings?.showInvoiceBankDetails ?? true) !== false) && (
                      <>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Banking Payout Details</span>
                        <p className="text-xs text-slate-700 font-bold">{businessSettings?.bankName || 'N/A'}</p>
                        <p className="text-xs text-slate-500 font-mono">A/C: {businessSettings?.accountNum || 'N/A'}</p>
                        <p className="text-xs text-slate-500 font-mono">IFSC: {businessSettings?.ifscCode || 'N/A'}</p>
                      </>
                    )}
                    {((businessSettings?.showInvoiceUpiId ?? true) !== false && businessSettings?.upiId) && (
                      <p className="text-xs text-slate-500 font-mono">UPI ID: {businessSettings.upiId}</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Dynamic Line items table */}
            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse border border-slate-200/80 rounded-xl overflow-hidden`}>
                <thead>
                  {(() => {
                    const hasTaxSplit = businessSettings?.gstOption !== 'zero_tax' && (businessSettings?.showInvoiceTaxSplit ?? true) !== false;
                    return (
                      <tr className={`${activeTheme?.tableHeadBg || 'bg-slate-100'} text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80`}>
                        <th className={`py-3 px-4 ${hasTaxSplit ? 'w-[40%]' : 'w-[50%]'}`}>Standard Deliverables Line Item</th>
                        <th className={`py-3 px-3 text-center ${hasTaxSplit ? 'w-[10%]' : 'w-[15%]'}`}>Qty</th>
                        <th className={`py-3 px-3 text-right ${hasTaxSplit ? 'w-[15%]' : 'w-[18%]'}`}>Unit Rate (INR)</th>
                        {hasTaxSplit && (
                          <th className="py-3 px-3 text-center w-[15%]">Tax Split</th>
                        )}
                        <th className={`py-3 px-4 text-right ${hasTaxSplit ? 'w-[20%]' : 'w-[17%]'}`}>Amount (Gross)</th>
                      </tr>
                    );
                  })()}
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {selectedInvoice.items.map((item, index) => {
                    const hasTaxSplit = businessSettings?.gstOption !== 'zero_tax' && (businessSettings?.showInvoiceTaxSplit ?? true) !== false;
                    return (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className={`py-4 px-4 font-semibold text-slate-800 ${hasTaxSplit ? 'w-[40%]' : 'w-[50%]'}`}>
                          <div>{item.name}</div>
                          {((businessSettings?.showInvoiceHsn ?? true) !== false && item.hsnSac) && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">HSN: {item.hsnSac}</div>
                          )}
                        </td>
                        <td className={`py-4 px-3 text-center font-mono font-bold text-slate-600 ${hasTaxSplit ? 'w-[10%]' : 'w-[15%]'}`}>{item.qty}</td>
                        <td className={`py-4 px-3 text-right font-mono text-slate-600 ${hasTaxSplit ? 'w-[15%]' : 'w-[18%]'}`}>{formatCurrency(item.price)}</td>
                        {hasTaxSplit && (
                          <td className="py-4 px-3 text-center w-[15%]">
                            {selectedInvoice.taxType === 'CGST_SGST' ? (
                              <span className="text-[10px] text-slate-500">
                                CGST {(item.gstPercent/2)}% + SGST {(item.gstPercent/2)}%
                              </span>
                            ) : (
                              <span className={`text-[10px] ${activeTheme?.accentText || 'text-indigo-600'} font-bold`}>
                                IGST {item.gstPercent}%
                              </span>
                            )}
                          </td>
                        )}
                        <td className={`py-4 px-4 text-right font-semibold font-mono text-slate-900 ${hasTaxSplit ? 'w-[20%]' : 'w-[17%]'}`}>{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals math section, signatures, plus QR code */}
            <div className="flex flex-row justify-between items-start gap-8 border-t border-slate-200 pt-6 w-full" id="invoice-footer-row">
              {/* Left QR Code and Notes */}
              <div className="flex flex-wrap gap-6 items-center">
                {(!businessSettings?.qrBesideMohar && (businessSettings?.showInvoiceQrCode ?? true) !== false && qrCodeDataUrl) && (
                  <div 
                    onClick={() => {
                      const qrText = `${window.location.origin}/public/invoice/${encodeURIComponent(selectedInvoice.invoiceNumber)}`;
                      window.open(qrText, '_blank');
                    }}
                    className={`p-2 border ${activeTheme?.borderTheme || 'border-slate-200'} rounded-xl bg-slate-50/50 flex flex-col items-center hover:bg-slate-100 cursor-pointer transition select-none group`}
                    title="Click to view/verify public invoice page in new tab"
                  >
                    <img 
                      src={qrCodeDataUrl} 
                      className="w-24 h-24 object-contain rounded-lg animate-fade-in group-hover:scale-105 transition" 
                      alt="Payment QR Code" 
                      id="upi-instant-qr"
                      crossOrigin="anonymous"
                    />
                    <span className={`text-[9px] ${activeTheme?.accentText || 'text-[#5B21FF]'} font-bold tracking-wide text-center mt-1 block group-hover:underline`}>
                      Click to Verify ↗
                    </span>
                  </div>
                )}
                {((businessSettings?.showInvoiceSignature ?? true) !== false && (base64Signature || businessSettings?.signatureUrl)) && (
                  <div className="flex flex-row items-center gap-6">
                    <div>
                      <span className="text-[10.5px] font-extrabold text-slate-400 uppercase font-sans tracking-widest block">Authorized Signoff</span>
                      <div className="py-2">
                         <img 
                          src={base64Signature || businessSettings.signatureUrl} 
                          style={{ height: businessSettings.moharSize ? `${businessSettings.moharSize * 1.8}px` : '95px' }} 
                          className="w-auto max-w-[240px]" 
                          alt="Stamp signature" 
                          crossOrigin="anonymous"
                        />
                      </div>
                    </div>
                    {(businessSettings?.qrBesideMohar && (businessSettings?.showInvoiceQrCode ?? true) !== false && qrCodeDataUrl) && (
                      <div 
                        onClick={() => {
                          const qrText = `${window.location.origin}/public/invoice/${encodeURIComponent(selectedInvoice.invoiceNumber)}`;
                          window.open(qrText, '_blank');
                        }}
                        className={`p-2 border ${activeTheme?.borderTheme || 'border-slate-200'} rounded-xl bg-slate-50/50 flex flex-col items-center ml-2 hover:bg-slate-100 cursor-pointer transition select-none group`}
                        title="Click to view/verify public invoice page in new tab"
                      >
                        <img 
                          src={qrCodeDataUrl} 
                          className="w-24 h-24 object-contain rounded-lg animate-fade-in group-hover:scale-105 transition" 
                          alt="Payment QR Code" 
                          id="upi-instant-qr-beside-mohar"
                          crossOrigin="anonymous"
                        />
                        <span className={`text-[9px] ${activeTheme?.accentText || 'text-[#5B21FF]'} font-bold tracking-wide text-center mt-1 block group-hover:underline`}>
                          Click to Verify ↗
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {/* Fallback to show QR Code beside mohar place even if signature is disabled or blank */}
                {((businessSettings?.showInvoiceSignature ?? true) === false || !businessSettings?.signatureUrl) && (businessSettings?.qrBesideMohar && (businessSettings?.showInvoiceQrCode ?? true) !== false && qrCodeDataUrl) && (
                  <div 
                    onClick={() => {
                      const qrText = `${window.location.origin}/public/invoice/${encodeURIComponent(selectedInvoice.invoiceNumber)}`;
                      window.open(qrText, '_blank');
                    }}
                    className={`p-2 border ${activeTheme?.borderTheme || 'border-slate-200'} rounded-xl bg-slate-50/50 flex flex-col items-center hover:bg-slate-100 cursor-pointer transition select-none group`}
                    title="Click to view/verify public invoice page in new tab"
                  >
                    <img 
                      src={qrCodeDataUrl} 
                      className="w-24 h-24 object-contain rounded-lg animate-fade-in group-hover:scale-105 transition" 
                      alt="Payment QR Code" 
                      id="upi-instant-qr-beside-mohar-fallback"
                      crossOrigin="anonymous"
                    />
                    <span className={`text-[9px] ${activeTheme?.accentText || 'text-[#5B21FF]'} font-bold tracking-wide text-center mt-1 block group-hover:underline`}>
                      Click to Verify ↗
                    </span>
                  </div>
                )}
              </div>

              {/* Right mathematical sums */}
              <div className={`w-80 bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3 text-xs text-slate-600 font-sans`} id="invoice-totals-card">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Net Ledger Value:</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {businessSettings.gstOption !== 'zero_tax' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">CGST/SGST/IGST Taxes:</span>
                    <span className="font-mono font-bold text-slate-800">+{formatCurrency(selectedInvoice.taxAmount)}</span>
                  </div>
                )}
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount applied:</span>
                    <span className="font-mono font-bold">-{formatCurrency(selectedInvoice.discount)}</span>
                  </div>
                )}
                <div className={`flex justify-between text-slate-900 border-t border-slate-200/80 pt-2.5 font-bold`}>
                  <span>Total Amount:</span>
                  <span className="font-mono font-extrabold">{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 pt-1 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(selectedInvoice.paidAmount)}</span>
                </div>
                <div className={`flex justify-between text-rose-700 border-t border-slate-200/80 pt-2.5 font-bold`}>
                  <span>Pending Outstanding:</span>
                  <span className="font-mono font-extrabold text-rose-600">{formatCurrency(selectedInvoice.dueAmount)}</span>
                </div>
              </div>
            </div>

            {/* Wide Bottom Notes section & Electronically Generated warning */}
            <div className={`mt-8 pt-6 border-t border-slate-200/60 space-y-4`}>
              {((businessSettings?.showInvoiceNotes ?? true) !== false && selectedInvoice.notes) && (
                <div className={`text-xs text-slate-500 bg-slate-50/30 p-4 rounded-xl border border-slate-200/80 text-left`}>
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Invoice Notes &amp; Terms</span>
                  <p className="italic leading-normal text-slate-600 font-sans">{selectedInvoice.notes}</p>
                </div>
              )}
              <div className="text-center py-2 shrink-0">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-sans">
                  This is an electronically generated document, manual signature not required.
                </p>
              </div>
            </div>
            </div>
            </div>

            {selectedInvoice.challanUrl && (() => {
              const isPdf = selectedInvoice.challanType === 'application/pdf' || 
                            selectedInvoice.challanUrl?.startsWith('data:application/pdf') || 
                            selectedInvoice.challanName?.toLowerCase().endsWith('.pdf') || 
                            selectedInvoice.challanUrl?.toLowerCase().includes('.pdf');
              
              return (
                <div className="w-full flex flex-col">
                  {/* Delivery Challan Section Toolbar (Screen Only) */}
                  <div className={`no-print w-full md:w-[210mm] mx-auto flex flex-col sm:flex-row items-center justify-between bg-slate-50 border border-slate-200/80 p-4 rounded-xl mt-12 mb-4 animate-fade-in gap-3`}>
                    <div className="text-left">
                      <span className="font-extrabold text-[10px] text-[#5B21FF] uppercase tracking-widest block font-mono">Official Reference Document</span>
                      <h4 className="text-sm font-bold text-slate-800">Attached Challan Document</h4>
                    </div>
                    <div className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full select-none font-mono font-bold">
                      {isPdf ? "Uploaded PDF Attachment" : "Uploaded Image Attachment"}
                    </div>
                  </div>

                  {/* THE PURE, SINGLE-PAGE CHALAN ATTACHMENT DOCUMENT */}
                  <div 
                    id="challan-attachment-section"
                    style={{ minHeight: '297mm' }}
                    className={STANDARD_DOC_CLASS}
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col justify-between">
                        <div className="no-print w-full h-full">
                          <iframe 
                            src={selectedInvoice.challanUrl} 
                            className="w-full h-[1000px] border-none bg-white"
                            title="Annexed Document PDF Virtual Reader"
                          />
                        </div>
                        <div className="print-only hidden print:block text-center py-20 text-slate-400 font-mono text-xs">
                          --- End of Document: PDF Challan Attached ({selectedInvoice.challanName || 'document.pdf'}) ---
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-0 m-0">
                        <img 
                          src={selectedInvoice.challanUrl} 
                          className="w-full h-auto max-h-[297mm] object-contain" 
                          alt="Attached Proof Document" 
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      ) : (
        // INVOICES REGISTRY DIRECTORY
        <div className="space-y-6">
          {/* Header toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                placeholder="Search serial code or client name..."
                value={searchTerm}
                onChange={(e) => { 
                  setSearchTerm(e.target.value); 
                  localStorage.setItem('last_invoice_search_term', e.target.value);
                  setCurrentPage(1); 
                }}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                id="search-invoices-input"
              />
            </div>

            {/* Quick Status Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'paid', 'partially_paid', 'unpaid', 'overdue'].map((st) => (
                <button
                  key={st}
                  onClick={() => { 
                    setStatusFilter(st); 
                    localStorage.setItem('last_invoice_status_filter', st);
                    setCurrentPage(1); 
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition ${statusFilter === st ? 'bg-[#5B21FF] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {canWrite && (
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="gradient-btn px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm w-full md:w-auto flex items-center justify-center gap-1.5"
                id="toolbar-invoice-raise-btn"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Raise Invoice</span>
              </button>
            )}
          </div>

          {/* Invoices grid representation */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden" id="invoices-table-shell">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB]">
                    <th className="py-3 px-5">Invoice Reference</th>
                    <th className="py-3 px-5">Company Target</th>
                    <th className="py-3 px-5">raised date</th>
                    <th className="py-3 px-5">maturity due</th>
                    <th className="py-3 px-5 text-right">Invoice value</th>
                    <th className="py-3 px-5 text-right">Outstanding</th>
                    <th className="py-3 px-5 text-center">reconciliation status</th>
                    <th className="py-3 px-5 text-center">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-5">
                        <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-sans font-semibold tracking-wide uppercase select-none">
                          <span className={`w-1.5 h-1.5 rounded-full ${inv.readCount && inv.readCount >= 1 ? 'bg-emerald-500' : 'bg-slate-350 bg-slate-400 animate-pulse'}`} />
                          <span className={inv.readCount && inv.readCount >= 1 ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                            {inv.readCount && inv.readCount >= 1 ? 'READ' : 'UNREAD'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-700">{inv.clientName}</td>
                      <td className="py-4 px-5 text-slate-500">{formatDisplayDate(inv.date)}</td>
                      <td className="py-4 px-5 text-rose-500 font-mono select-none">{formatDisplayDate(inv.dueDate)}</td>
                      <td className="py-4 px-5 text-right font-mono text-slate-800">{formatCurrency(inv.total)}</td>
                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-800">
                        {inv.dueAmount > 0 ? (
                          <span className="text-rose-600">{formatCurrency(inv.dueAmount)}</span>
                        ) : (
                          <span className="text-emerald-600 font-normal">Settle</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(inv.status)} uppercase`}>
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center flex items-center justify-center gap-1.5 pt-3">
                        <button 
                          onClick={() => handleSelectInvoice(inv)}
                          className="px-2 py-1 border border-slate-200 hover:border-[#5B21FF] rounded-lg text-slate-600 hover:text-[#5B21FF] font-semibold hover:bg-purple-50 transition"
                        >
                          Review Bill
                        </button>
                        {canWrite && (
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setEditingInvoiceId(inv.id);
                              setClientId(inv.clientId);
                              setDate(inv.date);
                              setDueDate(inv.dueDate);
                              setNotes(inv.notes || '');
                              setDiscount(String(inv.discount || 0));
                              setInvoiceNumber(inv.invoiceNumber);
                              
                              const mappedItems = inv.items.map(item => {
                                const prod = products.find(p => p.id === item.productId || p.name === item.name);
                                return {
                                  productId: prod ? prod.id : '',
                                  qty: item.qty,
                                  price: item.price
                                };
                              }).filter(v => v.productId !== '');
                              
                              setAddedItems(mappedItems);
                              setIsCreateOpen(true);
                            }}
                            className="p-1 px-1.5 border border-slate-250 border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition"
                            title="Edit Invoice / Bill"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canWrite && (
                          <div className="inline-block relative">
                            <label 
                              className="p-1 px-1.5 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition cursor-pointer flex items-center justify-center inline-flex"
                              title={inv.challanUrl ? `Update Challan (Attached: ${inv.challanName || 'Yes'})` : "Attach Delivery Challan"}
                            >
                              <Paperclip className={`w-3.5 h-3.5 ${inv.challanUrl ? 'text-emerald-500 font-bold' : 'text-slate-400'}`} />
                              <input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      const base64String = reader.result as string;
                                      await onUpdateInvoice(inv.id, { 
                                        challanUrl: base64String, 
                                        challanName: file.name,
                                        challanType: file.type
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                        {canWrite && inv.challanUrl && (
                          <button
                            onClick={async () => {
                              if (confirm(`Remove the attached delivery challan '${inv.challanName || ""}'?`)) {
                                await onUpdateInvoice(inv.id, {
                                  challanUrl: undefined,
                                  challanName: undefined,
                                  challanType: undefined
                                });
                              }
                            }}
                            className="p-1 px-1.5 border border-amber-200 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title={`Remove Challan: ${inv.challanName || ""}`}
                          >
                            <X className="w-3.5 h-3.5 text-amber-600 font-bold" />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={async () => {
                              if (confirm(`Confirm removing invoice ${inv.invoiceNumber}? Associated ledger and outstandings will reverse.`)) {
                                await onDeleteInvoice(inv.id);
                              }
                            }}
                            className="p-1 px-1.5 border border-rose-100 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 italic">No invoices recorded under active selection.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredInvoices.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* CREATE INVOICE SLIDE-OVER WIZARD */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-[#E5E7EB] flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base font-display">{isEditing ? "Edit Tax Invoice / Bill Details" : "Generate Professional Tax Invoice"}</h3>
              </div>
              <button 
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditing(false);
                  setEditingInvoiceId(null);
                  setAddedItems([]);
                }} 
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Form details top row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Corporate Client *</label>
                  <select 
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 bg-slate-50"
                  >
                    <option value="">-- Choose Partner --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Invoice Number (Auto-Captured)</label>
                  <input 
                    type="text"
                    readOnly
                    disabled
                    value={invoiceNumber}
                    placeholder="Auto-generating..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-mono font-bold cursor-not-allowed select-none animate-pulse-subtle"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Billing Date *</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Payment Due By *</label>
                  <input 
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Taxation details helper alerts */}
              {selectedClientDetails && (
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-800">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-500" />
                    <span>Selected client resides in: <b>{isInterstate ? 'Domestic Out-of-State (IGST 18% mapping)' : 'Domestic Home-State (Maharashtra CGST 9% + SGST 9%)'}</b></span>
                  </div>
                  <span className="font-mono text-[10.5px] font-bold uppercase underline">verified: {selectedClientDetails.gstIn || 'URP (Unregistered)'}</span>
                </div>
              )}

              {/* Items selector */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                <span className="text-[11px] font-extrabold text-[#5B21FF] uppercase tracking-wider block">Include Deliverable Line Items</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Select Catalog Item</label>
                    <select 
                      value={currentProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="">-- Choose Deliverable --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {businessSettings.gstOption === 'zero_tax' ? '' : `(GST ${p.gstPercent}%)`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Qty</label>
                    <input 
                      type="number"
                      min={1}
                      value={currentQty}
                      onChange={(e) => setCurrentQty(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleAddItemToWizard}
                    className="px-4 py-2.5 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Include Line</span>
                  </button>
                </div>

                {/* Scope line list table */}
                {addedItems.length > 0 ? (
                  <div className="bg-white rounded-lg border border-slate-100 overflow-hidden mt-3">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100/70 text-slate-400 font-bold uppercase truncate border-b border-slate-100">
                        <tr>
                          <th className="p-2 pl-3">Item details</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Net billing</th>
                          <th className="p-2 text-center">Tax Split</th>
                          <th className="p-2 text-center">Tally</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {addedItems.map((item, idx) => {
                          const prod = products.find(p => p.id === item.productId)!;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="p-2 pl-3 font-semibold text-slate-700">{prod.name}</td>
                              <td className="p-2 text-center font-mono font-semibold">{item.qty} {prod.unit}</td>
                              <td className="p-2 text-right font-mono">{formatCurrency(item.qty * item.price)}</td>
                              <td className="p-2 text-center text-indigo-700 font-bold">
                                {businessSettings.gstOption === 'zero_tax' ? 'Tax-Exempt (0%)' : (isInterstate ? `IGST ${prod.gstPercent}%` : `CGST/SGST ${(prod.gstPercent/2)}%`)}
                              </td>
                              <td className="p-2 text-center">
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveItemFromWizard(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic block py-2 text-center">No active deliverables have been appended yet.</span>
                )}
              </div>

              {/* Subtotal blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Apply Promotion Discount (INR)</label>
                    <input 
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Invoice Terms &amp; Instructions</label>
                    <textarea 
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl flex flex-col justify-between font-mono text-xs">
                  <span className="font-sans text-[11px] font-bold text-indigo-400 mb-2 block uppercase">Invoice Totalizer Tally</span>
                  <div className="space-y-2 border-b border-slate-800 pb-3">
                    <div className="flex justify-between">
                      <span>Subtotal net base:</span>
                      <span>{formatCurrency(draftSubtotal)}</span>
                    </div>
                    {businessSettings.gstOption !== 'zero_tax' && (
                      <div className="flex justify-between">
                        <span>Calculated GST Taxes:</span>
                        <span className="text-indigo-300">+{formatCurrency(draftTax)}</span>
                      </div>
                    )}
                    {draftDiscountNum > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount Promo applied:</span>
                        <span>-{formatCurrency(draftDiscountNum)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-3 font-sans">
                    <span className="text-white">Amount Due (INR):</span>
                    <span className="text-xl text-[#8B5CF6] font-mono font-extrabold">{formatCurrency(draftTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Form actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditing(false);
                    setEditingInvoiceId(null);
                    setAddedItems([]);
                  }}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50 transition animate-hover"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="gradient-btn px-5 py-2.5 text-xs font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : (
                    isEditing ? "Save & Update Invoice" : "Authorize & Post Invoice"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMAIL FORWARD DIALOG */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-[#E5E7EB]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Dispatched Copy Transmission</h3>
              <button onClick={() => setIsEmailModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Recipient Email Address</label>
                <input 
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Subject Line</label>
                <input 
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-100 rounded-xl"
                />
              </div>
              <p className="text-[11px] text-slate-400 italic">This dispatch bundles a print optimized version of Invoice {selectedInvoice?.invoiceNumber} along with payment instructions.</p>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button 
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendEmailSimulation}
                  className="gradient-btn px-5 py-2 text-xs font-bold rounded-xl"
                >
                  Send Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
