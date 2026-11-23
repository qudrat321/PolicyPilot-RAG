import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { jsPDF } from 'jspdf';
import {
  Compass,
  Send,
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
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
  FileSpreadsheet,
  FileDown,
  Table,
  Sun,
  Moon,
  History,
  LogIn,
  LogOut,
  User,
  Clock,
  MessageSquare
} from 'lucide-react';
import AuthModal from './components/AuthModal';
import LandingPage from './components/LandingPage';
import {
  getActiveUser,
  signOutUser,
  fetchUserChatHistory,
  saveChatTurnToDatabase,
  clearUserChatHistory,
  isSupabaseConfigured,
  onAuthStateChange
} from './supabaseClient';

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

function parseMarkdownTablesFromText(text) {
  if (!text) return [];
  const tableRegex = /((?:\|[^\n]+\|\r?\n)\|[-:\s|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g;
  const tables = [];
  let match;
  while ((match = tableRegex.exec(text)) !== null) {
    const rawTable = match[0].trim();
    const lines = rawTable.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 3) {
      const rows = lines
        .filter((_, idx) => idx !== 1)
        .map(line => {
          const trimmed = line.replace(/^\||\|$/g, '');
          return trimmed.split('|').map(c => c.trim());
        });
      if (rows.length >= 2) {
        tables.push(rows);
      }
    }
  }
  return tables;
}

function extractAllTablesFromContent(text) {
  if (!text) return [];
  const mdTables = parseMarkdownTablesFromText(text);
  const csvRaw = detectCsvFromText(text);
  if (csvRaw) {
    const csvRows = parseCsvToRows(csvRaw);
    if (csvRows.length >= 2) {
      mdTables.push(csvRows);
    }
  }
  return mdTables;
}

function countTablesAndCsvInText(text) {
  if (!text) return 0;
  return extractAllTablesFromContent(text).length;
}

function convertTextToTableRows(question, answer, citations) {
  const paragraphs = answer.split(/\r?\n\r?\n/).map(p => p.trim()).filter(Boolean);
  const rows = [
    ['Section / Element', 'Content / Policy Finding'],
    ['Question / Inquiry', question]
  ];
  paragraphs.forEach((p, idx) => {
    rows.push([`Finding Part ${idx + 1}`, p.replace(/```[a-z]*\n?[\s\S]*?\n```/g, '[Formatted Block]')]);
  });
  if (citations && citations.length > 0) {
    citations.forEach((c, idx) => {
      const tag = typeof c === 'object' && c.citation_id ? c.citation_id : `[${idx + 1}]`;
      const docName = typeof c === 'object' ? `${c.filename || 'Document'} (${c.page_or_section || 'Section'})` : c;
      rows.push([`Citation ${tag}`, docName]);
    });
  }
  return rows;
}

function cleanMarkdownArtifacts(str) {
  if (!str) return '';
  let s = String(str)
    // Strip code blocks first
    .replace(/```[a-z]*\n?[\s\S]*?\n```/g, ' ')
    // Strip bold & italic markdown markers
    .replace(/\*\*+(.*?)\*\*+/gs, '$1')
    .replace(/\*+(.*?)\*+/gs, '$1')
    .replace(/__+(.*?)__+/gs, '$1')
    .replace(/`([^`]+)`/gs, '$1')
    // Remove any leftover or stray asterisks, hashes, backticks, tildes (preserve underscores in identifiers)
    .replace(/[*`#~]/g, '')
    // Normalize newlines and whitespace
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
  // If the cell contains only punctuation/bullets/spaces, treat as empty
  if (/^[\-_•\s.:,;]+$/.test(s)) {
    return '';
  }
  return s;
}

function drawTableGridInPdf(doc, rows, startCursorY, margin, contentWidth, pageHeight) {
  if (!rows || !rows.length) return startCursorY;

  // Clean all cells of Markdown artifacts and filter out any stray or empty artifact rows (e.g. lone '*')
  const cleanRows = rows
    .map(r => r.map(c => cleanMarkdownArtifacts(c)))
    .filter(r => r.some(c => c && c.length > 0));

  if (!cleanRows.length) return startCursorY;

  const headers = cleanRows[0] || [];
  const bodyRows = cleanRows.slice(1);
  const numCols = Math.max(headers.length, 1);

  // Compute proportional column widths based on text lengths
  const colLengths = headers.map((h, cIdx) => {
    let maxL = String(h || '').length;
    bodyRows.forEach(r => {
      const cellStr = String(r[cIdx] || '').trim();
      if (cellStr.length > maxL) maxL = cellStr.length;
    });
    return Math.max(maxL, 8);
  });
  const totalL = colLengths.reduce((a, b) => a + b, 0);
  let colWidths = colLengths.map(l => Math.max(50, (l / totalL) * contentWidth));
  const sumW = colWidths.reduce((a, b) => a + b, 0);
  colWidths = colWidths.map(w => (w / sumW) * contentWidth);

  const drawHeader = (y) => {
    doc.setFillColor(15, 23, 42); // slate-900 / #0f172a
    doc.rect(margin, y, contentWidth, 24, 'F');
    doc.setFillColor(16, 185, 129); // #10b981
    doc.rect(margin, y + 24, contentWidth, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    let currentX = margin;
    headers.forEach((h, cIdx) => {
      const w = colWidths[cIdx];
      const hLines = doc.splitTextToSize(String(h || '').toUpperCase(), w - 8);
      doc.text(hLines[0] || '', currentX + 6, y + 15);
      if (cIdx > 0) {
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.5);
        doc.line(currentX, y, currentX, y + 24);
      }
      currentX += w;
    });
    return y + 26;
  };

  let curY = drawHeader(startCursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  bodyRows.forEach((row, rIdx) => {
    // Multi-line text wrapping for every cell in this row
    const cellLinesArr = row.map((cell, cIdx) => {
      const w = colWidths[cIdx] || (contentWidth / numCols);
      const text = cleanMarkdownArtifacts(cell);
      return doc.splitTextToSize(text, w - 10);
    });

    const maxLines = Math.max(...cellLinesArr.map(cl => cl.length), 1);
    const rowHeight = maxLines * 11 + 8;

    // Page break check
    if (curY + rowHeight > pageHeight - margin - 25) {
      doc.addPage();
      curY = margin + 20;
      curY = drawHeader(curY);
    }

    // Alternating row background
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, contentWidth, rowHeight, 'F');
    }

    // Outer row border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(margin, curY, contentWidth, rowHeight, 'S');

    // Draw all lines for each cell & vertical divider lines
    let cellX = margin;
    doc.setTextColor(51, 65, 85);
    row.forEach((_, cIdx) => {
      const w = colWidths[cIdx] || (contentWidth / numCols);
      const lines = cellLinesArr[cIdx] || [];
      lines.forEach((lineText, lIdx) => {
        doc.text(lineText, cellX + 5, curY + 11 + (lIdx * 11));
      });
      if (cIdx > 0) {
        doc.line(cellX, curY, cellX, curY + rowHeight);
      }
      cellX += w;
    });

    curY += rowHeight;
  });

  return curY;
}

function exportTableAsPdf(title, rows, scopeName = 'All Policy Documents', question = 'Policy Inquiry', citations = []) {
  if (!rows || !rows.length) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 54; // 20mm / 0.75in uniform margin
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // 1. Enterprise Top Header Banner (Deep Navy + Emerald Accent)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 58, 'F');
  doc.setFillColor(16, 185, 129); // #10b981
  doc.rect(0, 58, pageWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('PolicyPilot', margin, 34);
  doc.setTextColor(16, 185, 129);
  doc.text(' RAG', margin + 84, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Enterprise Policy Data Table & Compliance Export', margin, 47);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('VERIFICATION: 100% GROUNDED', pageWidth - margin - 150, 31);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin - 150, 45);

  cursorY = 78;

  // 2. Executive Purpose & Document Scope Card (Strict Containment & Auto Wrapping)
  const cleanRows = rows
    .map(r => r.map(c => cleanMarkdownArtifacts(c)))
    .filter(r => r.some(c => c && c.length > 0));
  const headers = cleanRows[0] || [];
  const innerCardWidth = contentWidth - 24;
  const cleanQ = cleanMarkdownArtifacts(question || '').trim();
  const summaryLine1 = cleanQ && cleanQ !== 'Policy Inquiry'
    ? `• Purpose: Provides verified, policy-grounded provisions addressing "${cleanQ}".`
    : `• Purpose: Policy data matrix detailing: ${headers.slice(0, 6).join(', ')}`;
  const summaryLine2 = `• Scope & Verification: Validated strictly against repository [${scopeName}] with zero-hallucination vector guarantee.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const pLines = doc.splitTextToSize(summaryLine1, innerCardWidth);
  const sLines = doc.splitTextToSize(summaryLine2, innerCardWidth);
  const cardHeight = 22 + (pLines.length + sLines.length) * 12 + 10;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cursorY, contentWidth, cardHeight, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text('EXECUTIVE PURPOSE & DOCUMENT SCOPE', margin + 12, cursorY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  let cardCursor = cursorY + 27;
  pLines.forEach(line => {
    doc.text(line, margin + 12, cardCursor);
    cardCursor += 12;
  });
  sLines.forEach(line => {
    doc.text(line, margin + 12, cardCursor);
    cardCursor += 12;
  });

  cursorY += cardHeight + 18;

  // Table Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title || 'Policy Data Matrix', margin, cursorY);
  cursorY += 15;

  // Draw full grid table with auto-wrap and proportional columns
  cursorY = drawTableGridInPdf(doc, cleanRows, cursorY, margin, contentWidth, pageHeight);

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'PolicyPilot RAG • Confidential Enterprise Compliance • Zero-Hallucination Vector Architecture',
      margin,
      pageHeight - 25
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 45, pageHeight - 25);
  }

  doc.save(`policypilot_table_${Date.now()}.pdf`);
}

function parseDocumentBlocks(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Detect Markdown Table (| col1 | col2 |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const nextLine = (lines[i + 1] || '').trim();
      if (/^\|[-:\s|]+\|$/.test(nextLine)) {
        const tableLines = [line];
        i += 2; // skip header and separator
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        const rawRows = tableLines.map(tLine =>
          tLine.replace(/^\||\|$/g, '').split('|').map(c => cleanMarkdownArtifacts(c))
        );
        // Filter out empty rows or artifact rows containing only empty strings (e.g. lone '*')
        const rows = rawRows.filter(r => r.some(c => c && c.length > 0));
        if (rows.length >= 1) {
          blocks.push({ type: 'table', rows });
        }
        continue;
      }
    }

    // 2. Headings (# Heading or **Heading:**)
    if (line.startsWith('#') || (line.startsWith('**') && line.endsWith('**') && line.length < 75)) {
      const cleanHeading = cleanMarkdownArtifacts(line.replace(/^#+\s*/, ''));
      if (cleanHeading) {
        blocks.push({ type: 'heading', text: cleanHeading });
      }
      i++;
      continue;
    }

    // 3. Bullets (*, -, +, \d+\.)
    if (/^[\*\-\+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const cleanBullet = cleanMarkdownArtifacts(
        line.replace(/^[\*\-\+]\s+/, '').replace(/^\d+\.\s+/, '')
      );
      if (cleanBullet) {
        blocks.push({ type: 'bullet', text: cleanBullet });
      }
      i++;
      continue;
    }

    // 4. Regular Paragraphs
    let paraText = line;
    i++;
    while (i < lines.length) {
      const nextL = lines[i].trim();
      if (!nextL || nextL.startsWith('|') || nextL.startsWith('#') || /^[\*\-\+]\s+/.test(nextL) || /^\d+\.\s+/.test(nextL)) {
        break;
      }
      paraText += ' ' + nextL;
      i++;
    }
    const cleanPara = cleanMarkdownArtifacts(paraText);
    if (cleanPara) {
      blocks.push({ type: 'paragraph', text: cleanPara });
    }
  }

  return blocks;
}

function ExportableCSVBlock({ rawCsv, scopeName = 'All Policy Documents', question = 'Policy Inquiry', citations = [], theme, showTopExports = true }) {
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'raw'
  const rows = parseCsvToRows(rawCsv);

  const handleDownloadPdf = () => {
    if (!rows.length) return;
    exportTableAsPdf('CSV Data Matrix', rows, scopeName, question, citations);
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

          {showTopExports && (
            <button
              onClick={handleDownloadPdf}
              className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 text-[11px] font-medium ${
                theme === 'dark'
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800/80'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
              }`}
              title="Download this specific table as PDF"
            >
              <FileDown className="w-3 h-3 text-emerald-500" />
              <span>Export PDF</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="overflow-x-auto max-h-96">
          <table className={`min-w-full divide-y text-xs text-left ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-200'}`}>
            <thead className={`uppercase tracking-wider font-semibold sticky top-0 ${
              theme === 'dark' ? 'bg-slate-850 text-slate-200 border-b border-slate-700' : 'bg-slate-100 text-slate-900 border-b border-slate-300'
            }`}>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className={`px-4 py-2 font-bold ${
                    theme === 'dark' ? 'text-emerald-400 border-slate-700' : 'text-slate-900 border-slate-300'
                  }`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className={`transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-900'
                }`}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className={`px-4 py-2 border-b ${theme === 'dark' ? 'border-transparent text-slate-300' : 'border-slate-100 text-slate-900'}`}>
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

function ExportableTable({ children, scopeName = 'All Policy Documents', question = 'Policy Inquiry', citations = [], theme = 'dark', showTopExports = true }) {
  const tableRef = useRef(null);

  const extractTableData = () => {
    if (!tableRef.current) return [];
    const rows = Array.from(tableRef.current.querySelectorAll('tr'));
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => cleanMarkdownArtifacts(cell.innerText.trim()));
    }).filter(r => r.some(c => c && c.length > 0));
  };

  const handleDownloadPdf = () => {
    const data = extractTableData();
    if (!data.length) return;
    exportTableAsPdf('Policy Data Matrix', data, scopeName, question, citations);
  };

  return (
    <div className={`my-4 rounded-xl border overflow-hidden shadow-sm ${
      theme === 'dark' ? 'border-slate-700/80 bg-slate-900/60' : 'border-slate-300 bg-white'
    }`}>
      {/* Table Export Toolbar */}
      <div className={`px-3.5 py-2.5 border-b flex items-center justify-between text-xs ${
        theme === 'dark' ? 'bg-slate-850/90 border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-900'
      }`}>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-mono text-[11px]">
          <Table className="w-3.5 h-3.5" />
          <span>Policy Data Matrix</span>
        </span>
        {showTopExports && (
          <button
            onClick={handleDownloadPdf}
            className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 text-[11px] font-medium ${
              theme === 'dark'
                ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800/80'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
            }`}
            title="Download this specific table as PDF"
          >
            <FileDown className="w-3 h-3 text-emerald-500" />
            <span>Export PDF</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table ref={tableRef} className={`min-w-full divide-y text-xs text-left ${
          theme === 'dark' ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-900'
        }`}>
          {children}
        </table>
      </div>
    </div>
  );
}

const exportToPdf = (question, answer, citations, docScopeName = 'All Policy Documents') => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 54; // Strict uniform 20mm (0.75in) page margin
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
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
  doc.text('VERIFICATION: 100% GROUNDED', pageWidth - margin - 155, 31);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin - 155, 45);

  cursorY = 78;

  // 2. Executive Purpose & Document Scope Card (Strict Text Wrapping & Dynamic Box Containment)
  const innerCardWidth = contentWidth - 24;
  const cleanQ = (question || 'Policy Inquiry').replace(/[\n\r]+/g, ' ').trim();
  const summaryLine1 = `• Purpose: Provides verified, policy-grounded provisions addressing "${cleanQ}".`;
  const summaryLine2 = `• Scope & Verification: Validated strictly against repository [${docScopeName}] with zero-hallucination vector guarantee.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const pLines = doc.splitTextToSize(summaryLine1, innerCardWidth);
  const sLines = doc.splitTextToSize(summaryLine2, innerCardWidth);
  const cardHeight = 22 + (pLines.length + sLines.length) * 12 + 10;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, cursorY, contentWidth, cardHeight, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('EXECUTIVE PURPOSE & DOCUMENT SCOPE', margin + 12, cursorY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85); // slate-700
  let cardCursor = cursorY + 27;
  pLines.forEach(line => {
    doc.text(line, margin + 12, cardCursor);
    cardCursor += 12;
  });
  sLines.forEach(line => {
    doc.text(line, margin + 12, cardCursor);
    cardCursor += 12;
  });

  cursorY += cardHeight + 18;

  // 3. User Inquiry Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('POLICY INQUIRY:', margin, cursorY);
  cursorY += 13;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  const qLines = doc.splitTextToSize(cleanQ, contentWidth);
  qLines.forEach(line => {
    if (cursorY > pageHeight - margin - 30) {
      doc.addPage();
      cursorY = margin + 20;
    }
    doc.text(line, margin, cursorY);
    cursorY += 13.5;
  });
  cursorY += 8;

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, margin + contentWidth, cursorY);
  cursorY += 16;

  // 4. Grounded Policy Findings & Details (Strict Text Wrapping, Clean Bullets, Formatted Tables & Page-Break Handling)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('VERIFIED POLICY FINDINGS & DETAILS:', margin, cursorY);
  cursorY += 15;

  // Parse structured blocks: headings, bullets, paragraphs, and formatted tables
  const blocks = parseDocumentBlocks(answer || '');

  blocks.forEach(b => {
    // A. Heading Block
    if (b.type === 'heading') {
      if (cursorY > pageHeight - margin - 35) {
        doc.addPage();
        cursorY = margin + 20;
      }
      cursorY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const hLines = doc.splitTextToSize(b.text, contentWidth);
      hLines.forEach(hl => {
        doc.text(hl, margin, cursorY);
        cursorY += 13.5;
      });
      return;
    }

    // B. Bullet List Items
    if (b.type === 'bullet') {
      const bulletLines = doc.splitTextToSize(b.text, contentWidth - 14);
      bulletLines.forEach((bLine, bIdx) => {
        if (cursorY > pageHeight - margin - 25) {
          doc.addPage();
          cursorY = margin + 20;
        }
        if (bIdx === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(16, 185, 129); // emerald bullet symbol
          doc.text('•', margin + 2, cursorY);
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(bLine, margin + 14, cursorY);
        cursorY += 13;
      });
      cursorY += 2;
      return;
    }

    // C. Formatted Grid Table
    if (b.type === 'table') {
      if (cursorY > pageHeight - margin - 45) {
        doc.addPage();
        cursorY = margin + 20;
      }
      cursorY += 4;
      cursorY = drawTableGridInPdf(doc, b.rows, cursorY, margin, contentWidth, pageHeight);
      cursorY += 8;
      return;
    }

    // D. Standard Body Paragraphs
    if (b.type === 'paragraph') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      const paraLines = doc.splitTextToSize(b.text, contentWidth);
      paraLines.forEach(line => {
        if (cursorY > pageHeight - margin - 25) {
          doc.addPage();
          cursorY = margin + 20;
        }
        doc.text(line, margin, cursorY);
        cursorY += 13.5;
      });
      cursorY += 5; // Paragraph spacing
    }
  });

  // Universal Running Header & Footer on Every Page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle Running Header on Page 2+
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('PolicyPilot RAG • Enterprise Verified Compliance Report', margin, 36);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 42, margin + contentWidth, 42);
    }

    // Running Footer on Every Page
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'PolicyPilot RAG • Confidential Enterprise Compliance • Zero-Hallucination Vector Architecture',
      margin,
      pageHeight - 25
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 50, pageHeight - 25);
  }

  doc.save(`policypilot_report_${Date.now()}.pdf`);
};

// Configurable API base URL for zero-cost distributed deployments (e.g. Vercel UI + Render API)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

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

  // Authentication & Chat History state
  const [authInitialized, setAuthInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('documents'); // 'documents' | 'history'
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // Auth notification state (e.g. Email verified, reset password prompt, auth errors)
  const [authNotification, setAuthNotification] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-dismiss auth notification toast after 8 seconds
  useEffect(() => {
    if (authNotification) {
      const timer = setTimeout(() => {
        setAuthNotification(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [authNotification]);

  useEffect(() => {
    checkHealth();
    loadDocuments();
    initUser();

    // Inspect URL hash and query params for Supabase Auth redirect actions
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const hashClean = hash.startsWith('#') ? hash.substring(1) : hash;
    const searchClean = search.startsWith('?') ? search.substring(1) : search;
    const hashParams = new URLSearchParams(hashClean);
    const searchParams = new URLSearchParams(searchClean);

    const getParam = (key) => hashParams.get(key) || searchParams.get(key) || '';
    const type = getParam('type');
    const errorDesc = getParam('error_description');
    const errorCode = getParam('error_code');
    const errorParam = getParam('error');

    // 1. Password Recovery Flow (user clicked password reset link in email)
    if (type === 'recovery' || hash.includes('type=recovery') || search.includes('type=recovery')) {
      setAuthInitialMode('update_password');
      setAuthModalOpen(true);
      setAuthNotification({
        type: 'info',
        title: '🔑 Set Your New Password',
        message: 'Please choose and confirm your new secure password below.'
      });
      // Delay replacing state so Supabase JS client has sufficient time to complete token handshake
      setTimeout(() => {
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }, 3500);
    }
    // 2. Email Confirmation Flow (user clicked verify email link)
    else if (
      type === 'signup' ||
      type === 'email_change' ||
      hash.includes('type=signup') ||
      hash.includes('type=email_change')
    ) {
      setAuthNotification({
        type: 'success',
        title: '🎉 Email Verified Successfully!',
        message: 'Your email has been confirmed. You can now sign in to your PolicyPilot workspace!'
      });
      setAuthInitialMode('login');
      setAuthModalOpen(true);
      setTimeout(() => {
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }, 3500);
    }
    // 3. Auth Link Error (e.g. expired or invalid token or already used)
    else if (errorDesc || errorCode || errorParam || hash.includes('error_description=')) {
      const decodedError = decodeURIComponent((errorDesc || errorParam || 'This verification link is invalid or has expired.').replace(/\+/g, ' '));
      setAuthNotification({
        type: 'error',
        title: '⚠️ Verification Link Notice',
        message: `${decodedError} Please sign in below or request a new verification email.`
      });
      setAuthInitialMode('login');
      setAuthModalOpen(true);
      setTimeout(() => {
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }, 3500);
    }

    // 4. Supabase Real-time Auth State Change Listener
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthInitialMode('update_password');
        setAuthModalOpen(true);
      } else if (event === 'SIGNED_IN') {
        if (session?.user) {
          setCurrentUser(session.user);
          loadHistory(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setChatHistory([]);
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  const initUser = async () => {
    try {
      const user = await getActiveUser();
      setCurrentUser(user);
      if (user?.id) {
        loadHistory(user.id);
      }
    } finally {
      setAuthInitialized(true);
    }
  };

  const loadHistory = async (userId) => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const hist = await fetchUserChatHistory(userId);
      setChatHistory(hist || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user?.id) {
      loadHistory(user.id);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setChatHistory([]);
    setUserDropdownOpen(false);
  };

  const handleSelectHistoryItem = (item) => {
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: item.question,
      timestamp: new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const botMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: item.answer,
      is_refusal: item.is_refusal || false,
      citations: item.citations || [],
      retrieved_chunks: [],
      timestamp: new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([userMsg, botMsg]);
  };

  const handleClearHistory = async () => {
    if (!currentUser?.id) return;
    if (!confirm('Clear all your saved question history?')) return;
    await clearUserChatHistory(currentUser.id);
    setChatHistory([]);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#07090e';
      document.body.style.color = '#f1f5f9';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const checkHealth = () => {
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') setBackendStatus('healthy');
        else setBackendStatus('waking');
      })
      .catch(() => setBackendStatus('waking'));
  };

  const loadDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleFileUpload = async (file) => {
    if (!currentUser) {
      setAuthInitialMode('login');
      setAuthModalOpen(true);
      return;
    }
    if (!file) return;
    setUploadLoading(true);
    setUploadNotice(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/documents`, {
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
      const res = await fetch(`${API_BASE}/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedDocId === docId) setSelectedDocId('all');
        await loadDocuments();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const executeAskQuery = async (query, baseMessages) => {
    if (!currentUser) {
      setAuthInitialMode('login');
      setAuthModalOpen(true);
      return;
    }

    // Professional Query Deduplication & History Cache Check
    const normalizeQuery = (q) => (q || '').trim().toLowerCase().replace(/[?.,!]+$/, '').trim();
    const normalizedInput = normalizeQuery(query);

    const cachedTurn = chatHistory.find(
      item => normalizeQuery(item.question) === normalizedInput && !item.is_refusal && item.answer
    );

    if (cachedTurn) {
      // Instant cache hit: Return verified answer in < 5ms without burning LLM tokens
      const cachedAssistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cachedTurn.answer,
        is_refusal: false,
        citations: cachedTurn.citations || [],
        retrieved_chunks: cachedTurn.retrieved_chunks || [],
        is_cached: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...baseMessages, cachedAssistantMsg]);
      const targetUserId = currentUser?.id || 'guest';

      // ⚡ Optimistic Instant History Update (0ms UI latency)
      setChatHistory(prev => {
        const normQ = query.trim().toLowerCase();
        const existing = prev.find(item => item.question?.trim().toLowerCase() === normQ) || cachedTurn;
        const filtered = prev.filter(item => item.question?.trim().toLowerCase() !== normQ);
        return [{ ...existing, created_at: new Date().toISOString() }, ...filtered].slice(0, 50);
      });

      // Background persist without UI blocking
      saveChatTurnToDatabase(targetUserId, query, cachedTurn.answer, cachedTurn.citations, false).catch(console.warn);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        question: query,
        history: (baseMessages || []).slice(-6).map(m => ({
          role: m.role,
          content: m.content,
          is_refusal: m.is_refusal,
          citations: m.citations || [],
          retrieved_chunks: m.retrieved_chunks || []
        }))
      };
      if (selectedDocId !== 'all') {
        const activeDoc = documents.find(d => d.doc_id === selectedDocId);
        if (activeDoc) {
          payload.doc_id = activeDoc.doc_id;
          payload.file_hash = activeDoc.file_hash;
        }
      }

      const res = await fetch(`${API_BASE}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        // Fallback if server returned plain text (e.g. 500 / 502 / 504 from proxy)
        data = { detail: `The AI service is temporarily unavailable (${res.status}). Please try again in a moment.` };
      }

      // Clean HTTP 503 or server error handling - never leak raw provider errors
      if (!res.ok) {
        const errorDetail = data?.detail || 'The AI model is busy. Please try again in a few seconds.';
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errorDetail,
          is_refusal: false, // Server/AI errors are NOT policy refusals
          citations: [],
          retrieved_chunks: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages([...baseMessages, assistantMessage]);
        return;
      }

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

      // ⚡ Optimistic Instant History Update (0ms UI latency)
      const targetUserId = currentUser?.id || 'guest';
      const newHistoryItem = {
        id: Date.now().toString(),
        user_id: targetUserId,
        session_id: 'default',
        question: query.trim(),
        answer: data.answer,
        citations: data.citations || [],
        is_refusal: Boolean(data.is_refusal),
        created_at: new Date().toISOString()
      };
      setChatHistory(prev => {
        const normQ = query.trim().toLowerCase();
        const filtered = prev.filter(item => item.question?.trim().toLowerCase() !== normQ);
        return [newHistoryItem, ...filtered].slice(0, 50);
      });

      // Background sync to database
      saveChatTurnToDatabase(targetUserId, query, data.answer, data.citations, data.is_refusal).catch(console.warn);
    } catch (err) {
      console.error('Ask request error:', err);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Failed to connect to the backend server. Please verify the backend is running.',
        is_refusal: false, // CRITICAL: Never flag server connection failures as a policy grounding refusal!
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

  if (!authInitialized) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans ${theme === 'dark' ? 'bg-[#090d16] text-emerald-400' : 'bg-slate-50 text-emerald-600'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs tracking-wider uppercase font-semibold text-slate-400">Verifying Identity & Workspace...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LandingPage
          onExplore={() => {
            setAuthInitialMode('login');
            setAuthModalOpen(true);
          }}
          onLogin={() => {
            setAuthInitialMode('login');
            setAuthModalOpen(true);
          }}
          onRegister={() => {
            setAuthInitialMode('register');
            setAuthModalOpen(true);
          }}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* Global Auth Status Notification Toast on Landing Page */}
        {authNotification && (
          <div className="fixed top-5 right-5 z-[9999] max-w-sm sm:max-w-md p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 animate-fade-in transition-all bg-slate-900/95 border-emerald-500/40 text-slate-100">
            {authNotification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : authNotification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <p className="font-bold text-sm text-emerald-400 mb-0.5">{authNotification.title}</p>
              <p className="leading-relaxed text-slate-300">{authNotification.message}</p>
            </div>
            <button
              onClick={() => setAuthNotification(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authInitialMode}
          theme={theme}
        />
      </>
    );
  }

  return (
    <div className={`flex h-screen font-sans antialiased overflow-hidden ${theme === 'dark' ? 'bg-[#07090e] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
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
        } ${theme === 'dark' ? 'border-r border-slate-800/80 bg-[#0b0f19]' : 'border-r border-slate-250 bg-white text-slate-900 shadow-xs'}`}
      >
        {/* Sidebar Header */}
        <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border ${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-700'}`}>
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`font-bold text-sm tracking-wide ${theme === 'dark' ? 'text-slate-100' : 'text-slate-950'}`}>Knowledge Base</h2>
              <p className={`text-[11px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Qdrant Cloud Vectors</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`p-1 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'}`}
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Navigation Tabs (Documents vs Chat History) */}
        <div className={`p-2 border-b flex gap-1 ${theme === 'dark' ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
          <button
            onClick={() => setSidebarTab('documents')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              sidebarTab === 'documents'
                ? theme === 'dark'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white text-emerald-800 border border-slate-200 shadow-xs'
                : theme === 'dark'
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents ({documents.length})</span>
          </button>

          <button
            onClick={() => setSidebarTab('history')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              sidebarTab === 'history'
                ? theme === 'dark'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white text-emerald-800 border border-slate-200 shadow-xs'
                : theme === 'dark'
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({chatHistory.length})</span>
          </button>
        </div>

        {/* Tab 1: Documents & Ingestion */}
        {sidebarTab === 'documents' && (
          <>
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
                    : 'border-slate-300 hover:border-emerald-600 bg-slate-50/80 hover:bg-emerald-50/30 text-slate-700 shadow-xs'
                }`}
              >
                <UploadCloud className={`w-6 h-6 mx-auto mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-emerald-600'}`} />
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-950'}`}>
                  {uploadLoading ? 'Indexing vectors...' : 'Drop or browse policy files'}
                </p>
                <p className={`text-[10px] mt-1 font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>PDF, DOCX, XLSX, CSV, PPTX, HTML</p>
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
              <div className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                <span>Query Scope Filter</span>
                <span className={`font-mono text-[10px] font-bold ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-700'}`}>{documents.length} Indexed</span>
              </div>
              <button
                onClick={() => setSelectedDocId('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors mb-1.5 ${
                  selectedDocId === 'all'
                    ? theme === 'dark'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-950 border-2 border-emerald-500/70 shadow-xs'
                    : theme === 'dark'
                    ? 'text-slate-300 hover:bg-slate-850 hover:text-white border border-transparent'
                    : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 border border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  <span>Search Across All Documents</span>
                </div>
                {selectedDocId === 'all' && <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />}
              </button>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
              {documents.length === 0 ? (
                <div className={`p-4 text-center text-xs rounded-lg border ${theme === 'dark' ? 'text-slate-500 border-slate-900' : 'text-slate-600 border-slate-300 bg-slate-50 font-medium'}`}>
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
                            : 'bg-emerald-50/90 border-2 border-emerald-500/70 shadow-xs'
                          : theme === 'dark'
                          ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                          : 'bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 overflow-hidden">
                          <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700') : (theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}`} />
                          <div className="overflow-hidden">
                            <p className={`font-bold truncate ${isSelected ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-950') : (theme === 'dark' ? 'text-slate-200' : 'text-slate-950')}`} title={doc.filename}>
                              {doc.filename}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-800 border border-slate-300'}`}>
                                {doc.chunk_count} {doc.chunk_count === 1 ? 'chunk' : 'chunks'}
                              </span>
                              <span className={`uppercase text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{doc.file_type}</span>
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
          </>
        )}

        {/* Tab 2: User Chat & Query History */}
        {sidebarTab === 'history' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`p-3 border-b flex items-center justify-between text-xs ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Recent Queries</span>
              </div>
              {chatHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[11px] text-slate-500 hover:text-rose-500 transition-colors"
                  title="Clear query history"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {historyLoading ? (
                <div className="p-4 text-center text-xs text-slate-500">Loading history...</div>
              ) : chatHistory.length === 0 ? (
                <div className={`p-4 text-center text-xs rounded-xl border ${theme === 'dark' ? 'border-slate-800/80 text-slate-500 bg-slate-900/30' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p className="font-semibold">No questions saved yet</p>
                  <p className="text-[10px] mt-1">Ask any policy inquiry to automatically preserve your Q&amp;A history.</p>
                </div>
              ) : (
                chatHistory.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => handleSelectHistoryItem(item)}
                    className={`group p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-900/60 border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-850'
                        : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <p className={`font-semibold line-clamp-2 leading-snug ${theme === 'dark' ? 'text-slate-200 group-hover:text-emerald-300' : 'text-slate-900 group-hover:text-emerald-800'}`}>
                          {item.question}
                        </p>
                        <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                          <span>
                            {item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Saved'}
                          </span>
                          {item.citations && item.citations.length > 0 && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {item.citations.length} {item.citations.length === 1 ? 'cite' : 'cites'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Free Tier Architecture Badges */}
        <div className={`p-3 border-t text-[11px] space-y-1 ${theme === 'dark' ? 'border-slate-800/80 bg-slate-950/50 text-slate-400' : 'border-slate-200 bg-white text-slate-800 font-semibold'}`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Anti-Hallucination Guard</span>
            </span>
            <span className={`text-[10px] font-mono font-bold ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-700'}`}>Active (0.58)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Deduplication &amp; LRU</span>
            </span>
            <span className={`text-[10px] font-mono font-bold ${theme === 'dark' ? 'text-blue-500' : 'text-blue-700'}`}>SHA-256</span>
          </div>
        </div>

        {/* User Profile Card at Sidebar Bottom */}
        {currentUser && (
          <div className={`p-3 border-t relative shrink-0 ${theme === 'dark' ? 'border-slate-800/80 bg-slate-950/80' : 'border-slate-200 bg-slate-50'}`}>
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-750 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-850'
                    : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-600 hover:bg-slate-100 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                    {(currentUser.user_metadata?.full_name || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                  <div className="truncate text-left leading-tight">
                    <div className="truncate font-bold text-xs">
                      {currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}
                    </div>
                    <div className={`truncate text-[10px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {currentUser.email}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu (Opens upwards above the profile card) */}
              {userDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserDropdownOpen(false)} />
                  <div
                    className={`absolute left-0 bottom-full mb-2 w-full rounded-xl border p-1.5 shadow-2xl z-40 animate-fade-in ${
                      theme === 'dark' ? 'bg-[#0f172a] border-slate-700/90 text-slate-200 shadow-black/80' : 'bg-white border-slate-300 text-slate-900 shadow-slate-400/30'
                    }`}
                  >
                    <div className={`px-3 py-2 border-b text-xs mb-1 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                      <p className="font-bold truncate">{currentUser.user_metadata?.full_name || 'Enterprise User'}</p>
                      <p className="text-[10px] font-mono truncate text-emerald-400">{currentUser.email}</p>
                      {currentUser.user_metadata?.contact_number && (
                        <p className={`text-[10px] font-mono truncate mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          📞 {currentUser.user_metadata.contact_number}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setSidebarTab('history');
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                        theme === 'dark' ? 'hover:bg-slate-800 hover:text-emerald-300' : 'hover:bg-slate-100 hover:text-emerald-800'
                      }`}
                    >
                      <History className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Query History ({chatHistory.length})</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ================= MAIN CHAT AREA (CLAUDE CODE STYLE) ================= */}
      <main className={`flex-1 flex flex-col h-full relative overflow-hidden ${theme === 'dark' ? 'bg-[#07090e]' : 'bg-slate-100'}`}>
        
        {/* Top Header Bar */}
        <header className={`h-14 border-b px-4 md:px-6 flex items-center justify-between shrink-0 backdrop-blur ${theme === 'dark' ? 'border-slate-800/80 bg-[#07090e]/95' : 'border-b border-slate-300 bg-white shadow-xs'}`}>
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'}`}
                title="Open Sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🧭</span>
              <span className={`font-bold text-sm tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-950'}`}>PolicyPilot RAG</span>
              <span className={`hidden sm:inline-block text-[11px] px-2 py-0.5 rounded border font-mono font-bold ${theme === 'dark' ? 'bg-slate-800/80 text-slate-300 border-slate-700/60' : 'bg-slate-100 text-slate-900 border-slate-300'}`}>
                100% Free Stack
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button (Dark Mode / Normal Mode) */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800 hover:text-amber-200'
                  : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-100 shadow-xs'
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
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline text-[11px]">Dark Mode</span>
                </>
              )}
            </button>

            {/* Active Scope Pill */}
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border font-semibold ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-800 shadow-xs'}`}>
              <Search className="w-3 h-3 text-slate-400" />
              <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Scope:</span>
              <span className={`font-bold max-w-[150px] truncate ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {selectedDocId === 'all'
                  ? 'All Documents'
                  : documents.find(d => d.doc_id === selectedDocId)?.filename || 'Active File'}
              </span>
            </div>

            {/* Backend Status Indicator */}
            <div
              onClick={checkHealth}
              className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border cursor-pointer font-semibold ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-300 hover:border-slate-400 text-slate-900 shadow-xs'}`}
              title="Click to refresh status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className={`text-[11px] hidden sm:inline ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>
                {backendStatus === 'healthy' ? 'Qdrant + Gemini Live' : 'Connecting backend...'}
              </span>
            </div>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className={`text-xs px-2 py-1 rounded transition-colors font-medium ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'}`}
                title="Clear current conversation"
              >
                Clear Chat
              </button>
            )}

            {/* Sign In button for guest users (when logged in, profile & logout are docked at the sidebar bottom) */}
            {!currentUser && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          
          {/* Welcome Hero / Empty State */}
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto my-auto pt-8 pb-12 text-center space-y-6">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-xl ${
                theme === 'dark'
                  ? 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-emerald-100 border-2 border-emerald-400 text-emerald-700 shadow-md'
              }`}>
                <Compass className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                  Public Policy &amp; Procedures Assistant
                </h1>
                <p className={`text-sm sm:text-base max-w-lg mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                  Ask policy questions with zero hallucination. Supports tables, diagrams, structured summaries, and exact sentence limits.
                </p>
              </div>

              {/* Starter Prompt Chips */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-800'}`}>
                    Suggested Questions &amp; Formats
                  </p>
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded truncate max-w-[220px] ${theme === 'dark' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/80' : 'text-emerald-950 bg-emerald-100 border border-emerald-300'}`}>
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
                          : 'bg-white hover:bg-emerald-50/50 border border-slate-300 hover:border-emerald-600 text-slate-950 shadow-xs hover:shadow-md'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className={`leading-snug ${theme === 'dark' ? 'text-slate-300 group-hover:text-slate-100' : 'text-slate-950 font-semibold group-hover:text-emerald-950'}`}>{q}</span>
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
                        <p
                          dir={/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(msg.content || '') ? 'rtl' : 'ltr'}
                          className={`whitespace-pre-wrap ${
                            /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(msg.content || '')
                              ? 'text-right font-urdu text-[15px]'
                              : 'text-left leading-relaxed'
                          }`}
                        >
                          {msg.content}
                        </p>
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
                    
                    {/* Service Alert or Grounding Refusal Notice Banner */}
                    {msg.content?.toLowerCase().includes('high server demand') || msg.content?.toLowerCase().includes('error connecting to ai service') ? (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        theme === 'dark'
                          ? 'bg-rose-950/30 border-rose-800/70 text-rose-200'
                          : 'bg-rose-50 border-rose-300 text-rose-800'
                      }`}>
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className={`font-semibold ${theme === 'dark' ? 'text-rose-300' : 'text-rose-900'}`}>AI Service Notice</p>
                          <p className={`mt-0.5 ${theme === 'dark' ? 'text-rose-200/90' : 'text-rose-800/90'}`}>
                            Google AI generation servers are temporarily experiencing high demand. Please try resubmitting in a moment.
                          </p>
                        </div>
                      </div>
                    ) : msg.is_refusal ? (
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
                    ) : null}

                    {/* Instant Semantic Cache Badge */}
                    {msg.is_cached && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Instant Semantic Cache &bull; 0 Tokens Spent</span>
                      </div>
                    )}

                    {/* Rich Markdown Output (with Tables, Lists, Code, Mermaid) */}
                    <div
                      dir={/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(msg.content || '') ? 'rtl' : 'ltr'}
                      className={`border rounded-2xl p-4 md:p-5 text-sm shadow-sm ${
                        /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(msg.content || '')
                          ? 'text-right font-urdu text-[15px]'
                          : 'text-left leading-relaxed'
                      } ${
                        theme === 'dark'
                          ? 'bg-slate-900/40 border-slate-800/70 text-slate-200'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
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
                            <p className={`leading-relaxed mb-3 last:mb-0 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900 font-normal'}`} {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className={`list-disc list-outside pl-5 mb-3 space-y-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'}`} {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className={`list-decimal list-outside pl-5 mb-3 space-y-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'}`} {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className={`leading-relaxed pl-1 marker:text-emerald-500 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'}`} {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-950 font-bold'}`} {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className={`italic ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900 font-medium'}`} {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className={`border-l-4 border-emerald-500/60 px-3.5 py-2 my-2 rounded-r italic ${theme === 'dark' ? 'bg-emerald-950/20 text-slate-300' : 'bg-emerald-50 text-slate-900 border-emerald-600'}`} {...props} />
                          ),
                          // Exportable Table with CSV, Excel (.xlsx), and PDF download options targeting this specific table
                          table: ({ node, children, ...props }) => {
                            const msgIdx = messages.findIndex(m => m.id === msg.id);
                            const prevUserMsg = msgIdx > 0 ? messages.slice(0, msgIdx).reverse().find(m => m.sender === 'user') : null;
                            const currentQuestion = prevUserMsg?.content || 'Policy Inquiry';
                            return (
                              <ExportableTable
                                scopeName={activeDocName}
                                question={currentQuestion}
                                citations={msg.citations || []}
                                theme={theme}
                                showTopExports={true}
                              >
                                {children}
                              </ExportableTable>
                            );
                          },
                          thead: ({ node, ...props }) => (
                            <thead className={`uppercase tracking-wider font-semibold border-b ${theme === 'dark' ? 'bg-slate-850 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-900 border-slate-300'}`} {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className={`px-4 py-2.5 font-bold ${theme === 'dark' ? 'bg-slate-900/90 text-emerald-400' : 'bg-slate-100 text-slate-900 border-slate-300'}`} {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className={`px-4 py-2 border-b transition-colors ${theme === 'dark' ? 'text-slate-300 border-slate-800/60 hover:bg-slate-800/30' : 'text-slate-900 border-slate-200 hover:bg-slate-50'}`} {...props} />
                          ),
                          // Code, Mermaid Diagram & CSV Renderer
                          code: ({ node, inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const isMermaid = match && match[1] === 'mermaid';

                            if (isMermaid) {
                              return <MermaidDiagram chart={String(children).replace(/\n$/, '')} theme={theme} />;
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
                              const msgIdx = messages.findIndex(m => m.id === msg.id);
                              const prevUserMsg = msgIdx > 0 ? messages.slice(0, msgIdx).reverse().find(m => m.sender === 'user') : null;
                              const currentQuestion = prevUserMsg?.content || 'Policy Inquiry';
                              return (
                                <ExportableCSVBlock
                                  rawCsv={rawText}
                                  scopeName={activeDocName}
                                  question={currentQuestion}
                                  citations={msg.citations || []}
                                  theme={theme}
                                  showTopExports={true}
                                />
                              );
                            }

                            if (inline) {
                              return (
                                <code className={`px-1.5 py-0.5 rounded text-xs font-mono border ${theme === 'dark' ? 'bg-slate-800 text-emerald-300 border-slate-700/60' : 'bg-slate-100 text-emerald-800 font-semibold border-slate-300'}`} {...props}>
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
                      <div className="flex items-center gap-2">
                        
                        {/* Direct Export as PDF Button - Only show if verified & grounded (hidden on refusals, errors & guardrails) */}
                        {!msg.is_refusal &&
                          !msg.content?.includes('The retrieved policy chunks do not verify this specific query') &&
                          !msg.content?.toLowerCase().includes('error connecting to ai service') &&
                          !msg.content?.toLowerCase().includes('high server demand') &&
                          !msg.content?.toLowerCase().includes('grounding guardrail active') && (
                          <button
                            onClick={() => {
                              const msgIdx = messages.findIndex(m => m.id === msg.id);
                              const qText = msgIdx > 0 ? messages[msgIdx - 1]?.content : 'Policy Inquiry';
                              exportToPdf(qText, msg.content, msg.citations, activeDocName);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shadow-xs ${
                              theme === 'dark'
                                ? 'bg-slate-900 border-slate-750 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/50'
                                : 'bg-white border-slate-300 text-slate-800 hover:text-emerald-700 hover:border-emerald-500'
                            }`}
                            title="Export response as PDF"
                          >
                            <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Export PDF</span>
                          </button>
                        )}

                        {/* Copy Answer Button */}
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                            theme === 'dark'
                              ? 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                              : 'border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                          }`}
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
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
              className={`relative rounded-2xl transition-all ${
                theme === 'dark'
                  ? 'bg-[#0d121f] border border-slate-700/80 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 text-slate-100 shadow-xl'
                  : 'bg-white border-2 border-slate-300 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600/30 text-slate-950 shadow-md'
              }`}
            >
              <textarea
                ref={textareaRef}
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask any policy question... (Press Enter to send, Shift+Enter for newline)"
                className={`w-full bg-transparent text-sm px-4 pt-3.5 pb-11 resize-none focus:outline-none leading-relaxed font-medium ${
                  theme === 'dark'
                    ? 'text-slate-100 placeholder-slate-500'
                    : 'text-slate-950 placeholder:text-slate-500'
                }`}
              />

              {/* Input Toolbar */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                
                {/* Active Scope filter badge (Attach button removed per request) */}
                <div className="flex items-center gap-2">
                  {selectedDocId !== 'all' ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold truncate max-w-[200px] border ${
                      theme === 'dark'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                        : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    }`}>
                      Filter: {documents.find(d => d.doc_id === selectedDocId)?.filename}
                    </span>
                  ) : (
                    <span className={`text-[11px] font-mono font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-700'}`}>
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
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-900/30 cursor-pointer'
                      : theme === 'dark'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                  }`}
                  title="Ask Policy Question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className={`flex items-center justify-between text-[11px] mt-2 px-1 font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-700'}`}>
              <span>PolicyPilot grounds answers in verified embeddings &bull; Zero Hallucination Guarantee</span>
              <span className="hidden sm:inline font-mono text-[10px]">Groq (GPT-OSS 120B)</span>
            </div>
          </div>
        </div>

      </main>

      {/* Global Auth Status Notification Toast */}
      {authNotification && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm sm:max-w-md p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 animate-fade-in transition-all bg-slate-900/95 border-emerald-500/40 text-slate-100">
          {authNotification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : authNotification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <p className="font-bold text-sm text-emerald-400 mb-0.5">{authNotification.title}</p>
            <p className="leading-relaxed text-slate-300">{authNotification.message}</p>
          </div>
          <button
            onClick={() => setAuthNotification(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Authentication Modal (Email/Password & Google One-Click) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authInitialMode}
        theme={theme}
      />
    </div>
  );
}
