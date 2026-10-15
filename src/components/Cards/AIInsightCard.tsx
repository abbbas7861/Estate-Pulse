import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, KeyRound, AlertCircle, Bot } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface AIInsightCardProps {
  statsSummary: string;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ statsSummary }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    '';

  const generateInsight = useCallback(async () => {
    if (!apiKey) {
      return;
    }

    setLoading(true);
    setError(null);

    const prompt = `You are the Chief Analytics Officer for an ultra-luxury real estate brokerage.
Given these stats:
${statsSummary}

Write a concise 2-sentence executive summary of the brokerage team's performance and exactly one specific, high-leverage actionable recommendation. Keep the tone sharp, prestigious, and data-driven. Do not include markdown bullet points, just clean paragraphs.`;

    try {
      const ai = new GoogleGenAI({ apiKey });

      // First try standard models.generateContent
      let text = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        text = response.text || '';
      } catch {
        // Fallback to interaction API or gemini-1.5-flash if available
        try {
          const interaction = await ai.interactions.create({
            model: 'gemini-3.8-flash',
            input: prompt,
          });
          text = (interaction as any).output_text || '';
        } catch {
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
          });
          text = fallbackRes.text || '';
        }
      }

      if (text) {
        setInsight(text.trim());
      } else {
        throw new Error('No response returned from Gemini.');
      }
    } catch (err: any) {
      console.error('[AIInsightCard] Gemini error:', err);
      setError(err?.message || 'Failed to generate AI insights.');
    } finally {
      setLoading(false);
    }
  }, [apiKey, statsSummary]);

  useEffect(() => {
    if (apiKey && statsSummary && !insight) {
      generateInsight();
    }
  }, [apiKey, statsSummary, insight, generateInsight]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-r from-[#0b1c30] via-[#0f2842] to-[#0b1c30] text-white p-5 sm:p-6 shadow-sm">
      {/* Background ambient glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#005d42]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#97f5cc]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Title & Badge */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#005d42] to-[#003828] border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-[#97f5cc] animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-[16px] text-white tracking-wide">
                EstatePulse Intelligence Brief
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#005d42]/80 text-[#97f5cc] border border-emerald-400/20">
                Gemini Powered
              </span>
            </div>

            {/* Content Body */}
            {!apiKey ? (
              <div className="mt-2 flex items-center gap-2 text-[13px] text-amber-200/90 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Add your Gemini API key (<code className="font-mono text-xs text-amber-300">VITE_GEMINI_API_KEY</code>) to enable AI insights.
                </span>
              </div>
            ) : loading ? (
              <div className="mt-2 flex items-center gap-2.5 text-[13px] text-emerald-200/80">
                <RefreshCw className="w-4 h-4 animate-spin text-[#97f5cc]" />
                <span>Analyzing lead conversion velocity &amp; advisor quota attainment…</span>
              </div>
            ) : error ? (
              <div className="mt-2 text-[13px] text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : insight ? (
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-200 max-w-4xl">
                {insight}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-slate-300">
                Click refresh to synthesize real-time team recommendations.
              </p>
            )}
          </div>
        </div>

        {/* Action button */}
        {apiKey && (
          <button
            type="button"
            onClick={generateInsight}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/30 text-[#97f5cc] border border-emerald-400/20 text-[12px] font-semibold flex items-center gap-2 transition-all cursor-pointer self-start md:self-auto shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Synthesizing…' : 'Refresh Insight'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
