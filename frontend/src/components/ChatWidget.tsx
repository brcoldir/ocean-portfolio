import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Mic, MicOff, Volume2, VolumeX, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  mode: 'dev' | 'human';
}

const SESSION_KEY = 'ocean_chat_session_id';
const MAX_LEN = 500;

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export const ChatWidget: React.FC<Props> = ({ mode }) => {
  const isDev = mode === 'dev';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Ocean's AI. Ask me anything about his work, adventures, or projects." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionId = useRef(getOrCreateSessionId());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages(p => [...p, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current, message: trimmed }),
      });
      const data = await res.json();
      const reply: string = res.ok ? data.reply : "Sorry, something went wrong. Try again.";
      setMessages(p => [...p, { role: 'assistant', content: reply }]);
      if (speakerOn && res.ok) void speakText(reply);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: "Can't connect right now. Try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      const res = await fetch('/api/chat/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch {}
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'audio.webm');
        try {
          const res = await fetch('/api/chat/transcribe', { method: 'POST', body: form });
          if (!res.ok) return;
          const data = await res.json();
          if (data.transcript) await sendMessage(data.transcript);
        } catch {}
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {}
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // Style tokens
  const panel = isDev ? 'bg-slate-950 border-slate-800' : 'bg-white border-stone-200';
  const header = isDev ? 'bg-slate-900 border-slate-800' : 'bg-stone-50 border-stone-200';
  const inputCls = isDev
    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-blue-500'
    : 'bg-white border-stone-300 text-stone-800 placeholder-stone-400 focus:border-orange-500';
  const userBubble = isDev ? 'bg-slate-800 text-slate-100' : 'bg-stone-100 text-stone-800';
  const aiBubble = isDev ? 'bg-slate-900 text-slate-300 font-mono text-xs' : 'bg-white border border-stone-200 text-stone-700';
  const btn = isDev ? 'bg-blue-600 hover:bg-blue-500' : 'bg-orange-500 hover:bg-orange-400';
  const fab = isDev ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30' : 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20';
  const iconColor = isDev ? 'text-slate-500 hover:text-slate-300' : 'text-stone-400 hover:text-stone-600';
  const accentColor = isDev ? 'text-blue-400' : 'text-orange-500';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className={`w-80 flex flex-col rounded-2xl border shadow-2xl overflow-hidden`}
          style={{ height: '480px' }}>
          <div className={`${panel} flex flex-col h-full`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${header}`}>
              <span className={`font-semibold text-sm ${isDev ? 'text-slate-200 font-mono' : 'text-stone-700'}`}>
                {isDev ? 'Ask Ocean_' : 'Chat with Ocean'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSpeakerOn(s => !s)}
                  className={`p-1 rounded transition-colors ${speakerOn ? accentColor : 'text-slate-500'}`}
                  title={speakerOn ? 'Mute' : 'Enable voice'}>
                  {speakerOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.role === 'user' ? userBubble : aiBubble}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className={`px-3 py-2 rounded-xl text-sm ${aiBubble}`}>
                    <span className="animate-pulse">Thinking…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className={`p-3 border-t flex-shrink-0 ${isDev ? 'border-slate-800' : 'border-stone-200'}`}>
              {isRecording ? (
                <div className="flex items-center gap-2">
                  <button onClick={stopRecording}
                    className="p-2 rounded-lg bg-red-500 text-white animate-pulse flex-shrink-0">
                    <MicOff size={15} />
                  </button>
                  <span className={`text-sm ${isDev ? 'text-slate-400' : 'text-stone-500'}`}>Listening…</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={startRecording}
                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${iconColor}`}>
                    <Mic size={15} />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value.slice(0, MAX_LEN))}
                      onKeyDown={onKeyDown}
                      placeholder="Ask me anything…"
                      className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inputCls}`}
                    />
                    {input.length > 400 && (
                      <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${input.length >= MAX_LEN ? 'text-red-400' : 'text-slate-500'}`}>
                        {input.length}/{MAX_LEN}
                      </span>
                    )}
                  </div>
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                    className={`p-2 rounded-lg text-white transition-colors disabled:opacity-40 flex-shrink-0 ${btn}`}>
                    <Send size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-2 px-4 py-3 rounded-full text-white font-medium text-sm shadow-lg transition-all hover:scale-105 active:scale-95 ${fab}`}>
        {isOpen ? <X size={16} /> : <MessageCircle size={16} />}
        {!isOpen && (isDev ? 'Ask Ocean_' : 'Chat with Ocean')}
      </button>
    </div>
  );
};
