import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, where, getDocs, limit, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from '../components/AuthProvider';
import { UserProfile, Follow, Connection } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  UserPlus, 
  UserMinus, 
  MapPin, 
  Briefcase, 
  Check,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Handshake,
  Clock,
  UserCheck,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Network() {
  const { profile, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'following' | 'connections'>('discover');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'follows'), where('followerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = new Set(snapshot.docs.map(doc => (doc.data() as Follow).followingId));
      setFollowingIds(ids);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'follows');
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch connections for the current user
  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, 'connections'), where('user1Id', '==', user.uid));
    const q2 = query(collection(db, 'connections'), where('user2Id', '==', user.uid));

    let conn1: Connection[] = [];
    let conn2: Connection[] = [];

    const unsub1 = onSnapshot(q1, (snap) => {
      conn1 = snap.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
      setConnections([...conn1, ...conn2]);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      conn2 = snap.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
      setConnections([...conn1, ...conn2]);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  // Fetch users to discover
  useEffect(() => {
    const q = query(collection(db, 'users'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as UserProfile)));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleFollow = async (targetUserId: string) => {
    if (!user || !profile || (!isAdmin && !user.emailVerified)) return;
    try {
      await addDoc(collection(db, 'follows'), {
        followerId: user.uid,
        followingId: targetUserId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'follows');
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'follows'), 
        where('followerId', '==', user.uid), 
        where('followingId', '==', targetUserId)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (document) => {
        await deleteDoc(doc(db, 'follows', document.id));
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'follows');
    }
  };

  const handleConnect = async (targetUserId: string) => {
    if (!user || !profile || (!isAdmin && !user.emailVerified)) return;
    try {
      await addDoc(collection(db, 'connections'), {
        user1Id: user.uid,
        user2Id: targetUserId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'connections');
    }
  };

  const handleAcceptConnection = async (connectionId: string) => {
    try {
      await updateDoc(doc(db, 'connections', connectionId), {
        status: 'accepted'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'connections');
    }
  };

  const handleRejectConnection = async (connectionId: string) => {
    try {
      await deleteDoc(doc(db, 'connections', connectionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'connections');
    }
  };

  const getConnectionForUser = (userId: string) => {
    return connections.find(c => c.user1Id === userId || c.user2Id === userId);
  };

  const filteredUsers = users.filter(u => {
    if (u.uid === user?.uid) return false;
    const matchesSearch = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'following') return matchesSearch && followingIds.has(u.uid);
    if (activeTab === 'connections') {
       const conn = getConnectionForUser(u.uid);
       return matchesSearch && conn && conn.status === 'accepted';
    }
    
    return matchesSearch;
  });

  const pendingRequests = connections.filter(c => c.user2Id === user?.uid && c.status === 'pending');

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0A2F6F] mb-1 tracking-tight">Network</h1>
          <p className="text-[#6C757D] text-sm">Grow your professional circle and stay connected.</p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF] shadow-sm space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C757D]" />
          <input 
            type="text" 
            placeholder="Search people by name, skill, or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#F8F9FA] border-none rounded-2xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
          />
        </div>

        <div className="flex gap-4 border-b border-[#F8F9FA]">
          {(['discover', 'following', 'connections'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-4 px-2 text-sm font-bold transition-all border-b-2 relative",
                activeTab === tab 
                  ? "text-[#0A2F6F] border-[#0A2F6F]" 
                  : "text-[#6C757D] border-transparent hover:text-[#0A2F6F]"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'connections' && pendingRequests.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{pendingRequests.length}</span>
              )}
              {activeTab === tab && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0A2F6F]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Requests Section */}
      {activeTab === 'connections' && pendingRequests.length > 0 && (
        <div className="bg-[#FFF9F9] rounded-3xl p-6 border border-red-50">
          <h3 className="text-sm font-bold text-red-600 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending Connection Requests
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {pendingRequests.map(req => {
                const requester = users.find(u => u.uid === req.user1Id);
                if (!requester) return null;
                return (
                  <div key={req.id} className="bg-white p-4 rounded-2xl border border-red-100 flex items-center gap-4">
                    <img src={requester.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${requester.uid}`} className="w-10 h-10 rounded-full" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0A2F6F] truncate">{requester.displayName}</p>
                      <p className="text-[10px] text-[#6C757D]">{requester.role}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleAcceptConnection(req.id)} className="p-2 bg-[#10A37F] text-white rounded-lg hover:bg-[#10A37F]/90"><Check className="w-4 h-4" /></button>
                       <button onClick={() => handleRejectConnection(req.id)} className="p-2 bg-gray-100 text-[#6C757D] rounded-lg hover:bg-gray-200"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
             })}
          </div>
        </div>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
             <div className="col-span-full py-20 text-center text-[#6C757D]">
               <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
               <p>Loading your network...</p>
             </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <UserCard 
                key={u.uid} 
                profile={u} 
                isFollowing={followingIds.has(u.uid)}
                connection={getConnectionForUser(u.uid)}
                onFollow={() => handleFollow(u.uid)}
                onUnfollow={() => handleUnfollow(u.uid)}
                onConnect={() => handleConnect(u.uid)}
                onViewProfile={() => navigate(`/profile/${u.uid}`)}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-[#6C757D] bg-white rounded-3xl border border-dashed border-gray-200">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No users found matching your query.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function UserCard({ profile, isFollowing, connection, onFollow, onUnfollow, onConnect, onViewProfile }: { 
  profile: UserProfile; 
  isFollowing: boolean;
  connection?: Connection;
  onFollow: () => void;
  onUnfollow: () => void;
  onConnect: () => void;
  onViewProfile: () => void;
  key?: React.Key;
}) {
  const { user } = useAuth();
  
  const renderConnectionButton = () => {
    if (!connection) {
       return (
         <button 
           onClick={onConnect}
           className="w-full py-2 bg-[#0A2F6F] text-white text-xs font-bold rounded-xl hover:bg-[#0A2F6F]/90 transition-all flex items-center justify-center gap-2 shadow-sm"
         >
           <Handshake className="w-3.5 h-3.5" />
           Connect
         </button>
       );
    }

    if (connection.status === 'accepted') {
      return (
        <button 
          className="w-full py-2 bg-green-50 text-[#10A37F] text-xs font-bold rounded-xl border border-green-100 flex items-center justify-center gap-2"
          disabled
        >
          <UserCheck className="w-3.5 h-3.5" />
          Connected
        </button>
      );
    }

    if (connection.status === 'pending') {
      const isSentByMe = connection.user1Id === user?.uid;
      return (
        <button 
          className="w-full py-2 bg-amber-50 text-amber-600 text-xs font-bold rounded-xl border border-amber-100 flex items-center justify-center gap-2"
          disabled
        >
          <Clock className="w-3.5 h-3.5" />
          {isSentByMe ? 'Request Sent' : 'Request Pending'}
        </button>
      );
    }

    return null;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-3xl border border-[#E9ECEF] p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#0A2F6F]/5 -mr-12 -mt-12 rounded-full" />
      
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <img 
            src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName || profile.email}`} 
            className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
            alt={profile.displayName} 
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#10A37F] rounded-full border-2 border-white flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-[#0A2F6F] line-clamp-1">{profile.displayName || profile.email.split('@')[0]}</h3>
          <p className="text-xs text-[#10A37F] font-bold uppercase tracking-wider mb-1">{profile.role}</p>
          <div className="flex items-center justify-center gap-1 text-[#6C757D]">
             <Briefcase className="w-3 h-3" />
             <span className="text-[10px]">{profile.bio ? profile.bio.substring(0, 30) + '...' : 'Professional user'}</span>
          </div>
        </div>

        <div className="w-full pt-4 grid grid-cols-2 gap-2">
           {renderConnectionButton()}
           {isFollowing ? (
             <button 
                onClick={onUnfollow}
                className="w-full py-2 bg-[#F8F9FA] text-[#0A2F6F] text-xs font-bold rounded-xl border border-[#E9ECEF] hover:bg-[#FFE8E8] hover:text-red-600 hover:border-red-100 transition-all flex items-center justify-center gap-2"
             >
               Following
             </button>
          ) : (
            <button 
              onClick={onFollow}
              className="w-full py-2 bg-[#10A37F] text-white text-xs font-bold rounded-xl hover:bg-[#10A37F]/90 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Follow
            </button>
          )}
          <button 
            onClick={onViewProfile}
            className="col-span-2 py-2 bg-white text-[#6C757D] text-xs font-bold rounded-xl border border-[#E9ECEF] hover:bg-[#F8F9FA] transition-all"
          >
            View Profile
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
