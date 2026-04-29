import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from '../components/AuthProvider';
import { UserProfile, Follow } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  MapPin, 
  Globe, 
  Linkedin, 
  Github, 
  Edit, 
  Save, 
  X,
  Plus,
  Award,
  BookOpen,
  Briefcase,
  Upload,
  Camera,
  MessageSquare,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, profile: viewerProfile, isAdmin } = useAuth();
  const targetUid = userId || authUser?.uid;
  const isOwnProfile = !userId || userId === authUser?.uid;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!targetUid) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'users', targetUid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
          setEditData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [targetUid]);

  // Handle follow status and counts
  useEffect(() => {
    if (!targetUid) return;

    const followersQuery = query(collection(db, 'follows'), where('followingId', '==', targetUid));
    const followingQuery = query(collection(db, 'follows'), where('followerId', '==', targetUid));

    const unsubFollowers = onSnapshot(followersQuery, (snap) => {
      setFollowersCount(snap.size);
      if (authUser) {
        setIsFollowing(snap.docs.some(doc => doc.data().followerId === authUser.uid));
      }
    });

    const unsubFollowing = onSnapshot(followingQuery, (snap) => {
      setFollowingCount(snap.size);
    });

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [targetUid, authUser]);

  const handleFollow = async () => {
    if (!authUser || !targetUid || (!isAdmin && !authUser.emailVerified)) return;
    try {
      await addDoc(collection(db, 'follows'), {
        followerId: authUser.uid,
        followingId: targetUid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'follows');
    }
  };

  const handleUnfollow = async () => {
    if (!authUser || !targetUid) return;
    try {
      const q = query(collection(db, 'follows'), where('followerId', '==', authUser.uid), where('followingId', '==', targetUid));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (d) => {
        await deleteDoc(doc(db, 'follows', d.id));
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'follows');
    }
  };

  const handleUpdate = async () => {
    if (!targetUid) return;
    try {
      const updateData = {
        displayName: editData.displayName || '',
        photoURL: editData.photoURL || '',
        bio: editData.bio || '',
        role: editData.role || 'user',
        linkedin: editData.linkedin || '',
        github: editData.github || ''
      };
      await updateDoc(doc(db, 'users', targetUid), updateData);
      setProfile({ ...profile, ...updateData } as UserProfile);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditData({ ...editData, photoURL: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A2F6F]"></div>
    </div>
  );

  if (!profile) return <div>Profile not found.</div>;

  return (
    <div className="space-y-8">
      {/* Cover & Avatar Header */}
      <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="h-32 md:h-56 bg-[#0A2F6F] relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A2F6F] via-[#0A2F6F] to-[#10A37F] opacity-60"></div>
        </div>
        <div className="px-6 pb-6 md:px-10 md:pb-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 md:-mt-16 relative z-10">
            <div className="relative group shrink-0">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoSelect} 
                className="hidden" 
                accept="image/*"
              />
              <div className="w-24 h-24 md:w-36 md:h-36 rounded-2xl bg-white p-1 shadow-md border border-gray-100 overflow-hidden relative">
                <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center font-bold text-[#0A2F6F] text-2xl overflow-hidden">
                  {isEditing ? (
                    <div className="w-full h-full relative group/photo">
                       <img src={editData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} alt="Preview" className="w-full h-full object-cover" />
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover/photo:opacity-100 transition-opacity"
                       >
                         <Camera className="w-6 h-6 mb-1" />
                         <span className="text-[10px] font-bold uppercase">Change</span>
                       </button>
                    </div>
                  ) : profile.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    profile.displayName?.charAt(0) || 'U'
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                       <input 
                         type="text" 
                         value={editData.displayName || ''} 
                         onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                         className="text-2xl font-bold text-[#2D3436] tracking-tight bg-gray-50 border-none rounded px-2 focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                         placeholder="Username"
                       />
                       <input 
                         type="text" 
                         value={editData.role || ''} 
                         onChange={(e) => setEditData({...editData, role: e.target.value})}
                         className="block text-xs text-[#6C757D] font-bold uppercase tracking-widest bg-gray-50 border-none rounded px-2 focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                         placeholder="Professional Role"
                       />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-[#2D3436] tracking-tight">{profile.displayName}</h1>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-[#6C757D] font-bold uppercase tracking-widest">{profile.role}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-[#0A2F6F]">{followersCount}</span>
                            <span className="text-[10px] text-[#6C757D] font-bold uppercase">Followers</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-[#0A2F6F]">{followingCount}</span>
                            <span className="text-[10px] text-[#6C757D] font-bold uppercase">Following</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                  {isEditing ? (
                    <div className="px-5 py-2"></div>
                  ) : isOwnProfile ? (
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-5 py-2 bg-white border border-gray-200 text-[#0A2F6F] text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      {isFollowing ? (
                        <button 
                          onClick={handleUnfollow}
                          className="px-6 py-2 bg-[#F8F9FA] text-[#0A2F6F] text-sm font-bold rounded-lg border border-gray-200 hover:bg-[#FFE8E8] hover:text-red-600 hover:border-red-100 transition-all flex items-center justify-center gap-2"
                        >
                          <UserMinus className="w-4 h-4" />
                          Following
                        </button>
                      ) : (
                        <button 
                          onClick={handleFollow}
                          className="px-8 py-2 bg-[#10A37F] text-white text-sm font-bold rounded-lg shadow-lg shadow-[#10A37F]/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Follow
                        </button>
                      )}
                      <button 
                        onClick={() => navigate('/messages', { state: { contactId: targetUid } })}
                        className="px-5 py-2 bg-[#0A2F6F] text-white text-sm font-bold rounded-lg shadow-lg shadow-[#0A2F6F]/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Message
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* About & Info */}
        <div className="lg:col-span-2 space-y-8">
          <Section title="About" icon={<User className="w-5 h-5" />}>
            {isEditing ? (
              <textarea 
                value={editData.bio || ''}
                onChange={(e) => setEditData({...editData, bio: e.target.value})}
                className="w-full bg-[#F8F9FA] border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none h-32 resize-none"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-[#6C757D] leading-relaxed whitespace-pre-wrap">
                {profile.bio || "No biography provided yet."}
              </p>
            )}
          </Section>

          <Section title="Experience" icon={<Briefcase className="w-5 h-5" />} action={isOwnProfile && <Plus className="w-4 h-4" />}>
            <div className="space-y-6">
              {profile.experience?.length ? profile.experience.map((exp, i) => (
                <ExperienceItem key={i} {...exp} />
              )) : (
                <p className="text-[#6C757D] text-sm italic">Add your professional journey here.</p>
              )}
            </div>
          </Section>

          <Section title="Skills" icon={<Award className="w-5 h-5" />}>
             <div className="flex flex-wrap gap-2">
                {profile.skills?.map((skill, i) => (
                  <span key={i} className="px-4 py-2 bg-[#F8F9FA] text-[#0A2F6F] text-xs font-bold rounded-full border border-[#E9ECEF]">
                    {skill}
                  </span>
                ))}
                {isOwnProfile && <button className="px-3 py-2 border-2 border-dashed border-[#E9ECEF] rounded-full text-[#6C757D] hover:border-[#0A2F6F] hover:text-[#0A2F6F] transition-all"><Plus className="w-4 h-4" /></button>}
             </div>
          </Section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <Section title="Quick Links" icon={<Globe className="w-5 h-5" />}>
            <div className="space-y-4">
              <LinkItem icon={<Mail className="w-4 h-4" />} label="Email" value={profile.email} />
              {isEditing ? (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#6C757D] font-bold uppercase tracking-widest">LinkedIn (Username/URL)</label>
                    <input 
                      type="text"
                      value={editData.linkedin || ''}
                      onChange={(e) => setEditData({...editData, linkedin: e.target.value})}
                      placeholder="linkedin.com/in/user"
                      className="w-full bg-[#F8F9FA] border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#6C757D] font-bold uppercase tracking-widest">GitHub (Username/URL)</label>
                    <input 
                      type="text"
                      value={editData.github || ''}
                      onChange={(e) => setEditData({...editData, github: e.target.value})}
                      placeholder="github.com/user"
                      className="w-full bg-[#F8F9FA] border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <LinkItem icon={<Linkedin className="w-4 h-4" />} label="LinkedIn" value={profile.linkedin || "linkedin.com/in/user"} isLink />
                  <LinkItem icon={<Github className="w-4 h-4" />} label="GitHub" value={profile.github || "github.com/user"} isLink />
                </>
              )}
            </div>
          </Section>

          {isEditing && (
            <div className="sticky top-24">
              <button 
                onClick={handleUpdate}
                className="w-full py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-[#0A2F6F]/20 flex items-center justify-center gap-3"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children, action }: { title: string, icon: React.ReactNode, children: React.ReactNode, action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-lg text-[#0A2F6F] transition-colors">{icon}</div>
          <h2 className="text-lg font-bold text-[#0A2F6F] tracking-tight">{title}</h2>
        </div>
        {action && (
          <button className="p-2 hover:bg-gray-50 rounded-lg text-[#6C757D] transition-colors">
            {action}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ExperienceItem({ title, company, period, desc }: any) {
  return (
    <div className="relative pl-8 border-l-2 border-[#F8F9FA] pb-2 last:pb-0">
      <div className="absolute top-0 -left-[9px] w-4 h-4 rounded-full bg-white border-4 border-[#10A37F]"></div>
      <h4 className="font-bold text-[#212529]">{title}</h4>
      <p className="text-xs font-semibold text-[#10A37F] mb-1">{company} • {period}</p>
      <p className="text-sm text-[#6C757D] leading-relaxed">{desc}</p>
    </div>
  );
}

function LinkItem({ icon, label, value, isLink }: { icon: React.ReactNode, label: string, value: string, isLink?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-[#6C757D]">{icon}</div>
      <div>
        <p className="text-[10px] text-[#6C757D] font-bold uppercase tracking-widest">{label}</p>
        {isLink ? (
          <a href={`https://${value}`} target="_blank" rel="noreferrer" className="text-sm text-[#0A2F6F] font-medium hover:underline">{value}</a>
        ) : (
          <p className="text-sm text-[#212529] font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}
