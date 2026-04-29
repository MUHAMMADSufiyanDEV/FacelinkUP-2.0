import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Briefcase, 
  MessageSquare, 
  Bell, 
  User, 
  Search, 
  PlusCircle, 
  Menu, 
  X,
  LogOut,
  Users,
  Check,
  ShoppingBag,
  FileText
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { AlertTriangle, RefreshCw, Send } from 'lucide-react';

import Logo from './Logo';

const navItems = [
  { icon: Home, label: 'Feed', path: '/dashboard' },
  { icon: Briefcase, label: 'Marketplace', path: '/marketplace' },
  { icon: ShoppingBag, label: 'Gigs', path: '/gigs' },
  { icon: Users, label: 'Network', path: '/network' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { signOut, profile, user, isAdmin, refreshUser, resendVerification } = useAuth();
  const location = useLocation();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerification();
      alert("Verification email sent!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });

    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const currentNavItems = [
    ...navItems,
    { icon: FileText, label: 'Blogs', path: '/blogs' },
    ...(isAdmin ? [{ icon: Users, label: 'Admin', path: '/admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex flex-col h-full">
          <Link to="/dashboard" className="flex items-center gap-2 mb-10 group">
            <Logo size="md" className="group-hover:scale-105 transition-transform" />
            <h1 className="text-2xl font-black tracking-tighter text-[#0A2F6F] ml-1">LINK</h1>
          </Link>

          <nav className="flex-1 px-2 space-y-1">
            {currentNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                  location.pathname === item.path 
                    ? "bg-gray-50 text-[#0A2F6F]" 
                    : "text-[#6C757D] hover:bg-gray-50 hover:text-[#0A2F6F]"
                )}
              >
                <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-[#0A2F6F]" : "text-[#6C757D]")} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100 mt-auto">
            <div className="p-4 bg-[#0A2F6F] rounded-xl text-white text-center">
              <p className="text-[10px] opacity-80 mb-2 uppercase tracking-widest font-bold">Pro Account</p>
              <p className="text-xs font-semibold mb-3">Maximize your reach</p>
              <button className="w-full bg-[#10A37F] py-2 rounded-lg text-[10px] font-bold shadow-lg shadow-[#10A37F]/20">Go Premium</button>
            </div>
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2 w-full mt-4 rounded-lg text-[#DC3545] hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex-1 max-w-xl flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full hidden md:block">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="w-5 h-5" />
              </span>
              <input 
                type="text" 
                placeholder="Search jobs, people, posts..." 
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#0A2F6F] text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-8">
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  if (!isNotifOpen && unreadCount > 0) markAllAsRead();
                }}
                className="p-2 text-[#6C757D] relative hover:bg-gray-50 rounded-full transition-colors"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-[#0A2F6F] text-sm">Notifications</h3>
                        <button onClick={markAllAsRead} className="text-[10px] text-[#10A37F] font-bold uppercase hover:underline">Mark all read</button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-10 text-center">
                            <p className="text-xs text-gray-400 italic">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <Link 
                              key={n.id} 
                              to={n.link} 
                              onClick={() => {
                                markAsRead(n.id);
                                setIsNotifOpen(false);
                              }}
                              className={cn(
                                "p-4 flex gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors relative",
                                !n.read && "bg-blue-50/30"
                              )}
                            >
                              {!n.read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#0A2F6F] rounded-full" />}
                              <div className="w-8 h-8 rounded-lg bg-[#0A2F6F]/10 flex items-center justify-center shrink-0">
                                {n.type === 'like' && <Home className="w-4 h-4 text-[#DC3545]" />}
                                {n.type === 'comment' && <MessageSquare className="w-4 h-4 text-[#0A2F6F]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#2D3436] truncate">{n.title}</p>
                                <p className="text-[11px] text-[#6C757D] line-clamp-2 mt-0.5">{n.message}</p>
                                <p className="text-[9px] text-gray-400 mt-1">{n.createdAt ? formatDistanceToNow(new Date(n.createdAt.seconds * 1000), { addSuffix: true }) : 'Just now'}</p>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-[#2D3436] group-hover:text-[#0A2F6F] transition-colors line-clamp-1">{profile?.displayName}</p>
                  <p className="text-[10px] text-[#10A37F] font-bold uppercase tracking-widest">{profile?.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#0A2F6F] border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    profile?.displayName?.charAt(0) || 'U'
                  )}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar relative">
          {user && !user.emailVerified && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Email Verification Required</h4>
                  <p className="text-xs text-amber-700">Please verify your email to post, apply for jobs, or message other users.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleResend}
                  disabled={isResending}
                  className="px-4 py-2 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  {isResending ? 'Sending...' : 'Resend Email'}
                </button>
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-4 py-2 border border-amber-300 text-amber-700 text-[10px] font-bold rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
                  Refresh Status
                </button>
              </div>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
