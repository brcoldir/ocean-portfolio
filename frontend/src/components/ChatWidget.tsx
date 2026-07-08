import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Mic, MicOff, Volume2, VolumeX, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  mode: 'dev' | 'human';
  variant?: 'floating' | 'embedded';
}

const SESSION_KEY = 'ocean_chat_session_id';
const MAX_LEN = 500;
const MAX_TTS_CHARS = 400;

// Truncate to the last sentence boundary within MAX_TTS_CHARS so speech doesn't cut mid-word.
function truncateForSpeech(text: string): string {
  if (text.length <= MAX_TTS_CHARS) return text;
  const slice = text.slice(0, MAX_TTS_CHARS);
  const lastBoundary = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
  );
  return lastBoundary > 80 ? slice.slice(0, lastBoundary + 1) : slice;
}

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export const ChatWidget: React.FC<Props> = ({ mode, variant = 'floating' }) => {
  const isDev = mode === 'dev';
  const isEmbedded = variant === 'embedded';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Ocean's AI. Ask me anything about his work, adventures, or projects." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const sessionId = useRef(getOrCreateSessionId());
  // voiceModeRef: true while in a voice conversation loop (mic → AI speaks → mic → ...)
  const voiceModeRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMessages(p => [...p, { role: 'assistant', content: "Voice input isn't supported in this browser. Try Chrome or Edge." }]);
      return;
    }
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    transcriptRef.current = '';

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      transcriptRef.current = transcript;
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
      const text = transcriptRef.current;
      transcriptRef.current = '';
      setInput('');
      if (text.trim()) {
        void sendMessage(text, true);
      } else if (voiceModeRef.current) {
        // Silence / nothing heard — restart listening if still in voice mode
        startRecording();
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      voiceModeRef.current = false;
    };

    recognition.start();
    recognitionRef.current = recognition;
    voiceModeRef.current = true;
    setIsRecording(true);
  };

  const stopRecording = () => {
    voiceModeRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const speakText = async (text: string) => {
    try {
      const res = await fetch('/api/chat/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: truncateForSpeech(text) }),
      });
      if (!res.ok) {
        // TTS failed — if in voice mode, restart mic anyway
        if (voiceModeRef.current) startRecording();
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setIsSpeaking(true);
      audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setIsSpeaking(false);
        if (voiceModeRef.current) startRecording();
      };
    } catch {
      setIsSpeaking(false);
      if (voiceModeRef.current) startRecording();
    }
  };

  // fromVoice: true when called from the mic flow — keeps voice mode active
  const sendMessage = async (text: string, fromVoice = false) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (!fromVoice) voiceModeRef.current = false;
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
      if (res.ok && (speakerOn || voiceModeRef.current)) {
        void speakText(reply);
      } else if (voiceModeRef.current) {
        // TTS not configured but still in voice mode — restart mic
        startRecording();
      }
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: "Can't connect right now. Try again in a moment." }]);
      if (voiceModeRef.current) startRecording();
    } finally {
      setLoading(false);
    }
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

  const chatPanel = (
    <div className={`${panel} flex flex-col h-full ${isEmbedded ? 'rounded-none border-l' : 'rounded-2xl border shadow-2xl'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${header}`}>
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm ${isDev ? 'text-slate-200 font-mono' : 'text-stone-700'}`}>
            {isDev ? 'Ask Ocean_' : "Ocean's AI Agent"}
          </span>
          {isSpeaking && (
            <span className={`text-xs animate-pulse ${accentColor}`}>speaking…</span>
          )}
          {isRecording && !isSpeaking && (
            <span className={`text-xs animate-pulse text-red-400`}>listening…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSpeakerOn(s => !s)}
            className={`p-1 rounded transition-colors ${speakerOn ? accentColor : 'text-slate-500'}`}
            title={speakerOn ? 'Mute' : 'Enable voice'}>
            {speakerOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          {!isEmbedded && (
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
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
      </div>

      {/* Input */}
      <div className={`p-3 border-t flex-shrink-0 ${isDev ? 'border-slate-800' : 'border-stone-200'}`}>
        {isRecording ? (
          <div className="flex items-center gap-2">
            <button onClick={stopRecording}
              className="p-2 rounded-lg bg-red-500 text-white animate-pulse flex-shrink-0">
              <MicOff size={15} />
            </button>
            <span className={`text-sm ${isDev ? 'text-slate-400' : 'text-stone-500'}`}>
              Listening… tap to stop
            </span>
          </div>
        ) : isSpeaking ? (
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg flex-shrink-0 ${accentColor}`}>
              <Volume2 size={15} className="animate-pulse" />
            </div>
            <span className={`text-sm ${isDev ? 'text-slate-400' : 'text-stone-500'}`}>
              Ocean is responding…
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={startRecording}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${iconColor}`}
              title="Tap to speak — AI will talk back and keep listening">
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
  );

  if (isEmbedded) {
    return <div className="h-full">{chatPanel}</div>;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="w-80 max-w-[calc(100vw-3rem)] flex flex-col overflow-hidden" style={{ height: '480px' }}>
          {chatPanel}
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
