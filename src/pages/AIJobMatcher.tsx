import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Briefcase, FileText, Wand2, CheckCircle2, AlertCircle, Loader2, Target, ArrowRight, Upload, X } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { matchJob, JobMatch } from '../services/aiService';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { useAuth } from '../components/AuthProvider';
import { saveJobMatch } from '../services/profileService';

export default function AIJobMatcher() {
  const { profile, user } = useAuth();
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<JobMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Fetch jobs from marketplace
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setJobTitle(job.title);
      setCompany(job.recruiterName || 'Marketplace Company');
      setJobDescription(job.description);
    }
  };

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

  const handleMatch = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please provide both your resume and the job description.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await matchJob(resumeText, jobDescription);
      setResult(data);

      if (user) {
        await saveJobMatch(user.uid, {
          userId: user.uid,
          jobTitle: jobTitle || 'Target Role',
          company: company || 'Unknown Company',
          jobDescription,
          matchScore: data.matchScore,
          explanation: data.explanation,
          skillsGap: data.skillsGap,
          recommendations: data.recommendations
        });
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0A2F6F] tracking-tight flex items-center gap-2">
            <Target className="w-8 h-8" />
            AI Job Matcher
          </h1>
          <p className="text-gray-500">Compare your profile with any job description to see if you're a good fit.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2 text-[#0A2F6F] font-bold">
              <Upload className="w-4 h-4" />
              1. Your Resume (PDF)
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

            {jobs.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#0A2F6F] flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Marketplace Jobs
                  </p>
                  <span className="text-[10px] text-gray-400 font-medium">{jobs.length} found</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar -ml-1 pl-1">
                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => handleJobSelect(job.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-2xl transition-all text-xs border relative group",
                        selectedJobId === job.id 
                          ? "bg-blue-50 border-blue-200 text-[#0A2F6F] ring-1 ring-blue-100" 
                          : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-blue-100"
                      )}
                    >
                      {selectedJobId === job.id && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-[#0A2F6F] rounded-r-full" />
                      )}
                      <div className="font-bold truncate">{job.title}</div>
                      <div className="text-[10px] opacity-70 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1 font-medium italic">
                          <CheckCircle2 className="w-2.5 h-2.5 text-[#10A37F]" />
                          {job.recruiterName}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="font-bold text-[#10A37F]">{job.budget}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {extracting && (
              <div className="flex items-center gap-2 text-xs text-[#0A2F6F] font-medium animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing PDF...
              </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4",
              !selectedJobId && "opacity-50 pointer-events-none"
            )}
          >
            <div className="flex items-center gap-2 text-[#0A2F6F] font-bold">
              <Briefcase className="w-4 h-4" />
              2. Selected Job Analysis
            </div>
            {selectedJobId ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <h3 className="font-bold text-[#0A2F6F]">{jobTitle}</h3>
                  <p className="text-xs text-[#10A37F] font-medium italic mt-1">{company}</p>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-2xl border border-gray-100 line-clamp-6">
                  {jobDescription}
                </div>
                <button
                  onClick={handleMatch}
                  disabled={loading || !resumeText.trim()}
                  className="w-full py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:bg-[#0A2F6F]/90 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  {loading ? 'Analyzing Compatibility...' : 'Check Match %'}
                </button>
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                <p className="text-xs text-gray-400 font-medium italic">Select a job from the Marketplace list to begin analysis</p>
              </div>
            )}
          </motion.div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-6">
          {!result && !loading && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl">
              <Target className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-400">Match Insights</h3>
              <p className="text-gray-400 max-w-xs">Fill in the details to see how well you match the recruiter's expectations.</p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center space-y-4 bg-white p-8 border border-gray-100 rounded-3xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl animate-pulse" />
                <ArrowRight className="w-6 h-6 text-gray-300 animate-bounce" />
                <div className="w-12 h-12 bg-[#0A2F6F]/10 rounded-xl animate-pulse" />
              </div>
              <p className="font-bold text-[#0A2F6F]">Calculating skills overlap...</p>
            </div>
          )}

          {result && !loading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
                <h3 className="text-gray-500 font-bold text-sm uppercase tracking-widest mb-2">Compatibility Score</h3>
                <div className="text-6xl font-black text-[#0A2F6F] mb-4">{result.matchScore}%</div>
                <p className="text-gray-600 italic">"{result.explanation}"</p>
              </div>

              <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
                <h4 className="text-orange-700 font-bold flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5" />
                  Skills Gap (Missing in your resume)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.skillsGap.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-white border border-orange-200 text-orange-700 rounded-full text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100">
                <h4 className="text-blue-700 font-bold flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  How to increase your score
                </h4>
                <ul className="space-y-3">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                      <span className="mt-1 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
