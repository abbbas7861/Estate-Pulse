import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../../lib/supabaseClient';

// ─── Date Parser Helper ──────────────────────────────────────────────────────
// Parses a raw time string (e.g. "tomorrow at 9am") into a proper Date.
// All date math is done in JS — we never rely on Gemini for date arithmetic.
const parseMeetingTime = (rawText: string): Date => {
  const now = new Date();
  const targetDate = new Date(now);
  const lowerStr = rawText.toLowerCase();

  // 1. Check for "tomorrow"
  if (lowerStr.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  // 2. Extract time (e.g. "9 am", "2:30 pm")
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const match = lowerStr.match(timeRegex);

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3];

    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
      if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
    }
    targetDate.setHours(hours, minutes, 0, 0);
  } else {
    // Default to 9 AM if no time found
    targetDate.setHours(9, 0, 0, 0);
  }

  return targetDate;
};

interface AIChatBotProps {
  properties: any[];
  orgName?: string;
  orgId?: string;
}

export const AIChatBot: React.FC<AIChatBotProps> = ({ properties, orgName, orgId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: `Hello! I am the AI assistant for ${orgName || 'this brokerage'}. How can I help you find your dream property today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, isOpen]);

  // Retry helper: up to 3 attempts with exponential backoff on 503 errors
  const generateWithRetry = async (
    ai: GoogleGenAI,
    params: { model: string; contents: string },
    maxRetries = 3
  ) => {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await ai.models.generateContent(params);
      } catch (err: any) {
        lastError = err;
        const is503 =
          err?.status === 503 ||
          (err?.message && err.message.includes('503')) ||
          (err?.message && err.message.toLowerCase().includes('overloaded'));
        if (!is503 || attempt === maxRetries - 1) throw err;
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    console.log("API Key Loaded:", !!import.meta.env.VITE_GEMINI_API_KEY);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key missing.");

      const ai = new GoogleGenAI({ apiKey });

      const propertyContext = properties.map(p => 
        `- ${p.title}: ${p.beds} beds, ${p.baths} baths, Price: ${p.price}, Location: ${p.address || p.location || p.city}`
      ).join('\n');

      const chatHistory = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
        .join('\n');

      const prompt = `
        You are a professional real estate AI assistant for the brokerage "${orgName}".
        Here are the available properties:
        ${propertyContext}

        IMPORTANT INSTRUCTIONS:
        - Review the Chat History below. Do NOT ask for information the user has already provided.
        - The current date and time is ${new Date().toISOString()}. Use this as the reference for resolving relative dates.
        - If the user wants to BOOK A MEETING, you must collect BOTH their email and their preferred time.
          Once you have BOTH (from any point in the conversation), say "Your meeting is confirmed" and append this exact tag at the very end of your response: [SAVE_MEETING: email | raw_time_string]
          Where raw_time_string is the EXACT time phrase the user mentioned (e.g. "tomorrow at 9am", "Friday at 2pm"). Do NOT convert it to an ISO date.
        - CRITICAL RULE: If the user provides their Name and Phone Number, you MUST append this exact tag at the very end of your response: [SAVE_LEAD: name | phone | User wants to contact the broker]. Do NOT forget this tag.

        Chat History:
        ${chatHistory}

        Current User Message: "${userMessage}"
      `;

      const response = await generateWithRetry(ai, {
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
      });

      let botText = response.text || "I'm sorry, I couldn't process that.";
      
      // --- CHECK FOR MEETING SAVE TAG ---
      const meetingRegex = /\[SAVE_MEETING:\s*(.*?)\s*\|\s*(.*?)\s*\]/;
      const meetingMatch = botText.match(meetingRegex);
      
      if (meetingMatch && orgId) {
        const email = meetingMatch[1].trim();
        const rawTimeString = meetingMatch[2].trim();

        // Parse date in JS — never trust Gemini for date arithmetic
        const parsedDate = parseMeetingTime(rawTimeString);

        // Save to CRM Visits Table
        await supabase.from('visits').insert({
          org_id: orgId,
          visit_date: parsedDate.toISOString(),
          notes: `AI Booked Meeting | Email: ${email} | Requested Time: "${rawTimeString}"`,
          status: 'scheduled'
        });

        // Remove hidden tag from the text
        botText = botText.replace(meetingRegex, '').trim();
      }

      // --- CHECK FOR LEAD SAVE TAG ---
      const leadRegex = /\[SAVE_LEAD:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/;
      const leadMatch = botText.match(leadRegex);
      
      if (leadMatch && orgId) {
        const name = leadMatch[1];
        const phone = leadMatch[2];
        const message = leadMatch[3];
        
        // Save to CRM Leads Table
        await supabase.from('leads').insert({
          org_id: orgId,
          name: name,
          phone: phone,
          source: 'Website Chat',
          stage: 'assigned',
          website_message: message,
        });

        // Remove hidden tag from the text
        botText = botText.replace(leadRegex, '').trim();
      }

      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const is503 =
        error?.status === 503 ||
        (error?.message && error.message.includes('503')) ||
        (error?.message && error.message.toLowerCase().includes('overloaded'));
      const friendlyMsg = is503
        ? "Our AI assistant is currently experiencing high demand. Please try again in a few moments."
        : `Error: ${error.message || 'Network issue'}`;
      setMessages(prev => [...prev, { role: 'bot', text: friendlyMsg }]);
    } finally {
      setLoading(false);
    }
  };

  // Programmatic send for quick action buttons — bypasses the controlled input
  const handleQuickAction = async (text: string) => {
    if (loading) return;
    const userMessage = text.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Gemini API Key missing.');

      const ai = new GoogleGenAI({ apiKey });

      const propertyContext = properties
        .map(p => `- ${p.title}: ${p.beds} beds, ${p.baths} baths, Price: ${p.price}, Location: ${p.address || p.location || p.city}`)
        .join('\n');

      const chatHistory = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
        .join('\n');

      const prompt = `
        You are a professional real estate AI assistant for the brokerage "${orgName}".
        Here are the available properties:
        ${propertyContext}

        IMPORTANT INSTRUCTIONS:
        - Review the Chat History below. Do NOT ask for information the user has already provided.
        - The current date and time is ${new Date().toISOString()}. Use this as the reference for resolving relative dates.
        - If the user wants to BOOK A MEETING, you must collect BOTH their email and their preferred time.
          Once you have BOTH (from any point in the conversation), say "Your meeting is confirmed" and append this exact tag at the very end of your response: [SAVE_MEETING: email | raw_time_string]
          Where raw_time_string is the EXACT time phrase the user mentioned (e.g. "tomorrow at 9am", "Friday at 2pm"). Do NOT convert it to an ISO date.
        - CRITICAL RULE: If the user provides their Name and Phone Number, you MUST append this exact tag at the very end of your response: [SAVE_LEAD: name | phone | User wants to contact the broker]. Do NOT forget this tag.

        Chat History:
        ${chatHistory}

        Current User Message: "${userMessage}"
      `;

      const response = await generateWithRetry(ai, {
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
      });

      let botText = response.text || "I'm sorry, I couldn't process that.";

      // --- CHECK FOR MEETING SAVE TAG ---
      const meetingRegex = /\[SAVE_MEETING:\s*(.*?)\s*\|\s*(.*?)\s*\]/;
      const meetingMatch = botText.match(meetingRegex);
      if (meetingMatch && orgId) {
        const email = meetingMatch[1].trim();
        const rawTimeString = meetingMatch[2].trim();
        const parsedDate = parseMeetingTime(rawTimeString);
        await supabase.from('visits').insert({
          org_id: orgId,
          visit_date: parsedDate.toISOString(),
          notes: `AI Booked Meeting | Email: ${email} | Requested Time: "${rawTimeString}"`,
          status: 'scheduled',
        });
        botText = botText.replace(meetingRegex, '').trim();
      }

      // --- CHECK FOR LEAD SAVE TAG ---
      const leadRegex = /\[SAVE_LEAD:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/;
      const leadMatch = botText.match(leadRegex);
      if (leadMatch && orgId) {
        await supabase.from('leads').insert({
          org_id: orgId,
          name: leadMatch[1],
          phone: leadMatch[2],
          source: 'Website Chat',
          stage: 'assigned',
          website_message: leadMatch[3],
        });
        botText = botText.replace(leadRegex, '').trim();
      }

      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error: any) {
      console.error('Gemini Error:', error);
      const is503 =
        error?.status === 503 ||
        (error?.message && error.message.includes('503')) ||
        (error?.message && error.message.toLowerCase().includes('overloaded'));
      const friendlyMsg = is503
        ? 'Our AI assistant is currently experiencing high demand. Please try again in a few moments.'
        : `Error: ${error.message || 'Network issue'}`;
      setMessages(prev => [...prev, { role: 'bot', text: friendlyMsg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-tr from-[#C5A059] to-[#E6C87A] text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105 z-[100] border-[3px] border-white animate-slow-float ${isOpen ? 'hidden' : 'flex'}`}
      >
        <Bot className="w-8 h-8 drop-shadow-md" />
        {/* Online Indicator */}
        <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="bg-[#1A1A1A] text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#C5A059]" />
              <div>
                <h3 className="font-bold text-sm">AI Concierge</h3>
                <p className="text-[10px] text-slate-300">Powered by Gemini</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-[#C5A059] text-white'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`px-3 py-2 rounded-xl text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-[#1A1A1A] text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 shadow-sm rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#C5A059] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm rounded-tl-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Pill Buttons */}
          <div
            className="px-3 py-2 flex gap-2 overflow-x-auto bg-white border-t border-slate-100 shrink-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => handleQuickAction('Show me available properties')}
              disabled={loading}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-50 hover:bg-[#C5A059]/10 border border-slate-200 text-[11px] font-semibold text-slate-600 hover:text-[#C5A059] transition-colors cursor-pointer disabled:opacity-50"
            >
              🏠 View Properties
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('I want to book a meeting')}
              disabled={loading}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-50 hover:bg-[#C5A059]/10 border border-slate-200 text-[11px] font-semibold text-slate-600 hover:text-[#C5A059] transition-colors cursor-pointer disabled:opacity-50"
            >
              📅 Book a Meeting
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('I want to contact the broker')}
              disabled={loading}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-50 hover:bg-[#C5A059]/10 border border-slate-200 text-[11px] font-semibold text-slate-600 hover:text-[#C5A059] transition-colors cursor-pointer disabled:opacity-50"
            >
              📞 Contact Us
            </button>
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus-within:border-[#C5A059] focus-within:ring-1 focus-within:ring-[#C5A059] transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about properties..."
                className="flex-1 bg-transparent border-none text-sm text-slate-700 outline-none px-1"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-1.5 bg-[#C5A059] hover:bg-[#b08d4a] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};