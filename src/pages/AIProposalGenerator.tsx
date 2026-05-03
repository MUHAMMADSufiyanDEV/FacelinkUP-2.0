import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, FileText, Briefcase, Wand2, Loader2, Copy, Check, AlertCircle, Upload, X } from 'lucide-react';
import { generateProposal } from '../services/aiService';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { useAuth } from '../components/AuthProvider';

export default function AIProposalGenerator() {
  const { profile } = useAuth();
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (profile?.resumeText) {
      setResumeText(profile.resumeText);
    }
  }, [profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setResumeFile(file);
    setExtracting(true);
    setError(null);
    try {
      const text = await extractTextFromPdf(file);
      setResumeText(text);
    } catch (err: any) {
      setError(err.message || 'Failed to extract text from PDF.');
      setResumeFile(null);
    } finally {
      setExtracting(false);
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    setResumeText(profile?.resumeText || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Both resume (PDF) and job description are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const text = await generateProposal(resumeText, jobDescription);
      setProposal(text);
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (proposal) {
      navigator.clipboard.writeText(proposal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#0A2F6F] tracking-tight flex items-center gap-2">
          <Send className="w-8 h-8" />
          AI Proposal Generator
        </h1>
        <p className="text-gray-500">Create a personalized, high-converting job proposal in seconds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <label className="text-sm font-bold text-[#0A2F6F] flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Resume Context (PDF)
            </label>
            
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />

            {!resumeFile ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-[#0A2F6F] hover:bg-blue-50/50 transition-all cursor-pointer group"
              >
                <Upload className="w-6 h-6 text-[#0A2F6F] group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-[#0A2F6F]">Upload Resume PDF</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-5 h-5 text-[#0A2F6F] shrink-0" />
                  <span className="text-xs font-medium text-[#0A2F6F] truncate">{resumeFile.name}</span>
                </div>
                <button onClick={removeFile} className="p-1 hover:bg-white rounded text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {extracting && (
              <div className="flex items-center gap-2 text-xs text-[#0A2F6F] font-medium animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Reading Resume...
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <label className="text-sm font-bold text-[#0A2F6F] flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Job Details
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job requirements..."
              className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#0A2F6F] outline-none text-sm"
            />
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:bg-[#0A2F6F]/90 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {loading ? 'Crafting Your Proposal...' : 'Generate AI Proposal'}
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">Drafted Proposal</span>
            {proposal && (
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1 text-[#0A2F6F] text-xs font-bold hover:underline"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            )}
          </div>
          <div className="flex-1 p-6 relative">
            {!proposal && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <Send className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-400 text-sm">Your custom proposal will appear here.</p>
              </div>
            )}
            
            {loading && (
              <div className="space-y-4">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
                <div className="h-32 bg-gray-100 rounded animate-pulse w-full" />
              </div>
            )}

            {proposal && !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap font-sans"
              >
                {proposal}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
