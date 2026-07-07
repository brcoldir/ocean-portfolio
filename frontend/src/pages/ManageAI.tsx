import React, { useState, useEffect, useCallback } from 'react';
import { Terminal, Tent, LogOut, MessageSquare, FileText, Trash2, ChevronDown, ChevronUp, Download, Save } from 'lucide-react';

interface Props { mode: 'dev' | 'human' }

interface Session { ID: string; IP: string; MessageCount: number; CreatedAt: string }
interface Message { Role: string; Content: string; CreatedAt: string }
interface RAGFile { name: string; editedAt: string }

type Tab = 'conversations' | 'rag';

export default function ManageAI({ mode }: Props) {
  const isDev = mode === 'dev';
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [tab, setTab] = useState<Tab>('conversations');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ragFiles, setRagFiles] = useState<RAGFile[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Check auth on mount
  useEffect(() => {
    fetch('/api/admin/conversations', { credentials: 'include' })
      .then(r => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      if (res.ok) { setAuthed(true); }
      else {
        const d = await res.json();
        setLoginError(d.error || 'Invalid credentials');
      }
    } catch {
      setLoginError('Network error');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setAuthed(false);
  };

  const sendResetEmail = async () => {
    await fetch('/api/auth/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail }),
    });
    setResetSent(true);
  };

  const loadSessions = useCallback(async () => {
    const res = await fetch('/api/admin/conversations', { credentials: 'include' });
    if (res.ok) setSessions(await res.json());
  }, []);

  const loadRAGFiles = useCallback(async () => {
    const res = await fetch('/api/admin/rag', { credentials: 'include' });
    if (res.ok) setRagFiles(await res.json());
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (tab === 'conversations') loadSessions();
    else loadRAGFiles();
  }, [authed, tab, loadSessions, loadRAGFiles]);

  const expandSession = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const res = await fetch(`/api/admin/conversations/${id}`, { credentials: 'include' });
    if (res.ok) setMessages(await res.json());
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this conversation?')) return;
    await fetch(`/api/admin/conversations/${id}`, { method: 'DELETE', credentials: 'include' });
    setSessions(s => s.filter(x => x.ID !== id));
    if (expanded === id) setExpanded(null);
  };

  const startEdit = async (name: string) => {
    const res = await fetch(`/api/admin/rag/${name}`, { credentials: 'include' });
    if (!res.ok) return;
    const d = await res.json();
    setEditContent(d.content);
    setEditing(name);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/admin/rag/${editing}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: editContent }),
    });
    setSaving(false);
    setEditing(null);
    loadRAGFiles();
  };

  // Style tokens
  const bg = isDev ? 'bg-[#0a0f1e] text-slate-100' : 'bg-[#f8f5f2] text-stone-800';
  const card = isDev ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200 shadow-sm';
  const inputCls = isDev
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
    : 'bg-white border-stone-300 focus:border-orange-500';
  const btnPrimary = isDev ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white';
  const tabActive = isDev ? 'border-blue-500 text-blue-400' : 'border-orange-500 text-orange-600';
  const tabInactive = isDev ? 'border-transparent text-slate-400' : 'border-transparent text-stone-500';

  if (authed === null) return (
    <div className={`min-h-screen flex items-center justify-center ${bg}`}>
      <span className="animate-pulse opacity-50">Loading…</span>
    </div>
  );

  if (!authed) return (
    <div className={`min-h-screen flex items-center justify-center ${bg}`}>
      <div className={`w-full max-w-sm p-8 rounded-2xl border ${card}`}>
        <div className="flex items-center gap-2 mb-8">
          {isDev ? <Terminal size={20} className="text-blue-500" /> : <Tent size={20} className="text-orange-600" />}
          <h1 className="text-xl font-bold">Manage AI</h1>
        </div>

        {!showReset ? (
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-50">Email</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border outline-none text-sm transition-colors ${inputCls}`} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-50">Password</label>
              <input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border outline-none text-sm transition-colors ${inputCls}`} />
            </div>
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className={`w-full py-3 rounded-lg font-bold transition-all ${btnPrimary} disabled:opacity-50`}>
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </button>
            <button type="button" onClick={() => setShowReset(true)}
              className="w-full text-center text-sm opacity-50 hover:opacity-70 transition-opacity">
              Forgot password?
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm opacity-70">Enter your email and we'll send a reset link.</p>
            {!resetSent ? (
              <>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 rounded-lg border outline-none text-sm ${inputCls}`} />
                <button onClick={sendResetEmail} className={`w-full py-3 rounded-lg font-bold ${btnPrimary}`}>
                  Send Reset Link
                </button>
              </>
            ) : (
              <p className="text-sm text-green-400">Check your email for a reset link (expires in 15 minutes).</p>
            )}
            <button onClick={() => { setShowReset(false); setResetSent(false); }}
              className="w-full text-center text-sm opacity-50 hover:opacity-70">
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b backdrop-blur ${isDev ? 'bg-[#0a0f1e]/90 border-slate-800' : 'bg-white/90 border-stone-200 shadow-sm'}`}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            {isDev ? <Terminal size={18} className="text-blue-500" /> : <Tent size={18} className="text-orange-600" />}
            <span>Manage AI</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm opacity-60 hover:opacity-100 transition-opacity">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className={`flex border-b mb-8 ${isDev ? 'border-slate-800' : 'border-stone-200'}`}>
          {(['conversations', 'rag'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? tabActive : tabInactive}`}>
              {t === 'conversations' ? <MessageSquare size={15} /> : <FileText size={15} />}
              {t === 'conversations' ? 'Conversations' : 'RAG Documents'}
            </button>
          ))}
        </div>

        {/* Conversations Tab */}
        {tab === 'conversations' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm opacity-50">{sessions.length} conversations</p>
              <a href="/api/admin/conversations?format=csv"
                className="flex items-center gap-1.5 text-sm opacity-60 hover:opacity-100 transition-opacity">
                <Download size={14} /> Export CSV
              </a>
            </div>
            <div className="space-y-2">
              {sessions.length === 0 && <p className="text-sm opacity-40 text-center py-12">No conversations yet.</p>}
              {sessions.map(s => (
                <div key={s.ID} className={`rounded-xl border overflow-hidden ${card}`}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="opacity-50 font-mono text-xs">{s.IP}</span>
                      <span className="opacity-70">{s.MessageCount} messages</span>
                      <span className="opacity-40 text-xs">{new Date(s.CreatedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => expandSession(s.ID)}
                        className="p-1.5 rounded opacity-50 hover:opacity-100 transition-opacity">
                        {expanded === s.ID ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                      <button onClick={() => deleteSession(s.ID)}
                        className="p-1.5 rounded text-red-400 opacity-50 hover:opacity-100 transition-opacity">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {expanded === s.ID && (
                    <div className={`border-t px-4 py-4 space-y-3 ${isDev ? 'border-slate-800 bg-slate-950' : 'border-stone-100 bg-stone-50'}`}>
                      {messages.map((m, i) => (
                        <div key={i} className={`flex gap-3 text-sm ${m.Role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-lg leading-relaxed ${m.Role === 'user'
                            ? (isDev ? 'bg-slate-700 text-slate-100' : 'bg-stone-200 text-stone-800')
                            : (isDev ? 'bg-slate-900 text-slate-300' : 'bg-white border border-stone-200 text-stone-700')}`}>
                            <span className="block text-xs opacity-40 mb-1 font-mono">{m.Role}</span>
                            {m.Content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RAG Tab */}
        {tab === 'rag' && (
          <div>
            {!editing ? (
              <div className="space-y-3">
                {ragFiles.map(f => (
                  <div key={f.name} className={`flex items-center justify-between px-5 py-4 rounded-xl border ${card}`}>
                    <div>
                      <div className="font-medium text-sm">{f.name}</div>
                      <div className="text-xs opacity-40 mt-0.5">Last edited: {f.editedAt}</div>
                    </div>
                    <button onClick={() => startEdit(f.name)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${btnPrimary}`}>
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">{editing}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditing(null)}
                      className="px-4 py-1.5 rounded-lg text-sm opacity-60 hover:opacity-100 transition-opacity">
                      Cancel
                    </button>
                    <button onClick={saveEdit} disabled={saving}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium ${btnPrimary} disabled:opacity-50`}>
                      <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className={`w-full h-[60vh] px-4 py-3 rounded-xl border font-mono text-sm outline-none transition-colors resize-none ${inputCls}`}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
