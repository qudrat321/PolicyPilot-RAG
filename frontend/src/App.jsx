import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
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
  X
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

function MermaidDiagram({ chart }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError('Diagram rendering error');
      }
    };
    renderChart();
    return () => { isMounted = false; };
  }, [chart]);

  if (error) {
    return (
      <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 overflow-x-auto">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 flex justify-center overflow-x-auto shadow-inner"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

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

  const starterQuestions = [
    'Summarize the primary code of conduct policies',
    'Compare policy rules in a structured table format',
    'Explain the violation reporting process in exactly two sentences',
    'Create a flowchart diagram of the disciplinary and escalation steps'
  ];

  return (
    <div className="flex h-screen bg-[#07090e] text-slate-100 font-sans antialiased overflow-hidden">
      
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
        className={`flex flex-col border-r border-slate-800/80 bg-[#0b0f19] transition-all duration-300 z-20 ${
          sidebarOpen ? 'w-80 min-w-[20rem]' : 'w-0 -translate-x-full border-r-0 overflow-hidden'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-100 tracking-wide">Knowledge Base</h2>
              <p className="text-[11px] text-slate-400">Qdrant Cloud Vectors</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Zone / Dropzone */}
        <div className="p-4 border-b border-slate-800/60">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400'
            }`}
          >
            <UploadCloud className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
            <p className="text-xs font-medium text-slate-200">
              {uploadLoading ? 'Indexing vectors...' : 'Drop or browse policy files'}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">PDF, DOCX, XLSX, CSV, PPTX, HTML</p>
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
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Query Scope Filter</span>
            <span className="text-emerald-400 font-mono text-[10px]">{documents.length} Indexed</span>
          </div>
          <button
            onClick={() => setSelectedDocId('all')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors mb-1.5 ${
              selectedDocId === 'all'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-slate-850 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5" />
              <span>Search Across All Documents</span>
            </div>
            {selectedDocId === 'all' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {documents.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 border border-slate-900 rounded-lg">
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
                      ? 'bg-slate-800/90 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 overflow-hidden">
                      <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <div className="overflow-hidden">
                        <p className="font-medium text-slate-200 truncate" title={doc.filename}>
                          {doc.filename}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-opacity"
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
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Anti-Hallucination Guard</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Active (0.58)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Deduplication &amp; LRU</span>
            </span>
            <span className="text-[10px] text-blue-400 font-mono">SHA-256</span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CHAT AREA (CLAUDE CODE STYLE) ================= */}
      <main className="flex-1 flex flex-col h-full bg-[#07090e] relative overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between shrink-0 bg-[#07090e]/95 backdrop-blur">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                title="Open Sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🧭</span>
              <span className="font-semibold text-slate-100 text-sm tracking-tight">PolicyPilot RAG</span>
              <span className="hidden sm:inline-block bg-slate-800/80 text-slate-300 text-[11px] px-2 py-0.5 rounded border border-slate-700/60 font-mono">
                100% Free Stack
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Scope Pill */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-md text-xs text-slate-300 border border-slate-800">
              <Search className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">Scope:</span>
              <span className="font-medium text-emerald-400 max-w-[150px] truncate">
                {selectedDocId === 'all'
                  ? 'All Documents'
                  : documents.find(d => d.doc_id === selectedDocId)?.filename || 'Active File'}
              </span>
            </div>

            {/* Backend Status Indicator */}
            <div
              onClick={checkHealth}
              className="flex items-center gap-2 text-xs bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800 cursor-pointer hover:border-slate-700"
              title="Click to refresh status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="text-slate-300 text-[11px] hidden sm:inline">
                {backendStatus === 'healthy' ? 'Qdrant + Gemini Live' : 'Connecting backend...'}
              </span>
            </div>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800/80 transition-colors"
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
                <Compass className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Public Policy &amp; Procedures Assistant
                </h1>
                <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Ask policy questions with zero hallucination. Supports tables, diagrams, structured summaries, and exact sentence limits.
                </p>
              </div>

              {/* Starter Prompt Chips */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Suggested Questions &amp; Formats
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {starterQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputQuestion(q);
                        textareaRef.current?.focus();
                      }}
                      className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/40 text-xs text-slate-300 transition-all flex items-start gap-2.5 group"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
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
                    <div className="w-full max-w-[90%] bg-slate-900 border border-emerald-500/60 rounded-2xl p-3 shadow-lg space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-slate-950 text-slate-100 text-sm p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1"
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
                      <div className="bg-[#1e2538] text-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 text-sm shadow-md border border-slate-700/60 max-w-[85%]">
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-between gap-4 mt-2 pt-1 border-t border-slate-700/40 text-[10px] text-slate-400">
                          <span className="font-mono">{msg.timestamp}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(msg.content, `q-${msg.id}`)}
                              className="hover:text-slate-200 transition-colors flex items-center gap-1"
                              title="Copy Question"
                            >
                              {copiedId === `q-${msg.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedId === `q-${msg.id}` ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="hover:text-emerald-400 transition-colors flex items-center gap-1"
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
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
                    <Compass className="w-4 h-4" />
                  </div>

                  <div className="flex-1 overflow-hidden space-y-3">
                    
                    {/* Refusal Notice Banner */}
                    {msg.is_refusal && (
                      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/70 text-amber-200 text-xs flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-300">Grounding Guardrail Active</p>
                          <p className="text-amber-200/90 mt-0.5">
                            The retrieved policy chunks do not verify this specific query. To prevent hallucinations, PolicyPilot strictly answers from validated passages.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Rich Markdown Output (with Tables, Lists, Code, Mermaid) */}
                    <div className="bg-slate-900/40 border border-slate-800/70 rounded-2xl p-4 md:p-5 text-sm text-slate-200 leading-relaxed shadow-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-800 flex items-center gap-2" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-base font-semibold text-slate-100 mt-3.5 mb-1.5" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-sm font-semibold text-slate-200 mt-3 mb-1" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="text-slate-300 leading-relaxed mb-3 last:mb-0" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-outside pl-5 mb-3 space-y-1.5 text-slate-300" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-outside pl-5 mb-3 space-y-1.5 text-slate-300" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed pl-1 marker:text-emerald-400" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-white" {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className="italic text-slate-200" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-emerald-500/60 bg-emerald-950/20 px-3.5 py-2 my-2 rounded-r text-slate-300 italic" {...props} />
                          ),
                          // Custom Table Components for perfect table formatting
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-4 rounded-xl border border-slate-700/80 shadow-md">
                              <table className="min-w-full divide-y divide-slate-800 text-xs text-left" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-slate-850 text-slate-200 uppercase tracking-wider font-semibold border-b border-slate-700" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-4 py-2.5 font-semibold text-emerald-400 bg-slate-900/90" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-4 py-2 text-slate-300 border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors" {...props} />
                          ),
                          // Code & Mermaid Diagram Renderer
                          code: ({ node, inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const isMermaid = match && match[1] === 'mermaid';

                            if (isMermaid) {
                              return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
                            }

                            if (inline) {
                              return (
                                <code className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700/60" {...props}>
                                  {children}
                                </code>
                              );
                            }

                            return (
                              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-slate-200">
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
                        <div className="mt-4 pt-3 border-t border-slate-800/80">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
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
                                  className="inline-flex items-center gap-1.5 bg-slate-800/90 text-emerald-300 border border-slate-700/80 px-2.5 py-1 rounded-md text-xs font-mono shadow-sm"
                                  title={typeof cite === 'object' && cite.snippet ? cite.snippet : label}
                                >
                                  <span className="text-[10px] text-slate-400 font-semibold">{tag}</span>
                                  <span className="text-slate-200">{label}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audit Trail: Collapsible Retrieved Chunks & Score Inspector */}
                    {msg.retrieved_chunks && msg.retrieved_chunks.length > 0 && (
                      <div className="border border-slate-800/70 rounded-xl overflow-hidden bg-slate-950/40">
                        <button
                          onClick={() => toggleInspector(msg.id)}
                          className="w-full px-3.5 py-2 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-between hover:bg-slate-900/60 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-blue-400" />
                            <span>Audit Trail ({msg.retrieved_chunks.length} Chunks Retrieved &bull; Top Score: {msg.retrieved_chunks[0]?.score?.toFixed(4)})</span>
                          </div>
                          {expandedInspectors[msg.id] ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        {expandedInspectors[msg.id] && (
                          <div className="p-3 border-t border-slate-800/80 space-y-2 bg-[#090d16]">
                            {msg.retrieved_chunks.map((chunk, chIdx) => {
                              const isConfident = chunk.score >= 0.58;
                              return (
                                <div
                                  key={chIdx}
                                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/70 text-xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-300">
                                        #{chIdx + 1} &bull; {chunk.filename}
                                      </span>
                                      <span className="text-slate-500 font-mono text-[10px]">
                                        {chunk.page_or_section || 'Section'}
                                      </span>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                                        isConfident
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                                          : 'bg-amber-950 text-amber-400 border border-amber-800/80'
                                      }`}
                                    >
                                      Score: {chunk.score?.toFixed(4)}
                                    </span>
                                  </div>
                                  <p className="text-slate-400 font-mono text-[11px] bg-slate-950 p-2 rounded border border-slate-800/60 leading-relaxed whitespace-pre-wrap">
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
                    <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                      <span className="font-mono">{msg.timestamp}</span>
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
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
              )}

            </div>
          ))}

          {/* Loading Indicator Turn - Minimalist Claude-style animated loader */}
          {loading && (
            <div className="max-w-3xl mx-auto flex items-center gap-3 pr-4 animate-fade-in py-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Compass className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/50 rounded-xl border border-slate-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ================= BOTTOM PROMPT INPUT BAR (CLAUDE CODE STYLE - NO ATTACH BUTTON) ================= */}
        <div className="p-4 md:p-6 border-t border-slate-800/80 bg-[#07090e]/95 backdrop-blur shrink-0">
          <div className="max-w-3xl mx-auto">
            
            {/* Input Container */}
            <form
              onSubmit={handleAsk}
              className="relative bg-[#0d121f] border border-slate-700/80 focus-within:border-emerald-500/80 focus-within:ring-1 focus-within:ring-emerald-500/30 rounded-2xl shadow-xl transition-all"
            >
              <textarea
                ref={textareaRef}
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask any policy question... (Press Enter to send, Shift+Enter for newline)"
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 px-4 pt-3.5 pb-11 resize-none focus:outline-none leading-relaxed"
              />

              {/* Input Toolbar */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                
                {/* Active Scope filter badge (Attach button removed per request) */}
                <div className="flex items-center gap-2">
                  {selectedDocId !== 'all' ? (
                    <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-[10px] px-2 py-0.5 rounded font-mono truncate max-w-[200px]">
                      Filter: {documents.find(d => d.doc_id === selectedDocId)?.filename}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
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
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  title="Ask Policy Question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
              <span>PolicyPilot grounds answers in verified embeddings &bull; Zero Hallucination Guarantee</span>
              <span className="hidden sm:inline font-mono text-[10px]">Gemini 3.1 Flash Lite</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
