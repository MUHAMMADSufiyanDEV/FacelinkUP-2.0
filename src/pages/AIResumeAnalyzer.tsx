import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { FileText, Wand2, CheckCircle2, AlertCircle, Loader2, BarChart3, ListChecks, Upload, X } from 'lucide-react';
import { analyzeResume, ResumeAnalysis } from '../services/aiService';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { useAuth } from '../components/AuthProvider';
import { updateCareerProfile } from '../services/profileService';

export default function AIResumeAnalyzer() {
  const { user } = useAuth();
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (text.trim().length < 50) {
        throw new Error('Could not extract enough text from the PDF. Please try a different file or ensure the PDF contains text (not just images).');
      }
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
    setResumeText('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) {
      setError('Please upload your resume PDF first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await analyzeResume(resumeText);
      setResult(data);
      
      // SAVE TO PROFILE FOR PERSISTENCE
      if (user) {
        await updateCareerProfile(user.uid, {
          resumeText,
          optimizedResume: data.optimizedText,
          atsScore: data.score,
          skills: data.keywords,
          lastAnalyzed: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong during analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0A2F6F] tracking-tight">AI Resume Analyzer</h1>
          <p className="text-gray-500">Get professional feedback and ATS optimization in seconds.</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-[#0A2F6F] px-4 py-2 rounded-full text-sm font-bold">
          <Wand2 className="w-4 h-4" />
          Powered by Gemini AI
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-[#0A2F6F] font-bold mb-2">
            <Upload className="w-5 h-5" />
            Upload Your Resume (PDF)
          </div>

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
              className="w-full h-[300px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center space-y-4 hover:border-[#0A2F6F] hover:bg-blue-50/50 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0A2F6F] group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-[#0A2F6F]">Click to upload or drag & drop</p>
                <p className="text-sm text-gray-500">PDF format only (Max 5MB)</p>
              </div>
            </div>
          ) : (
            <div className="w-full p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0A2F6F] truncate max-w-[200px]">{resumeFile.name}</p>
                    <p className="text-xs text-gray-500">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={removeFile}
                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {extracting && (
                <div className="flex items-center gap-2 text-sm text-[#0A2F6F] font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting text from PDF...
                </div>
              )}

              {resumeText && !extracting && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Resume text loaded and ready for analysis
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || extracting || !resumeText.trim()}
            className="w-full py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:bg-[#0A2F6F]/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Analyze My Resume
              </>
            )}
          </button>
        </motion.div>

        {/* Results Section */}
        <div className="space-y-6">
          {!result && !loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-400">Analysis Results</h3>
              <p className="text-gray-400 max-w-xs">Upload or paste your resume to see your score and improvements.</p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-4 bg-white p-8 border border-gray-100 rounded-3xl shadow-sm">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-gray-100 border-t-[#0A2F6F] rounded-full animate-spin"></div>
                <Wand2 className="w-8 h-8 text-[#0A2F6F] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="font-bold text-[#0A2F6F]">Reading your profile...</p>
                <p className="text-sm text-gray-500">Comparing with 1,000+ industry standards</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Score Card */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">ATS Match Score</h3>
                  <p className="text-4xl font-black text-[#0A2F6F]">{result.score}%</p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-gray-100 flex items-center justify-center relative">
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-[#0A2F6F] border-t-transparent"
                    style={{ transform: `rotate(${(result.score / 100) * 360}deg)` }}
                  ></div>
                  <CheckCircle2 className="w-8 h-8 text-[#0A2F6F]" />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-[#0A2F6F] mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Expert Summary
                </h3>
                <p className="text-gray-600 leading-relaxed">{result.summary}</p>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                  <h4 className="text-green-700 font-bold text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Key Strengths
                  </h4>
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-green-500 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                  <h4 className="text-orange-700 font-bold text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Improvements
                  </h4>
                  <ul className="space-y-2">
                    {result.improvements.map((s, i) => (
                      <li key={i} className="text-sm text-orange-800 flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Optimized Content */}
              <div className="bg-[#0A2F6F] rounded-3xl p-6 text-white overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-blue-200">
                    <Wand2 className="w-5 h-5" />
                    AI Optimized Version
                  </h3>
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
                    <p className="text-sm leading-relaxed italic">"{result.optimizedText}"</p>
                  </div>
                  <button className="mt-4 text-xs font-bold bg-white text-[#0A2F6F] px-4 py-2 rounded-full hover:bg-blue-50 transition-colors">
                    Copy AI Version
                  </button>
                </div>
                <Wand2 className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12" />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
