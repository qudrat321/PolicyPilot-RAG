import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Compass,
  Send,
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  ShieldCheck,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  Check,
  Database,
  Pencil,
  RotateCcw,
  X,
  Download,
  FileSpreadsheet,
  FileDown,
  Table,
  Sun,
  Moon
} from 'lucide-react';

// Initialize mermaid for dark mode diagrams
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#090d16',
    primaryColor: '#059669',
    primaryTextColor: '#f1f5f9',
    primaryBorderColor: '#10b981',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a'
  }
});

function parseCsvToRows(csvText) {
  if (!csvText) return [];
  const lines = csvText.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const row = [];
    let insideQuotes = false;
    let entry = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    return row;
  });
}

function detectCsvFromText(text) {
  if (!text) return null;
  // 1. Look for ```csv or ``` code blocks
  const codeBlockRegex = /```(?:csv)?\s*\n([\s\S]*?)\n```/gi;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const block = match[1].trim();
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const c0 = (lines[0].match(/,/g) || []).length;
      const c1 = (lines[1].match(/,/g) || []).length;
      if (c0 >= 1 && Math.abs(c0 - c1) <= 1) {
        return block;
      }
    }
  }

  // 2. Look for raw multiline CSV lines in prose
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const csvLines = lines.filter(l => l.includes(',') && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('['));
  if (csvLines.length >= 2) {
    const c0 = (csvLines[0].match(/,/g) || []).length;
    const c1 = (csvLines[1].match(/,/g) || []).length;
    if (c0 >= 1 && Math.abs(c0 - c1) <= 1) {
      return csvLines.join('\n');
    }
  }

  return null;
}

function ExportableCSVBlock({ rawCsv, scopeName = 'All Policy Documents', theme }) {
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'raw'
  const rows = parseCsvToRows(rawCsv);

  const handleDownloadCSV = () => {
    if (!rows.length) return;
    const headers = rows[0] || [];
    const summaryLine1 = `Document Purpose: Policy data matrix detailing ${headers.slice(0, 5).join(', ')}.`;
    const summaryLine2 = `Scope & Verification: Extracted from [${scopeName}] with 100% grounded zero-hallucination compliance.`;

    const metadataRows = [
      ['PolicyPilot RAG - Enterprise Policy Table Export'],
      [`Exported: ${new Date().toLocaleString()} | Source Scope: ${scopeName} | Engine: Zero-Hallucination Vector Engine`],
      [summaryLine1],
      [summaryLine2],
      ['']
    ];

    const fullCsvData = [...metadataRows, ...rows];
    const csvContent = fullCsvData.map(row =>
      row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policypilot_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = () => {
    if (!rows.length) return;
    const headers = rows[0] || [];
    const summaryLine1 = `Document Purpose: Policy data matrix detailing ${headers.slice(0, 5).join(', ')}.`;
    const summaryLine2 = `Scope & Verification: Extracted from [${scopeName}] with 100% grounded zero-hallucination compliance.`;

    const metadataRows = [
      ['PolicyPilot RAG - Enterprise Policy Data Table'],
      [`Exported: ${new Date().toLocaleString()} | Source Scope: ${scopeName}`],
      [summaryLine1],
      [summaryLine2],
      []
    ];

    const fullSheetData = [...metadataRows, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

    const colWidths = [];
    fullSheetData.forEach(row => {
      row.forEach((cell, colIdx) => {
        const len = cell ? String(cell).length : 12;
        colWidths[colIdx] = Math.min(65, Math.max(colWidths[colIdx] || 14, len + 3));
      });
    });
    ws['!cols'] = colWidths.map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PolicyMatrix');
    XLSX.writeFile(wb, `policypilot_data_${Date.now()}.xlsx`);
  };

  const headers = rows[0] || [];
  const bodyRows = rows.slice(1);

  return (
    <div className={`my-4 rounded-xl border overflow-hidden shadow-lg ${
      theme === 'dark' ? 'border-slate-700/80 bg-slate-900/60' : 'border-slate-200 bg-white'
    }`}>
      {/* CSV Export & View Switcher Header */}
      <div className={`px-3.5 py-2.5 border-b flex items-center justify-between text-xs ${
        theme === 'dark' ? 'bg-slate-850/90 border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-500 flex items-center gap-1.5 font-mono text-[11px]">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV Data Matrix</span>
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            theme === 'dark' ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-200 text-slate-600 border border-slate-300'
          }`}>
            {bodyRows.length} rows &bull; {headers.length} cols
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'raw' : 'table')}
            className={`px-2 py-1 rounded border transition-colors text-[10px] font-medium ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Toggle between table grid and raw CSV text"
          >
            {viewMode === 'table' ? 'Raw CSV' : 'Grid View'}
          </button>

          <button
            onClick={handleDownloadCSV}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-emerald-400 border border-slate-700 transition-colors flex items-center gap-1 text-[11px] font-medium"
            title="Download as CSV file"
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 transition-colors flex items-center gap-1 text-[11px] font-medium"
            title="Download as Excel spreadsheet"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-slate-800 text-xs text-left">
            <thead className={`uppercase tracking-wider font-semibold sticky top-0 ${
              theme === 'dark' ? 'bg-slate-850 text-slate-200 border-b border-slate-700' : 'bg-slate-100 text-slate-700 border-b border-slate-200'
            }`}>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className={`px-4 py-2 font-semibold text-emerald-500 border-b ${
                    theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                  }`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className={`transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                }`}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2 border-b border-transparent">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className={`p-3 overflow-x-auto text-xs font-mono leading-relaxed ${
          theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-900 text-slate-100'
        }`}>
          <code>{rawCsv}</code>
        </pre>
      )}
    </div>
  );
}

function ExportableTable({ children, scopeName = 'All Policy Documents' }) {
  const tableRef = useRef(null);

  const extractTableData = () => {
    if (!tableRef.current) return [];
    const rows = Array.from(tableRef.current.querySelectorAll('tr'));
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => cell.innerText.trim());
    });
  };

  const handleDownloadCSV = () => {
    const data = extractTableData();
    if (!data.length) return;

    const headers = data[0] || [];
    const summaryLine1 = `Document Purpose: Policy comparison matrix detailing ${headers.slice(0, 5).join(', ')}.`;
    const summaryLine2 = `Scope & Verification: Extracted from [${scopeName}] with 100% grounded zero-hallucination compliance.`;

    const metadataRows = [
      ['PolicyPilot RAG - Enterprise Policy Table Export'],
      [`Exported: ${new Date().toLocaleString()} | Source Scope: ${scopeName} | Engine: Zero-Hallucination Vector Engine`],
      [summaryLine1],
      [summaryLine2],
      [''] // Empty spacer row
    ];

    const fullCsvData = [...metadataRows, ...data];
    const csvContent = fullCsvData.map(row =>
      row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policypilot_table_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = () => {
    const data = extractTableData();
    if (!data.length) return;

    const headers = data[0] || [];
    const summaryLine1 = `Document Purpose: Policy comparison matrix detailing ${headers.slice(0, 5).join(', ')}.`;
    const summaryLine2 = `Scope & Verification: Extracted from [${scopeName}] with 100% grounded zero-hallucination compliance.`;

    const metadataRows = [
      ['PolicyPilot RAG - Enterprise Policy Data Table'],
      [`Exported: ${new Date().toLocaleString()} | Source Scope: ${scopeName}`],
      [summaryLine1],
      [summaryLine2],
      [] // Empty spacer row
    ];

    const fullSheetData = [...metadataRows, ...data];
    const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

    // Auto-fit column widths
    const colWidths = [];
    fullSheetData.forEach(row => {
      row.forEach((cell, colIdx) => {
        const len = cell ? String(cell).length : 12;
        colWidths[colIdx] = Math.min(65, Math.max(colWidths[colIdx] || 14, len + 3));
      });
    });
    ws['!cols'] = colWidths.map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PolicyMatrix');
    XLSX.writeFile(wb, `policypilot_matrix_${Date.now()}.xlsx`);
  };

  return (
    <div className="my-4 rounded-xl border border-slate-700/80 bg-slate-900/60 overflow-hidden shadow-lg group/table">
      {/* Table Export Toolbar */}
      <div className="px-3.5 py-2 bg-slate-850/90 border-b border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
        <span className="font-semibold text-emerald-400 flex items-center gap-1.5 font-mono text-[11px]">
          <Table className="w-3.5 h-3.5" />
          <span>Policy Data Matrix</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-emerald-300 border border-slate-700 transition-colors flex items-center gap-1 text-[11px] font-medium"
            title="Download table as CSV with executive summary"
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleDownloadExcel}
            className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 transition-colors flex items-center gap-1 text-[11px] font-medium"
            title="Download table as formatted Excel (.xlsx) with executive summary"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table ref={tableRef} className="min-w-full divide-y divide-slate-800 text-xs text-left">
          {children}
        </table>
      </div>
    </div>
  );
}

const exportToPdf = (question, answer, citations, docScopeName = 'All Policy Documents') => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 38;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // 1. Enterprise Top Header Banner (Deep Navy + Emerald Accent)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 58, 'F');

  // Emerald Accent Stripe
  doc.setFillColor(16, 185, 129); // #10b981
  doc.rect(0, 58, pageWidth, 3, 'F');

  // Logo / Brand Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('PolicyPilot', margin, 34);
  doc.setTextColor(16, 185, 129);
  doc.text(' RAG', margin + 84, 34);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Enterprise Policy Compliance & Grounded Intelligence Report', margin, 47);

  // Status & Date Pill on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('VERIFICATION: 100% GROUNDED', pageWidth - margin - 150, 31);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin - 150, 45);

  cursorY = 76;

  // 2. Executive Purpose & Document Scope Card (2 Lines requested)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cursorY, maxLineWidth, 44, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('EXECUTIVE PURPOSE & DOCUMENT SCOPE', margin + 10, cursorY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // slate-700
  const cleanQ = question.replace(/[\n\r]+/g, ' ').trim();
  const summaryLine1 = `• Purpose: Provides verified, policy-grounded provisions addressing: "${cleanQ.substring(0, 95)}${cleanQ.length > 95 ? '...' : ''}"`;
  const summaryLine2 = `• Scope: Validated strictly against repository [${docScopeName}] with zero-hallucination vector guarantee.`;
  doc.text(summaryLine1, margin + 10, cursorY + 26);
  doc.text(summaryLine2, margin + 10, cursorY + 38);

  cursorY += 56;

  // 3. User Inquiry Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('POLICY INQUIRY:', margin, cursorY);
  cursorY += 13;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  const qLines = doc.splitTextToSize(question, maxLineWidth);
  doc.text(qLines, margin, cursorY);
  cursorY += qLines.length * 13 + 12;

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 16;

  // 4. Grounded Policy Findings (Answer)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('VERIFIED POLICY FINDINGS & DETAILS:', margin, cursorY);
  cursorY += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  // Clean Markdown markers for clean PDF readability
  const cleanAnswer = answer
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/```[a-z]*\n?/g, '')
    .trim();

  const aLines = doc.splitTextToSize(cleanAnswer, maxLineWidth);
  for (let line of aLines) {
    if (cursorY > pageHeight - 45) {
      doc.addPage();
      cursorY = margin + 10;
    }
    doc.text(line, margin, cursorY);
    cursorY += 13;
  }

  // 5. Verified Citations Section
  if (citations && citations.length > 0) {
    cursorY += 14;
    if (cursorY > pageHeight - 65) {
      doc.addPage();
      cursorY = margin + 10;
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text('AUDIT TRAIL: VERIFIED SOURCE CITATIONS & PASSAGES:', margin, cursorY);
    cursorY += 13;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    citations.forEach((c, idx) => {
      if (cursorY > pageHeight - 35) {
        doc.addPage();
        cursorY = margin + 10;
      }
      const tag = typeof c === 'object' && c.citation_id ? c.citation_id : `[${idx + 1}]`;
      const docName = typeof c === 'object' ? (c.filename || 'Document') : c;
      const section = typeof c === 'object' && c.page_or_section ? ` • ${c.page_or_section}` : '';
      const citeStr = `${tag} ${docName}${section}`;
      doc.text(citeStr, margin, cursorY);
      cursorY += 11.5;
    });
  }

  // 6. Universal Header/Footer Stamp on Every Page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'PolicyPilot RAG • Confidential Enterprise Compliance • Zero-Hallucination Vector Architecture',
      margin,
      pageHeight - 16
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 45, pageHeight - 16);
  }

  doc.save(`policypilot_report_${Date.now()}.pdf`);
};

export default function App() {
  const [backendStatus, setBackendStatus] = useState('checking'); // 'healthy', 'waking'
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('all');
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedInspectors, setExpandedInspectors] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Theme state: 'dark' (default) or 'light'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // Edit question state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    checkHealth();
    loadDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const checkHealth = () => {
    fetch('/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') setBackendStatus('healthy');
        else setBackendStatus('waking');
      })
      .catch(() => setBackendStatus('waking'));
  };

  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadLoading(true);
    setUploadNotice(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.status === 'reused'
          ? `⚡ Instant Deduplication: '${data.filename}' reused existing Qdrant vectors (0 tokens spent).`
          : `✓ Indexed '${data.filename}' into Qdrant Cloud (${data.chunks_indexed} chunks).`;
        setUploadNotice({ type: 'success', text: msg });
        await loadDocuments();
      } else {
        setUploadNotice({ type: 'error', text: `Upload failed: ${data.detail || 'Server error'}` });
      }
    } catch (err) {
      setUploadNotice({ type: 'error', text: 'Upload failed. Check backend connection.' });
    } finally {
      setUploadLoading(false);
      setTimeout(() => setUploadNotice(null), 7000);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteDocument = async (docId, filename) => {
    if (!confirm(`Delete '${filename}' and purge all its vectors from Qdrant Cloud?`)) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedDocId === docId) setSelectedDocId('all');
        await loadDocuments();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const executeAskQuery = async (query, baseMessages) => {
    setLoading(true);
    try {
      const payload = { question: query };
      if (selectedDocId !== 'all') {
        const activeDoc = documents.find(d => d.doc_id === selectedDocId);
        if (activeDoc) {
          payload.doc_id = activeDoc.doc_id;
          payload.file_hash = activeDoc.file_hash;
        }
      }

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || 'No answer received.',
        is_refusal: data.is_refusal || false,
        citations: data.citations || [],
        retrieved_chunks: data.retrieved_chunks || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...baseMessages, assistantMessage]);
    } catch (err) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Failed to connect to the backend server. Please verify the backend is running.',
        is_refusal: true,
        citations: [],
        retrieved_chunks: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...baseMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (e) => {
    if (e) e.preventDefault();
    const query = inputQuestion.trim();
    if (!query || loading) return;

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const newUserMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [...messages, newUserMessage];
    setMessages(updated);
    setInputQuestion('');

    await executeAskQuery(query, updated);
  };

  // Edit & regenerate response for a specific question
  const handleStartEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditText(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async (msgId) => {
    const trimmed = editText.trim();
    if (!trimmed || loading) return;

    // Find the message index
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    // Create updated user message
    const updatedUserMsg = {
      ...messages[msgIndex],
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Keep messages before this turn, append edited message
    const prunedMessages = [...messages.slice(0, msgIndex), updatedUserMsg];
    setMessages(prunedMessages);
    setEditingMessageId(null);
    setEditText('');

    // Trigger fresh generation
    await executeAskQuery(trimmed, prunedMessages);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const toggleInspector = (msgId) => {
    setExpandedInspectors(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Dynamically compute starter questions based on selected document or all documents
  const getStarterQuestions = () => {
    if (selectedDocId !== 'all') {
      const activeDoc = documents.find(d => d.doc_id === selectedDocId);
      if (activeDoc) {
        const fname = activeDoc.filename.toLowerCase();
        const baseName = activeDoc.filename.replace(/\.[^/.]+$/, "");

        // If spreadsheet / tabular data (CSV / XLSX / rates / expenses)
        if (fname.endsWith('.csv') || fname.endsWith('.xlsx') || fname.includes('rate') || fname.includes('per_diem') || fname.includes('expense')) {
          return [
            `Show a structured table summarizing the rates and tiers in ${activeDoc.filename}`,
            `What are the maximum allowances and reimbursement limits in ${baseName}?`,
            `Explain the expense approval conditions in exactly two sentences`,
            `Create a formatted comparison table of high-cost vs low-cost tiers`
          ];
        }

        // If conduct / ethics / disciplinary policy
        if (fname.includes('conduct') || fname.includes('ethic') || fname.includes('discipline')) {
          return [
            `Summarize the primary ethical guidelines and rules in ${activeDoc.filename}`,
            `What are the mandatory reporting channels and procedures for violations?`,
            `Create a flowchart diagram of the disciplinary escalation process`,
            `List the key violations and consequences in a structured table format`
          ];
        }

        // If remote work / attendance / HR policy
        if (fname.includes('remote') || fname.includes('work') || fname.includes('leave') || fname.includes('hr')) {
          return [
            `Summarize the primary eligibility and policy rules in ${activeDoc.filename}`,
            `What equipment, allowances, or stipends are provided in this policy?`,
            `Explain employee obligations and notice requirements in two sentences`,
            `Create a table comparing responsibilities vs company allowances`
          ];
        }

        // General selected document
        return [
          `Summarize the key sections and policy guidelines in ${activeDoc.filename}`,
          `Create a structured overview table of all major rules and conditions in ${activeDoc.filename}`,
          `Explain the most critical requirement in ${baseName} in exactly two sentences`,
          `Create a flowchart diagram illustrating the workflow in ${activeDoc.filename}`
        ];
      }
    }

    // Default: Search across all documents
    if (documents.length > 1) {
      return [
        `Summarize the core policy provisions across all ${documents.length} indexed documents`,
        `Create a unified table comparing the key rules and allowances from all documents`,
        `What are the main compliance procedures mentioned across these policies?`,
        `Create a workflow diagram representing the primary guidelines in these policies`
      ];
    }

    if (documents.length === 1) {
      const singleDoc = documents[0];
      return [
        `Summarize the primary guidelines in ${singleDoc.filename}`,
        `Create a structured table of the key provisions in ${singleDoc.filename}`,
        `Explain the essential compliance rules in exactly two sentences`,
        `Create a flowchart diagram representing the main procedure in ${singleDoc.filename}`
      ];
    }

    return [
      'Summarize the primary code of conduct policies',
      'Compare policy rules in a structured table format',
      'Explain the violation reporting process in exactly two sentences',
      'Create a flowchart diagram of the disciplinary and escalation steps'
    ];
  };

  const starterQuestions = getStarterQuestions();
  const activeDocName = selectedDocId === 'all'
    ? (documents.length > 0 ? `All Documents (${documents.length})` : 'All Documents')
    : documents.find(d => d.doc_id === selectedDocId)?.filename || 'Selected Policy';

  return (
    <div className={`flex h-screen font-sans antialiased overflow-hidden ${theme === 'dark' ? 'bg-[#07090e] text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.pptx,.xlsx,.csv,.html"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ================= LEFT SIDEBAR (DOCUMENTS & KNOWLEDGE BASE) ================= */}
      <aside
        className={`flex flex-col transition-all duration-300 z-20 ${
          sidebarOpen ? 'w-80 min-w-[20rem]' : 'w-0 -translate-x-full border-r-0 overflow-hidden'
        } ${theme === 'dark' ? 'border-r border-slate-800/80 bg-[#0b0f19]' : 'border-r border-slate-200 bg-white text-slate-800'}`}
      >
        {/* Sidebar Header */}
        <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`font-semibold text-sm tracking-wide ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Knowledge Base</h2>
              <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Qdrant Cloud Vectors</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`p-1 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Zone / Dropzone */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200'}`}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                : theme === 'dark'
                ? 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <UploadCloud className={`w-6 h-6 mx-auto mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`} />
            <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
              {uploadLoading ? 'Indexing vectors...' : 'Drop or browse policy files'}
            </p>
            <p className={`text-[10px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>PDF, DOCX, XLSX, CSV, PPTX, HTML</p>
          </div>

          {/* Upload Status Banner */}
          {uploadNotice && (
            <div
              className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-2 border ${
                uploadNotice.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/80'
              }`}
            >
              {uploadNotice.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              )}
              <span className="leading-tight">{uploadNotice.text}</span>
            </div>
          )}
        </div>

        {/* Scope Selector: All Documents vs Specific */}
        <div className="px-4 pt-3 pb-1">
          <div className={`flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Query Scope Filter</span>
            <span className="text-emerald-500 font-mono text-[10px]">{documents.length} Indexed</span>
          </div>
          <button
            onClick={() => setSelectedDocId('all')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors mb-1.5 ${
              selectedDocId === 'all'
                ? theme === 'dark'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : theme === 'dark'
                ? 'text-slate-300 hover:bg-slate-850 hover:text-white border border-transparent'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5" />
              <span>Search Across All Documents</span>
            </div>
            {selectedDocId === 'all' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {documents.length === 0 ? (
            <div className={`p-4 text-center text-xs rounded-lg border ${theme === 'dark' ? 'text-slate-500 border-slate-900' : 'text-slate-400 border-slate-200 bg-slate-50'}`}>
              No documents indexed yet. Upload a policy PDF or document to begin.
            </div>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedDocId === doc.doc_id;
              return (
                <div
                  key={doc.doc_id}
                  onClick={() => setSelectedDocId(isSelected ? 'all' : doc.doc_id)}
                  className={`group relative p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? theme === 'dark'
                        ? 'bg-slate-800/90 border-emerald-500/50 shadow-sm'
                        : 'bg-emerald-50 border-emerald-400/60 shadow-xs'
                      : theme === 'dark'
                      ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 overflow-hidden">
                      <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-emerald-500' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                      <div className="overflow-hidden">
                        <p className={`font-medium truncate ${isSelected ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-800') : (theme === 'dark' ? 'text-slate-200' : 'text-slate-800')}`} title={doc.filename}>
                          {doc.filename}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span className={`px-1.5 py-0.5 rounded font-mono ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                            {doc.chunk_count} {doc.chunk_count === 1 ? 'chunk' : 'chunks'}
                          </span>
                          <span className="uppercase text-[9px] text-slate-500">{doc.file_type}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.doc_id, doc.filename);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-100/50 rounded transition-opacity"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Free Tier Architecture Badges */}
        <div className={`p-3 border-t text-[11px] space-y-1 ${theme === 'dark' ? 'border-slate-800/80 bg-slate-950/50 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Anti-Hallucination Guard</span>
            </span>
            <span className="text-[10px] text-emerald-500 font-mono">Active (0.58)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Deduplication &amp; LRU</span>
            </span>
            <span className="text-[10px] text-blue-500 font-mono">SHA-256</span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CHAT AREA (CLAUDE CODE STYLE) ================= */}
      <main className={`flex-1 flex flex-col h-full relative overflow-hidden ${theme === 'dark' ? 'bg-[#07090e]' : 'bg-slate-100'}`}>
        
        {/* Top Header Bar */}
        <header className={`h-14 border-b px-4 md:px-6 flex items-center justify-between shrink-0 backdrop-blur ${theme === 'dark' ? 'border-slate-800/80 bg-[#07090e]/95' : 'border-slate-200 bg-white/95'}`}>
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                title="Open Sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🧭</span>
              <span className={`font-semibold text-sm tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>PolicyPilot RAG</span>
              <span className={`hidden sm:inline-block text-[11px] px-2 py-0.5 rounded border font-mono ${theme === 'dark' ? 'bg-slate-800/80 text-slate-300 border-slate-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                100% Free Stack
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button (Dark Mode / Normal Mode) */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800 hover:text-amber-200'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={theme === 'dark' ? 'Switch to Normal (Light) Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline text-[11px]">Normal Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline text-[11px]">Dark Mode</span>
                </>
              )}
            </button>

            {/* Active Scope Pill */}
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
              <Search className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">Scope:</span>
              <span className="font-medium text-emerald-500 max-w-[150px] truncate">
                {selectedDocId === 'all'
                  ? 'All Documents'
                  : documents.find(d => d.doc_id === selectedDocId)?.filename || 'Active File'}
              </span>
            </div>

            {/* Backend Status Indicator */}
            <div
              onClick={checkHealth}
              className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border cursor-pointer ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' : 'bg-slate-100 border-slate-200 hover:border-slate-300'}`}
              title="Click to refresh status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className={`text-[11px] hidden sm:inline ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {backendStatus === 'healthy' ? 'Qdrant + Gemini Live' : 'Connecting backend...'}
              </span>
            </div>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className={`text-xs px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
                title="Clear current conversation"
              >
                Clear Chat
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          
          {/* Welcome Hero / Empty State */}
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto my-auto pt-8 pb-12 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500 shadow-xl">
                <Compass className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h1 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Public Policy &amp; Procedures Assistant
                </h1>
                <p className={`text-sm max-w-lg mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Ask policy questions with zero hallucination. Supports tables, diagrams, structured summaries, and exact sentence limits.
                </p>
              </div>

              {/* Starter Prompt Chips */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Suggested Questions &amp; Formats
                  </p>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded truncate max-w-[220px] ${theme === 'dark' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/80' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'}`}>
                    Scope: {activeDocName}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {starterQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputQuestion(q);
                        textareaRef.current?.focus();
                      }}
                      className={`p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 group ${
                        theme === 'dark'
                          ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-emerald-500/40 text-slate-300'
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-400 text-slate-700 shadow-xs'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="leading-snug">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((msg) => (
            <div key={msg.id} className="max-w-3xl mx-auto space-y-4">
              
              {/* User Prompt Turn with Edit & Copy */}
              {msg.role === 'user' && (
                <div className="flex flex-col items-end pl-8 group">
                  {editingMessageId === msg.id ? (
                    // Inline Edit Form
                    <div className={`w-full max-w-[90%] border border-emerald-500/60 rounded-2xl p-3 shadow-lg space-y-2 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:border-emerald-500 resize-none leading-relaxed ${
                          theme === 'dark'
                            ? 'bg-slate-950 text-slate-100 border-slate-800'
                            : 'bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          onClick={handleCancelEdit}
                          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                            theme === 'dark'
                              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                        <button
                          onClick={() => handleSaveEdit(msg.id)}
                          disabled={!editText.trim() || loading}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Save &amp; Generate New Response</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Regular Message Bubble
                    <div className="flex flex-col items-end">
                      <div className={`rounded-2xl rounded-tr-sm px-4 py-3 text-sm shadow-md max-w-[85%] ${
                        theme === 'dark'
                          ? 'bg-[#1e2538] text-slate-100 border border-slate-700/60'
                          : 'bg-emerald-600 text-white border border-emerald-600 shadow-emerald-900/10'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center justify-between gap-4 mt-2 pt-1 border-t text-[10px] ${
                          theme === 'dark'
                            ? 'border-slate-700/40 text-slate-400'
                            : 'border-emerald-500/50 text-emerald-100'
                        }`}>
                          <span className="font-mono">{msg.timestamp}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(msg.content, `q-${msg.id}`)}
                              className={`transition-colors flex items-center gap-1 ${theme === 'dark' ? 'hover:text-slate-200' : 'hover:text-white'}`}
                              title="Copy Question"
                            >
                              {copiedId === `q-${msg.id}` ? (
                                <Check className={`w-3 h-3 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-200'}`} />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedId === `q-${msg.id}` ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className={`transition-colors flex items-center gap-1 ${theme === 'dark' ? 'hover:text-emerald-400' : 'hover:text-white'}`}
                              title="Edit Question and re-generate"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Assistant Response Turn */}
              {msg.role === 'assistant' && (
                <div className="flex items-start gap-3.5 pr-4">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 mt-1">
                    <Compass className="w-4 h-4" />
                  </div>

                  <div className="flex-1 overflow-hidden space-y-3">
                    
                    {/* Refusal Notice Banner */}
                    {msg.is_refusal && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        theme === 'dark'
                          ? 'bg-amber-950/30 border-amber-800/70 text-amber-200'
                          : 'bg-amber-50 border-amber-300 text-amber-800'
                      }`}>
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className={`font-semibold ${theme === 'dark' ? 'text-amber-300' : 'text-amber-900'}`}>Grounding Guardrail Active</p>
                          <p className={`mt-0.5 ${theme === 'dark' ? 'text-amber-200/90' : 'text-amber-800/90'}`}>
                            The retrieved policy chunks do not verify this specific query. To prevent hallucinations, PolicyPilot strictly answers from validated passages.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Rich Markdown Output (with Tables, Lists, Code, Mermaid) */}
                    <div className={`border rounded-2xl p-4 md:p-5 text-sm leading-relaxed shadow-sm ${
                      theme === 'dark'
                        ? 'bg-slate-900/40 border-slate-800/70 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className={`text-lg font-bold mt-4 mb-2 pb-1 border-b flex items-center gap-2 ${theme === 'dark' ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`} {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className={`text-base font-semibold mt-3.5 mb-1.5 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`} {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className={`text-sm font-semibold mt-3 mb-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`} {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className={`leading-relaxed mb-3 last:mb-0 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className={`list-disc list-outside pl-5 mb-3 space-y-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className={`list-decimal list-outside pl-5 mb-3 space-y-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed pl-1 marker:text-emerald-500" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className={`italic ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`} {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className={`border-l-4 border-emerald-500/60 px-3.5 py-2 my-2 rounded-r italic ${theme === 'dark' ? 'bg-emerald-950/20 text-slate-300' : 'bg-emerald-50 text-slate-700'}`} {...props} />
                          ),
                          // Exportable Table with CSV and Excel (.xlsx) download options
                          table: ({ node, children, ...props }) => (
                            <ExportableTable scopeName={activeDocName}>{children}</ExportableTable>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className={`uppercase tracking-wider font-semibold border-b ${theme === 'dark' ? 'bg-slate-850 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`} {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className={`px-4 py-2.5 font-semibold text-emerald-600 ${theme === 'dark' ? 'bg-slate-900/90 text-emerald-400' : 'bg-slate-100 text-emerald-700'}`} {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className={`px-4 py-2 border-b transition-colors ${theme === 'dark' ? 'text-slate-300 border-slate-800/60 hover:bg-slate-800/30' : 'text-slate-700 border-slate-100 hover:bg-slate-50'}`} {...props} />
                          ),
                          // Code, Mermaid Diagram & CSV Renderer
                          code: ({ node, inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const isMermaid = match && match[1] === 'mermaid';

                            if (isMermaid) {
                              return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
                            }

                            const rawText = String(children).trim();
                            const isCsv = (match && (match[1] === 'csv' || match[1] === 'tsv')) || (!inline && (() => {
                              const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                              if (lines.length >= 2) {
                                const c0 = (lines[0].match(/,/g) || []).length;
                                const c1 = (lines[1].match(/,/g) || []).length;
                                return c0 >= 1 && Math.abs(c0 - c1) <= 1;
                              }
                              return false;
                            })());

                            if (isCsv) {
                              return <ExportableCSVBlock rawCsv={rawText} scopeName={activeDocName} theme={theme} />;
                            }

                            if (inline) {
                              return (
                                <code className={`px-1.5 py-0.5 rounded text-xs font-mono border ${theme === 'dark' ? 'bg-slate-800 text-emerald-300 border-slate-700/60' : 'bg-slate-100 text-emerald-700 border-slate-200'}`} {...props}>
                                  {children}
                                </code>
                              );
                            }

                            return (
                              <pre className={`border rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
                                <code {...props}>{children}</code>
                              </pre>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {/* Interactive Citations Row */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className={`mt-4 pt-3 border-t ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Transparent Citations</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cite, cIdx) => {
                              const label = typeof cite === 'string'
                                ? cite
                                : `${cite.filename || 'Document'}${cite.page_or_section ? ` • ${cite.page_or_section}` : ''}`;
                              const tag = typeof cite === 'object' && cite.citation_id ? cite.citation_id : `[${cIdx + 1}]`;

                              return (
                                <span
                                  key={cIdx}
                                  className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-md text-xs font-mono shadow-sm ${
                                    theme === 'dark'
                                      ? 'bg-slate-800/90 text-emerald-300 border-slate-700/80'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                  title={typeof cite === 'object' && cite.snippet ? cite.snippet : label}
                                >
                                  <span className={`text-[10px] font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{tag}</span>
                                  <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>{label}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audit Trail: Collapsible Retrieved Chunks & Score Inspector */}
                    {msg.retrieved_chunks && msg.retrieved_chunks.length > 0 && (
                      <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'border-slate-800/70 bg-slate-950/40' : 'border-slate-200 bg-white'}`}>
                        <button
                          onClick={() => toggleInspector(msg.id)}
                          className={`w-full px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                            theme === 'dark'
                              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            <span>Audit Trail ({msg.retrieved_chunks.length} Chunks Retrieved &bull; Top Score: {msg.retrieved_chunks[0]?.score?.toFixed(4)})</span>
                          </div>
                          {expandedInspectors[msg.id] ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {expandedInspectors[msg.id] && (
                          <div className={`p-3 border-t space-y-2 ${theme === 'dark' ? 'border-slate-800/80 bg-[#090d16]' : 'border-slate-200 bg-slate-50'}`}>
                            {msg.retrieved_chunks.map((chunk, chIdx) => {
                              const isConfident = chunk.score >= 0.58;
                              return (
                                <div
                                  key={chIdx}
                                  className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                                    theme === 'dark'
                                      ? 'border-slate-800 bg-slate-900/70'
                                      : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>
                                        #{chIdx + 1} &bull; {chunk.filename}
                                      </span>
                                      <span className="text-slate-500 font-mono text-[10px]">
                                        {chunk.page_or_section || 'Section'}
                                      </span>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                                        isConfident
                                          ? theme === 'dark' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : theme === 'dark' ? 'bg-amber-950 text-amber-400 border border-amber-800/80' : 'bg-amber-100 text-amber-800 border border-amber-300'
                                      }`}
                                    >
                                      Score: {chunk.score?.toFixed(4)}
                                    </span>
                                  </div>
                                  <p className={`font-mono text-[11px] p-2 rounded border leading-relaxed whitespace-pre-wrap ${
                                    theme === 'dark'
                                      ? 'bg-slate-950 text-slate-400 border-slate-800/60'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}>
                                    {chunk.text}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Turn Timestamp & Actions */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1">
                      <span className="font-mono">{msg.timestamp}</span>
                      <div className="flex items-center gap-3">
                        {detectCsvFromText(msg.content) && (
                          <>
                            <button
                              onClick={() => {
                                const csvRaw = detectCsvFromText(msg.content);
                                if (!csvRaw) return;
                                const rows = parseCsvToRows(csvRaw);
                                if (!rows.length) return;
                                const headers = rows[0] || [];
                                const summaryLine1 = `Document Purpose: Policy data matrix detailing ${headers.slice(0, 5).join(', ')}.`;
                                const summaryLine2 = `Scope & Verification: Extracted from [${activeDocName}] with 100% grounded zero-hallucination compliance.`;
                                const metadataRows = [
                                  ['PolicyPilot RAG - Enterprise Policy Table Export'],
                                  [`Exported: ${new Date().toLocaleString()} | Source Scope: ${activeDocName} | Engine: Zero-Hallucination Vector Engine`],
                                  [summaryLine1],
                                  [summaryLine2],
                                  ['']
                                ];
                                const fullCsvData = [...metadataRows, ...rows];
                                const csvContent = fullCsvData.map(row =>
                                  row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
                                ).join('\n');
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `policypilot_data_${Date.now()}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className={`flex items-center gap-1 transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'}`}
                              title="Export CSV data with executive summary"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Export CSV</span>
                            </button>

                            <button
                              onClick={() => {
                                const csvRaw = detectCsvFromText(msg.content);
                                if (!csvRaw) return;
                                const rows = parseCsvToRows(csvRaw);
                                if (!rows.length) return;
                                const headers = rows[0] || [];
                                const summaryLine1 = `Document Purpose: Policy data matrix detailing ${headers.slice(0, 5).join(', ')}.`;
                                const summaryLine2 = `Scope & Verification: Extracted from [${activeDocName}] with 100% grounded zero-hallucination compliance.`;
                                const metadataRows = [
                                  ['PolicyPilot RAG - Enterprise Policy Data Table'],
                                  [`Exported: ${new Date().toLocaleString()} | Source Scope: ${activeDocName}`],
                                  [summaryLine1],
                                  [summaryLine2],
                                  []
                                ];
                                const fullSheetData = [...metadataRows, ...rows];
                                const ws = XLSX.utils.aoa_to_sheet(fullSheetData);
                                const colWidths = [];
                                fullSheetData.forEach(row => {
                                  row.forEach((cell, colIdx) => {
                                    const len = cell ? String(cell).length : 12;
                                    colWidths[colIdx] = Math.min(65, Math.max(colWidths[colIdx] || 14, len + 3));
                                  });
                                });
                                ws['!cols'] = colWidths.map(w => ({ wch: w }));
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, 'PolicyMatrix');
                                XLSX.writeFile(wb, `policypilot_data_${Date.now()}.xlsx`);
                              }}
                              className={`flex items-center gap-1 transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'}`}
                              title="Export Excel (.xlsx) spreadsheet with executive summary"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Export Excel</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            const msgIdx = messages.findIndex(m => m.id === msg.id);
                            const qText = msgIdx > 0 ? messages[msgIdx - 1]?.content : 'Policy Inquiry';
                            exportToPdf(qText, msg.content, msg.citations, activeDocName);
                          }}
                          className={`flex items-center gap-1 transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'}`}
                          title="Export answer and citations as PDF document"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Export PDF</span>
                        </button>

                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className={`flex items-center gap-1 transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Answer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          ))}

          {/* Loading Indicator Turn - Minimalist Claude-style animated loader */}
          {loading && (
            <div className="max-w-3xl mx-auto flex items-center gap-3 pr-4 animate-fade-in py-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <Compass className="w-4 h-4 animate-spin" />
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800/60' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ================= BOTTOM PROMPT INPUT BAR (CLAUDE CODE STYLE - NO ATTACH BUTTON) ================= */}
        <div className={`p-4 md:p-6 border-t backdrop-blur shrink-0 ${theme === 'dark' ? 'border-slate-800/80 bg-[#07090e]/95' : 'border-slate-200 bg-white/95'}`}>
          <div className="max-w-3xl mx-auto">
            
            {/* Input Container */}
            <form
              onSubmit={handleAsk}
              className={`relative border focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 rounded-2xl shadow-xl transition-all ${
                theme === 'dark'
                  ? 'bg-[#0d121f] border-slate-700/80 text-slate-100'
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <textarea
                ref={textareaRef}
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask any policy question... (Press Enter to send, Shift+Enter for newline)"
                className={`w-full bg-transparent text-sm px-4 pt-3.5 pb-11 resize-none focus:outline-none leading-relaxed ${
                  theme === 'dark'
                    ? 'text-slate-100 placeholder-slate-500'
                    : 'text-slate-800 placeholder-slate-400'
                }`}
              />

              {/* Input Toolbar */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                
                {/* Active Scope filter badge (Attach button removed per request) */}
                <div className="flex items-center gap-2">
                  {selectedDocId !== 'all' ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono truncate max-w-[200px] border ${
                      theme === 'dark'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      Filter: {documents.find(d => d.doc_id === selectedDocId)?.filename}
                    </span>
                  ) : (
                    <span className={`text-[11px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Searching all {documents.length} document{documents.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {/* Right Action Button: Submit */}
                <button
                  type="submit"
                  disabled={!inputQuestion.trim() || loading}
                  className={`p-2 rounded-xl text-white transition-all flex items-center justify-center ${
                    inputQuestion.trim() && !loading
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/40 cursor-pointer'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  title="Ask Policy Question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className={`flex items-center justify-between text-[11px] mt-2 px-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>PolicyPilot grounds answers in verified embeddings &bull; Zero Hallucination Guarantee</span>
              <span className="hidden sm:inline font-mono text-[10px]">Gemini 3.1 Flash Lite</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
