import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { UserInputs, SimulationResult, ChatMessage, DashboardTab } from '../types';
import { getCoachResponse } from '../services/geminiService';

interface CoachChatProps {
  inputs: UserInputs;
  simulation: SimulationResult;
  activeTab: DashboardTab;
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
}

// Custom styling for the AI response to make it clean and readable
const ModelMessageComponents: any = {
    h1: ({node, ...props}: any) => <h1 className="text-lg font-bold text-slate-900 mt-4 mb-2 border-b border-slate-100 pb-1" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-base font-bold text-slate-900 mt-4 mb-2" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-5 mb-2 flex items-center gap-2" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-3 leading-relaxed text-slate-600 last:mb-0" {...props} />,
    ul: ({node, ...props}: any) => <ul className="space-y-2 mb-4 mt-2" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal list-outside ml-5 space-y-2 mb-4 mt-2 text-slate-600" {...props} />,
    li: ({node, ...props}: any) => {
        return <li className="text-slate-600 pl-1" {...props} />;
    },
    strong: ({node, ...props}: any) => <strong className="font-semibold text-slate-900" {...props} />,
    em: ({node, ...props}: any) => <em className="text-slate-500 italic" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-3 bg-slate-50 text-slate-600 italic rounded-r" {...props} />,
    code: ({node, ...props}: any) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600" {...props} />,
};

ModelMessageComponents.ul = ({node, ...props}: any) => <ul className="list-disc list-outside ml-5 space-y-1 mb-3 text-slate-600 marker:text-slate-400" {...props} />;

export const CoachChat: React.FC<CoachChatProps> = ({ inputs, simulation, activeTab, isOpen, onClose, initialQuestion }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle external triggers (e.g. "Ask DigiCare" buttons)
  useEffect(() => {
    if (isOpen && initialQuestion) {
        handleSend(initialQuestion);
    }
  }, [isOpen, initialQuestion]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
        let greeting = "Hello. I'm **DigiCare Coach**. \n\nI can see your full health and financial profile. I'm here to find the connections between your wallet and your waistline that others miss.\n\nWhat's on your mind?";
        setMessages([{ role: 'model', text: greeting }]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input.trim();
    if (!textToSend || (isLoading && !textOverride)) return;

    if (!textOverride) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setIsLoading(true);

    const responseText = await getCoachResponse(inputs, simulation, textToSend, activeTab);

    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
  };

  const getHeaderTitle = () => {
      switch(activeTab) {
          case 'health': return 'BodyTwin Coach';
          case 'money': return 'MoneyTwin Coach';
          case 'connections': return 'Connections Analyst';
          default: return 'Holistic Coach';
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end pointer-events-none p-0 sm:p-4">
        {/* Backdrop for mobile */}
        <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm sm:hidden pointer-events-auto" 
            onClick={onClose}
        ></div>

        <div className="relative z-10 bg-white w-full sm:w-[450px] h-[92vh] sm:h-[600px] shadow-2xl rounded-t-2xl sm:rounded-2xl flex flex-col pointer-events-auto border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-10 duration-300 pb-safe">
            {/* Header */}
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">{getHeaderTitle()}</h3>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                             Gemini 3 Pro Active
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 scroll-smooth">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-2xl p-4 sm:p-5 text-sm shadow-sm ${
                            m.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white border border-slate-200 rounded-bl-none'
                        }`}>
                            {m.role === 'user' ? (
                                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                            ) : (
                                <ReactMarkdown components={ModelMessageComponents}>
                                    {m.text}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                         <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-3">
                             <div className="flex gap-1">
                                 <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                 <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                 <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                             </div>
                             <span className="text-xs font-semibold text-slate-500 animate-pulse">Reasoning...</span>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0 pb-6 sm:pb-4">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="relative"
                >
                    <input 
                        type="text" 
                        placeholder="Ask your coach anything..." 
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-base sm:text-sm text-slate-800"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
                <div className="text-[10px] text-center text-slate-400 mt-2 hidden sm:block">
                    AI can make mistakes. Verify important medical & financial data.
                </div>
            </div>
        </div>
    </div>
  );
};
