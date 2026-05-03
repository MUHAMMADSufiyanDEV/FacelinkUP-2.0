import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Wand2, Loader2, Copy, Check, AlertCircle, Send, Users, Briefcase } from 'lucide-react';
import { writeEmail } from '../services/aiService';

export default function AIEmailWriter() {
  const [context, setContext] = useState('');
  const [type, setType] = useState<'follow-up' | 'networking' | 'application'>('application');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWrite = async () => {
    if (!context.trim()) {
      setError('Please provide some context for the email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const text = await writeEmail(context, type);
      setEmail(text);
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#0A2F6F] tracking-tight flex items-center gap-2">
          <Mail className="w-8 h-8" />
          AI Email Writer
        </h1>
        <p className="text-gray-500">Draft professional, polite, and effective emails for any situation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-[#0A2F6F]">What type of email?</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'application', label: 'Application', icon: Briefcase },
                  { id: 'follow-up', label: 'Follow-up', icon: Send },
                  { id: 'networking', label: 'Networking', icon: Users },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id as any)}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-2 ${
                      type === t.id 
                      ? 'bg-[#0A2F6F] text-white border-[#0A2F6F] shadow-lg shadow-[#0A2F6F]/20' 
                      : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-[#0A2F6F]">Context & Details</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Following up after an interview with Jane from TechCorp for the Product Manager role. It was last Thursday."
                className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#0A2F6F] outline-none text-sm resize-none"
              />
            </div>

            <button
              onClick={handleWrite}
              disabled={loading}
              className="w-full py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:bg-[#0A2F6F]/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              {loading ? 'Drafting...' : 'Write Email'}
            </button>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[500px] overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">AI Result</span>
            {email && (
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(email);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 text-[#0A2F6F] text-xs font-bold hover:underline"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <div className="p-8 flex-1 prose prose-blue max-w-none">
            {!email && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-300">
                <Mail className="w-16 h-16 opacity-10 mb-4" />
                <p>Your drafted email will appear here.</p>
              </div>
            )}
            
            {loading && (
              <div className="space-y-4">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/4" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-20 bg-gray-100 rounded animate-pulse w-full" />
              </div>
            )}

            {email && !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-pre-wrap text-gray-700 font-sans leading-relaxed"
              >
                {email}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
