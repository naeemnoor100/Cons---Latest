
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, User, Loader2, Globe, ShieldAlert, Zap, Info } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useApp } from '../AppContext';

// Global declaration to handle 'process' not found error in browser/TSC
declare var process: any;

export const AIAssistant: React.FC = () => {
  const { projects, materials, expenses } = useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; sources?: any[] }[]>([
    { role: 'ai', content: "Hello! I'm your BuildTrack Pro AI Assistant. I can help you with safety checklists, material optimizations, or project planning based on current industry standards. What's on your mind today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      /* Fix: Adhering to guidelines: Always initialize GoogleGenAI with { apiKey: process.env.GEMINI_API_KEY } directly */
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const projectSummary = projects.map(p => `${p.name} (${p.status}, Budget: ${p.budget})`).join(', ');
      const materialSummary = materials.map(m => `${m.name}: ${m.totalPurchased - m.totalUsed} ${m.unit} in stock`).join(', ');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Context: You are a professional construction project management consultant for BuildTrack Pro. 
          Current Projects: ${projectSummary}.
          Current Materials: ${materialSummary}.
          User Question: ${userMessage}`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are an expert construction advisor. Provide concise, professional, and actionable advice. If you use Google Search to find regulations or prices, mention your sources. Format your response with markdown for clarity."
        },
      });

      const text = response.text || "I'm sorry, I couldn't process that request.";
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: text,
        sources: sources.length > 0 ? sources : undefined
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: "Error: I'm having trouble connecting to the brain right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* AI Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              BuildTrack AI Assistant
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-tight">
                Flash 3.0
              </span>
            </h2>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Powered by Google Search Grounding</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
             <div className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center" title="Project Data Linked"><Zap size={10} className="text-amber-500" /></div>
             <div className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center" title="Live Search Enabled"><Globe size={10} className="text-blue-500" /></div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50/30">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-blue-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
              </div>
              <div className="space-y-2">
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="bg-white/50 border border-slate-200 rounded-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Globe size={10} /> Grounding Sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, idx) => (
                        src.web && (
                          <a 
                            key={idx} 
                            href={src.web.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors truncate max-w-[150px]"
                            title={src.web.title}
                          >
                            {src.web.title || 'Source'}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%] items-start">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Chips */}
      <div className="px-4 py-2 border-t border-slate-100 overflow-x-auto no-scrollbar whitespace-nowrap bg-white">
        <div className="flex gap-2">
          {[
            { label: "Safety Checklist", icon: <ShieldAlert size={12} /> },
            { label: "Optimize Materials", icon: <Zap size={12} /> },
            { label: "Latest NY Building Codes", icon: <Info size={12} /> }
          ].map(chip => (
            <button 
              key={chip.label}
              onClick={() => setInput(chip.label)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              {chip.icon}
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about safety, materials, or codes..."
            className="w-full pl-4 pr-14 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={`absolute right-1.5 p-2 rounded-lg transition-all ${
              input.trim() ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
