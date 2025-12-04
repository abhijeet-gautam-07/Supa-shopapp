"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote"; 

// --- Types ---
interface Message {
  role: "user" | "model";
  content: string; // Plain text (used for history context)
  mdxSource?: MDXRemoteSerializeResult; // Compiled MDX (used for display)
}

// --- Custom MDX Components (Styling for Chat) ---
// This transforms standard Markdown into a "Chat UI" look
const mdxComponents = {
  // Links: Blue and open in new tab
  a: (props: any) => (
    <a 
      {...props} 
      className="text-blue-600 underline hover:text-blue-800 break-all" 
      target="_blank" 
      rel="noopener noreferrer" 
    />
  ),
  // Bold: Used for Product Names usually
  strong: (props: any) => <strong {...props} className="font-bold text-gray-900 block mt-1" />,
  
  // Lists: Transform bullets into spacing
  ul: (props: any) => <div {...props} className="space-y-2 my-2" />,
  ol: (props: any) => <div {...props} className="space-y-2 my-2" />,
  
  // List Items: Transform into "Product Cards"
  li: (props: any) => (
    <div {...props} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm hover:bg-gray-100 transition-colors" />
  ),
  
  // Paragraphs: Relaxed spacing
  p: (props: any) => <p {...props} className="mb-1 last:mb-0 leading-relaxed" />,
  
  // Headers: Small and bold
  h1: (props: any) => <h3 {...props} className="font-bold text-base mt-2 mb-1" />,
  h2: (props: any) => <h4 {...props} className="font-bold text-sm mt-2 mb-1" />,
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // 1. Add User Message (Optimistic UI)
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 2. Prepare History (Send only raw text parts to API)
      const historyToSend = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      // 3. Call API
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg.content,
          history: historyToSend
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch response");

      // 4. Add Bot Message
      const botMsg: Message = { 
        role: "model", 
        content: data.content,      // Raw text for next history
        mdxSource: data.mdxSource   // Serialized MDX for rendering
      };
      
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "model", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          
          {/* Header */}
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-sm">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span className="font-bold tracking-wide">Store Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm opacity-70">
                <Bot size={40} className="mb-2" />
                <p>Hi! Ask me about products.</p>
                <p className="text-xs mt-1">"Show me cheap electronics"</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] p-3 rounded-2xl text-sm shadow-sm ${
                  m.role === "user" 
                    ? "bg-blue-600 text-white rounded-br-none" 
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                }`}>
                  {/* RENDER LOGIC: Use MDX if available, otherwise raw text */}
                  {m.role === "model" && m.mdxSource ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <MDXRemote {...m.mdxSource} components={mdxComponents} />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm text-gray-400 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about products..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-black transition-all"
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
          isOpen ? "bg-gray-200 text-gray-600 rotate-90" : "bg-blue-600 text-white"
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
}