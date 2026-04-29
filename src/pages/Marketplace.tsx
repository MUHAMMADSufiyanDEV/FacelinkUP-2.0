import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from '../components/AuthProvider';
import { Job, UserRole } from '../types';
import { sendEmailNotification } from '../lib/notifications';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  Search, 
  Plus, 
  X,
  ChevronRight,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

interface JobCardProps {
  job: Job;
  onView: (job: Job) => void;
  onApply: (job: Job) => void;
  key?: React.Key;
}

export default function Marketplace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [proposal, setProposal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  
  const { profile, user, isAdmin } = useAuth();

  useEffect(() => {
    if (!selectedJob || (!isAdmin && (profile?.role !== 'recruiter' || selectedJob.recruiterId !== profile.uid))) {
      setApplications([]);
      return;
    }

    setIsLoadingApps(true);
    const q = query(collection(db, 'jobs', selectedJob.id, 'applications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingApps(false);
    }, (error) => {
      console.error("Error fetching applications:", error);
      setIsLoadingApps(false);
    });

    return () => unsubscribe();
  }, [selectedJob, profile]);

  // Create job state
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    budget: '',
    type: 'fixed' as 'fixed' | 'hourly'
  });

  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Job));
      setJobs(jobsData);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (profile.role !== 'recruiter' && !isAdmin)) return;

    try {
      await addDoc(collection(db, 'jobs'), {
        ...newJob,
        recruiterId: profile.uid,
        recruiterName: profile.displayName || profile.email.split('@')[0],
        status: 'open',
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewJob({ title: '', description: '', budget: '', type: 'fixed' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'jobs');
    }
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedJob || !proposal.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'jobs', selectedJob.id, 'applications'), {
        freelancerId: profile.uid,
        freelancerName: profile.displayName || profile.email.split('@')[0],
        proposal,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Send Email Notification to Recruiter
      const recruiterDoc = await getDoc(doc(db, 'users', selectedJob.recruiterId));
      if (recruiterDoc.exists()) {
        const recruiterData = recruiterDoc.data();
        if (recruiterData.email) {
          await sendEmailNotification(
            recruiterData.email,
            `New Proposal for ${selectedJob.title}`,
            `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e9ecef; border-radius: 12px;">
                <h2 style="color: #0A2F6F;">New Job Proposal</h2>
                <p>Hi ${recruiterData.displayName},</p>
                <p><strong>${profile.displayName}</strong> has submitted a proposal for your job listing: <strong>${selectedJob.title}</strong>.</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin-top: 0;">Proposal Summary:</h4>
                  <p style="font-style: italic;">"${proposal.substring(0, 150)}..."</p>
                </div>
                <p>
                  <a href="${window.location.origin}/marketplace" style="background: #10A37F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Applications</a>
                </p>
              </div>
            `
          );
        }
      }

      setIsApplyModalOpen(false);
      setProposal('');
      alert('Proposal submitted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `jobs/${selectedJob.id}/applications`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAppStatus = async (jobId: string, appId: string, status: string, freelancerId: string) => {
    try {
      await updateDoc(doc(db, 'jobs', jobId, 'applications', appId), {
        status,
        updatedAt: serverTimestamp()
      });

      // Send Email Notification to Freelancer
      const freelancerDoc = await getDoc(doc(db, 'users', freelancerId));
      if (freelancerDoc.exists()) {
        const freelancerData = freelancerDoc.data();
        if (freelancerData.email) {
          const jobDoc = await getDoc(doc(db, 'jobs', jobId));
          const jobTitle = jobDoc.exists() ? jobDoc.data().title : 'the job';
          
          await sendEmailNotification(
            freelancerData.email,
            `Application Update: ${jobTitle}`,
            `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e9ecef; border-radius: 12px;">
                <h2 style="color: #0A2F6F;">Application Status Updated</h2>
                <p>Hi ${freelancerData.displayName},</p>
                <p>Your application status for <strong>${jobTitle}</strong> has been updated to: <span style="font-weight: bold; color: ${status === 'accepted' ? '#10A37F' : '#6C757D'}">${status.toUpperCase()}</span>.</p>
                <p>You can check the details on your dashboard.</p>
                <p style="margin-top: 20px;">
                  <a href="${window.location.origin}/marketplace" style="background: #0A2F6F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Check Status</a>
                </p>
              </div>
            `
          );
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `jobs/${jobId}/applications/${appId}`);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0A2F6F] mb-2 tracking-tight">Marketplace</h1>
          <p className="text-[#6C757D] text-sm">Discover your next big opportunity or find the perfect talent.</p>
        </div>
        {(profile?.role === 'recruiter' || isAdmin) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={!isAdmin && !user?.emailVerified}
            className="flex items-center gap-2 px-6 py-3 bg-[#10A37F] text-white font-bold rounded-2xl hover:scale-105 transition-all shadow-lg shadow-[#10A37F]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            {user?.emailVerified ? 'Post a Job' : 'Verify Email to Post'}
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C757D]" />
          <input 
            type="text" 
            placeholder="Search keywords, job titles, or skills..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-[#E9ECEF] rounded-2xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none shadow-sm"
          />
        </div>
        <button className="px-6 py-4 bg-white border border-[#E9ECEF] rounded-2xl text-[#6C757D] font-bold flex items-center gap-3 hover:bg-[#F8F9FA] transition-all shadow-sm">
          <Filter className="w-5 h-5" />
          More Filters
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                onView={(j) => setSelectedJob(j)}
                onApply={(j) => {
                  setSelectedJob(j);
                  setIsApplyModalOpen(true);
                }}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-[#6C757D]">
              No jobs found matching your search.
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Job Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-3xl p-8 shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-[#0A2F6F]">Post a New Job</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#F8F9FA] rounded-full">
                  <X className="w-6 h-6 text-[#6C757D]" />
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Job Title</label>
                  <input 
                    required
                    value={newJob.title}
                    onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                    placeholder="e.g. Senior Frontend Engineer" 
                    className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Description</label>
                  <textarea 
                    required
                    value={newJob.description}
                    onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                    placeholder="Describe the role, responsibilities, and requirements..." 
                    className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none h-40 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Budget / Rate</label>
                    <input 
                      required
                      value={newJob.budget}
                      onChange={(e) => setNewJob({...newJob, budget: e.target.value})}
                      placeholder="e.g. $50/hr or $2000" 
                      className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Payment Type</label>
                    <select 
                      value={newJob.type}
                      onChange={(e) => setNewJob({...newJob, type: e.target.value as any})}
                      className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                    >
                      <option value="fixed">Fixed Price</option>
                      <option value="hourly">Hourly Rate</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-[#F8F9FA] text-[#6C757D] font-bold rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-[#10A37F] text-white font-bold rounded-2xl hover:bg-[#10A37F]/90 transition-all shadow-lg shadow-[#10A37F]/20"
                  >
                    Post Job Listing
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details & Apply Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isApplyModalOpen) setSelectedJob(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                   <span className="px-2 py-1 bg-emerald-50 text-[#10A37F] text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">
                    {selectedJob.type === 'hourly' ? 'Hourly Gig' : 'Project Based'}
                  </span>
                  <h2 className="text-2xl font-bold text-[#0A2F6F]">{selectedJob.title}</h2>
                  <p className="text-[#6C757D] text-sm mt-1">Hiring Manager: {selectedJob.recruiterName}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedJob(null);
                    setIsApplyModalOpen(false);
                  }} 
                  className="p-2 hover:bg-[#F8F9FA] rounded-full"
                >
                  <X className="w-6 h-6 text-[#6C757D]" />
                </button>
              </div>

              {!isApplyModalOpen ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-8 py-4 border-y border-gray-50">
                    <div className="flex items-center gap-2">
                       <DollarSign className="w-5 h-5 text-[#10A37F]" />
                       <div>
                         <p className="text-[10px] text-gray-400 font-bold uppercase">Budget</p>
                         <p className="text-lg font-bold text-[#10A37F]">{selectedJob.budget}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Clock className="w-5 h-5 text-amber-500" />
                       <div>
                         <p className="text-[10px] text-gray-400 font-bold uppercase">Posted</p>
                         <p className="text-base font-semibold text-[#6C757D]">
                           {selectedJob.createdAt?.toDate ? formatDistanceToNow(selectedJob.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                         </p>
                       </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#0A2F6F] mb-3 uppercase tracking-wider">Project Description</h3>
                    <div className="text-[#2D3436] text-sm leading-loose whitespace-pre-wrap bg-gray-50 p-6 rounded-2xl mb-6">
                      {selectedJob.description}
                    </div>
                  </div>

                  {(isAdmin || (profile?.role === 'recruiter' && selectedJob.recruiterId === profile.uid)) && (
                    <div className="mt-8">
                      <h3 className="text-sm font-bold text-[#0A2F6F] mb-4 uppercase tracking-wider flex items-center gap-2">
                        Applications <span className="bg-emerald-50 text-[#10A37F] px-2 py-0.5 rounded-full text-[10px]">{applications.length}</span>
                      </h3>
                      <div className="space-y-3">
                        {isLoadingApps ? (
                          <div className="text-center py-4 text-xs text-gray-400">Loading applications...</div>
                        ) : applications.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 rounded-2xl text-xs text-gray-400 border border-dashed border-gray-200">
                             No applications yet for this project.
                          </div>
                        ) : (
                          applications.map(app => (
                            <div key={app.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-bold text-sm text-[#0A2F6F]">{app.freelancerName}</div>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                  app.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                  {app.status}
                                </span>
                              </div>
                              <p className="text-xs text-[#6C757D] leading-relaxed line-clamp-3">{app.proposal}</p>
                              <div className="mt-3 flex gap-2">
                                <button className="text-[10px] font-bold text-[#0A2F6F] hover:underline">View Full Profile</button>
                                <button 
                                  onClick={() => handleUpdateAppStatus(selectedJob.id, app.id, 'accepted', app.freelancerId)}
                                  className="text-[10px] font-bold text-[#10A37F] hover:underline"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleUpdateAppStatus(selectedJob.id, app.id, 'rejected', app.freelancerId)}
                                  className="text-[10px] font-bold text-red-500 hover:underline"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-6 flex gap-4 border-t border-gray-50">
                    {(profile?.role === 'freelancer' || profile?.role === 'user') && profile?.uid !== selectedJob.recruiterId && (
                      <button 
                        onClick={() => setIsApplyModalOpen(true)}
                        disabled={!isAdmin && !user?.emailVerified}
                        className="flex-1 py-4 bg-[#10A37F] text-white font-bold rounded-2xl hover:bg-[#10A37F]/90 transition-all shadow-lg shadow-[#10A37F]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {user?.emailVerified ? 'Submit Proposal' : 'Verify Email to Apply'}
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedJob(null)}
                      className="px-8 py-4 bg-[#F8F9FA] text-[#6C757D] font-bold rounded-2xl hover:bg-gray-200 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitProposal} className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Your Proposal</label>
                    <textarea 
                      required
                      value={proposal}
                      onChange={(e) => setProposal(e.target.value)}
                      placeholder="Explain why you're a good fit, your relevant experience, and your approach..." 
                      className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none h-60 resize-none"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsApplyModalOpen(false)}
                      className="flex-1 py-4 bg-[#F8F9FA] text-[#6C757D] font-bold rounded-2xl hover:bg-gray-200 transition-all"
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1 py-4 bg-[#10A37F] text-white font-bold rounded-2xl hover:bg-[#10A37F]/90 transition-all shadow-lg shadow-[#10A37F]/20 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Send Proposal'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JobCard({ job, onView, onApply }: JobCardProps) {
  const { profile, user, isAdmin } = useAuth();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl border-l-4 border-l-[#10A37F] border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-300 flex flex-col h-full group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <span className="px-2 py-1 bg-emerald-50 text-[#10A37F] text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">
            {job.type === 'hourly' ? 'Hourly Gig' : 'Project Based'}
          </span>
          <h3 className="font-bold text-base text-[#0A2F6F] line-clamp-1">{job.title}</h3>
          <p className="text-[11px] text-[#6C757D] mt-1 italic">Hiring: {job.recruiterName}</p>
        </div>
        <div className="text-right ml-4">
          <p className="text-base font-bold text-[#10A37F]">{job.budget}</p>
          <p className="text-[9px] text-gray-400 font-medium">Active Opportunity</p>
        </div>
      </div>
      
      <p className="text-xs text-[#6C757D] leading-relaxed line-clamp-3 mb-6 flex-1">
        {job.description}
      </p>

      <div className="flex items-center gap-2 pt-4 border-t border-gray-50 mt-auto">
        {(profile?.role === 'freelancer' || profile?.role === 'user' || isAdmin) && profile?.uid !== job.recruiterId && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onApply(job);
            }}
            disabled={!isAdmin && !user?.emailVerified}
            className="bg-[#10A37F] text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-[#10A37F]/90 transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdmin || user?.emailVerified ? 'Submit Proposal' : 'Verify to Apply'}
          </button>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onView(job);
          }}
          className={cn(
            "border border-gray-200 text-gray-500 px-4 py-1.5 rounded text-xs font-bold hover:bg-gray-50 transition-colors",
            ((profile?.role !== 'freelancer' && profile?.role !== 'user' && !isAdmin) || profile?.uid === job.recruiterId) && "w-full"
          )}
        >
          View Detail
        </button>
      </div>
    </motion.div>
  );
}
