import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Wand2, Loader2, ChevronDown, ChevronUp, Lightbulb, CheckCircle2, Target, Video, Sparkles, ArrowRight } from 'lucide-react';
import { generateInterviewPrep, InterviewQA } from '../services/aiService';
import { useAuth } from '../components/AuthProvider';

export default function AIInterviewPrep() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<InterviewQA[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If user has an active job role in profile, pre-fill it
    if (profile?.careerGoals) {
      setJobDescription(profile.careerGoals);
    }
  }, [profile]);

  const handlePrep = async () => {
    if (!jobDescription.trim()) {
      setError('Please provide a job description or role name.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await generateInterviewPrep(jobDescription);
      setQuestions(data);
      setExpandedIndex(0); // Open first question by default
    } catch (err: any) {
      setError(err.message || 'Failed to generate prep materials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#0A2F6F] tracking-tight flex items-center gap-2">
          <Target className="w-8 h-8" />
          AI Interview Prep
        </h1>
        <p className="text-gray-500">Role-specific questions and targeted answers to help you ace your interview.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#0A2F6F] to-[#1a4b8f] rounded-3xl p-6 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Video className="w-24 h-24 rotate-12" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 text-blue-200 uppercase text-[10px] font-black tracking-widest">
                <Sparkles className="w-3 h-3" />
                New Feature
              </div>
              <h3 className="text-xl font-black leading-tight">Live Video Interview</h3>
              <p className="text-blue-100 text-xs leading-relaxed">
                Practice with our real-time AI interviewer. Get feedback on your body language, tone, and answers in a realistic video call environment.
              </p>
              <button 
                onClick={() => navigate('/ai/interview/live')}
                className="w-full py-3 bg-white text-[#0A2F6F] font-bold rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group"
              >
                Start Live Interview
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4"
          >
            <label className="text-sm font-bold text-[#0A2F6F]">What's the job role?</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer at a Fintech startup..."
              className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#0A2F6F] outline-none text-sm resize-none"
            />
            <button
              onClick={handlePrep}
              disabled={loading}
              className="w-full py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:bg-[#0A2F6F]/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              {loading ? 'Simulating Interview...' : 'Generate Prep Guide'}
            </button>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </motion.div>

          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <h4 className="text-blue-800 font-bold text-xs uppercase mb-2">How it works</h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              Our AI analyzes the job role to identify common technical challenges and behavioral questions you'll likely face.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {!questions.length && !loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl">
              <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-400">Your personalized interview prep guide will be generated here.</p>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white border border-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {questions.map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <button 
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#0A2F6F]/5 rounded-xl flex items-center justify-center text-[#0A2F6F] font-bold text-sm">
                    Q{index + 1}
                  </div>
                  <h3 className="font-bold text-[#0A2F6F] group-hover:text-blue-600 transition-colors">
                    {item.question}
                  </h3>
                </div>
                {expandedIndex === index ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              <AnimatePresence>
                {expandedIndex === index && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-50 bg-gray-50/30"
                  >
                    <div className="p-6 space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Suggested Answer
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 shadow-sm italic">
                          "{item.suggestedAnswer}"
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-blue-800">Expert Tip</h4>
                          <p className="text-xs text-blue-600 leading-relaxed">
                            {item.tip}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
