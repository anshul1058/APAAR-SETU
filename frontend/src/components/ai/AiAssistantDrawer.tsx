import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  RefreshCw, 
  HelpCircle, 
  FileText, 
  AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { aiAssistantService } from '../../services/aiAssistantService';
import { AiChatMessage } from '../../types';

export const AiAssistantDrawer: React.FC = () => {
  const { isAiAssistantOpen, setIsAiAssistantOpen, aiInitialPrompt } = useAuth();
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      content: 'Hello! I am your AICTE APAAR AI Intelligence Assistant. How can I help you inspect validation flags, clarify seat matrix guidelines, or draft compliance report summaries?',
      timestamp: 'Just now'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aiInitialPrompt && isAiAssistantOpen) {
      handleSendPrompt(aiInitialPrompt);
    }
  }, [aiInitialPrompt, isAiAssistantOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsThinking(true);

    try {
      const reply = await aiAssistantService.getResponse(promptText);
      const assistantMsg: AiChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: AiChatMessage = {
        id: `a-err-${Date.now()}`,
        sender: 'assistant',
        content: 'AI Service Notice: Serving static AICTE regulatory knowledge base response. Please verify official APH 2026-27 manual.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isAiAssistantOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-stone-200">
        
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight">AICTE Virtual Copilot</h3>
                <span className="text-[9px] bg-blue-500/30 border border-blue-400/40 px-1.5 py-0.2 rounded font-mono">PS 26263</span>
              </div>
              <p className="text-[11px] text-slate-300">Intelligent anomaly & regulatory assistant</p>
            </div>
          </div>

          <button
            onClick={() => setIsAiAssistantOpen(false)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 overflow-x-auto flex items-center gap-2 text-xs shrink-0">
          <button
            onClick={() => handleSendPrompt('Explain why student Rohan Verma was flagged for duplicate enrollment')}
            className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-stone-200 text-slate-700 hover:text-rose-700 rounded-full text-[11px] font-medium shrink-0 flex items-center gap-1 shadow-2xs"
          >
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            Explain Flag #891
          </button>

          <button
            onClick={() => handleSendPrompt('What are the rules for AICTE Sanctioned vs PMSSS Supernumerary quota?')}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-stone-200 text-slate-700 hover:text-blue-700 rounded-full text-[11px] font-medium shrink-0 flex items-center gap-1 shadow-2xs"
          >
            <HelpCircle className="w-3 h-3 text-blue-500" />
            Seat Matrix Rules
          </button>

          <button
            onClick={() => handleSendPrompt('Generate an executive summary of DTU APAAR compliance audit')}
            className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-stone-200 text-slate-700 hover:text-emerald-700 rounded-full text-[11px] font-medium shrink-0 flex items-center gap-1 shadow-2xs"
          >
            <FileText className="w-3 h-3 text-emerald-600" />
            Audit Summary
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser ? 'bg-blue-600 text-white' : 'bg-slate-900 text-amber-400'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-stone-50 border border-stone-200/80 text-slate-800 rounded-tl-xs whitespace-pre-wrap'
                  }`}
                >
                  <p>{m.content}</p>
                  <span
                    className={`text-[9px] block mt-1.5 ${
                      isUser ? 'text-blue-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Analyzing central regulatory database...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Input Form */}
        <div className="p-3 border-t border-stone-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(inputVal);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask AI Copilot about any APAAR flag or policy..."
              className="flex-1 px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isThinking}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
