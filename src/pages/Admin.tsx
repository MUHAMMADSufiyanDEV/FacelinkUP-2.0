import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, limit, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from '../components/AuthProvider';
import { UserProfile, Blog } from '../types';
import { ShieldAlert, Users, FileText, ChevronRight, Activity, Calendar, Trash2, Edit2, X, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'blogs'>('users');
  const [isLoading, setIsLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('user');

  // If not admin, redirect or show error
  useEffect(() => {
    if (user && !isAdmin) {
       navigate('/dashboard');
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    // Fetch users
    const usersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Fetch blogs
    const blogsQ = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeBlogs = onSnapshot(blogsQ, (snapshot) => {
      setBlogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Blog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'blogs');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeBlogs();
    };
  }, [isAdmin]);

  const handleUpdateRole = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setEditingUserId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user's profile? This action will remove their data from the database.")) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      }
    }
  };

  if (!isAdmin) {
     return <div className="p-8 text-center"><ShieldAlert className="w-12 h-12 mx-auto text-red-500 mb-4" /><h1 className="text-2xl font-bold">Access Denied</h1></div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0A2F6F] mb-1 tracking-tight">Admin Dashboard</h1>
          <p className="text-[#6C757D] text-sm">Manage platform users, content, and settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => setActiveTab('users')}
          className={`p-6 rounded-3xl border cursor-pointer transition-all ${activeTab === 'users' ? 'bg-[#0A2F6F] text-white border-[#0A2F6F]' : 'bg-white border-[#E9ECEF] hover:border-[#0A2F6F]'}`}
        >
          <Users className={`w-8 h-8 mb-4 ${activeTab === 'users' ? 'text-white' : 'text-[#0A2F6F]'}`} />
          <h3 className="text-xl font-bold">Total Users</h3>
          <p className="text-3xl font-black mt-2">{users.length}</p>
        </div>
        <div 
          onClick={() => setActiveTab('blogs')}
          className={`p-6 rounded-3xl border cursor-pointer transition-all ${activeTab === 'blogs' ? 'bg-[#0A2F6F] text-white border-[#0A2F6F]' : 'bg-white border-[#E9ECEF] hover:border-[#0A2F6F]'}`}
        >
          <FileText className={`w-8 h-8 mb-4 ${activeTab === 'blogs' ? 'text-white' : 'text-[#0A2F6F]'}`} />
          <h3 className="text-xl font-bold">Total Blogs</h3>
          <p className="text-3xl font-black mt-2">{blogs.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#0A2F6F]">
             {activeTab === 'users' ? 'Recently Registered Users' : 'Platform Blogs'}
          </h2>
          {activeTab === 'blogs' && (
             <Link to="/write-blog" className="px-4 py-2 bg-[#10A37F] text-white text-sm font-bold rounded-lg shrink-0">
               Write Blog
             </Link>
          )}
        </div>

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E9ECEF]">
                  <th className="pb-3 pt-2 px-2 text-sm text-[#6C757D] font-medium">User</th>
                  <th className="pb-3 pt-2 px-2 text-sm text-[#6C757D] font-medium">Role</th>
                  <th className="pb-3 pt-2 px-2 text-sm text-[#6C757D] font-medium text-right">Joined</th>
                  <th className="pb-3 pt-2 px-2 text-sm text-[#6C757D] font-medium text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid} className="border-b border-[#E9ECEF] last:border-0 hover:bg-[#F8F9FA]">
                    <td className="py-3 px-2">
                       <div className="flex items-center gap-3">
                         <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-8 h-8 rounded-full border border-gray-200" alt="" />
                         <div>
                            <p className="font-bold text-[#0A2F6F] text-sm">{u.displayName}</p>
                            <p className="text-xs text-[#6C757D]">{u.email}</p>
                         </div>
                       </div>
                    </td>
                    <td className="py-3 px-2">
                       {editingUserId === u.uid ? (
                         <div className="flex items-center gap-2">
                            <select 
                              value={newRole} 
                              onChange={(e) => setNewRole(e.target.value)}
                              className="text-xs border rounded px-1 py-0.5"
                            >
                              <option value="user">User</option>
                              <option value="freelancer">Freelancer</option>
                              <option value="recruiter">Recruiter</option>
                            </select>
                            <button onClick={() => handleUpdateRole(u.uid)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check className="w-3 h-3" /></button>
                            <button onClick={() => setEditingUserId(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-3 h-3" /></button>
                         </div>
                       ) : (
                         <div className="flex items-center gap-2 group">
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F8F9FA] text-[#0A2F6F] capitalize">
                             {u.role}
                           </span>
                           {u.uid !== user?.uid && (
                             <button 
                               onClick={() => { setEditingUserId(u.uid); setNewRole(u.role || 'user'); }}
                               className="opacity-0 group-hover:opacity-100 text-[#6C757D] hover:text-[#0A2F6F] transition-opacity"
                             >
                               <Edit2 className="w-3 h-3" />
                             </button>
                           )}
                         </div>
                       )}
                    </td>
                    <td className="py-3 px-2 text-right">
                       <p className="text-xs text-[#6C757D]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}
                       </p>
                    </td>
                    <td className="py-3 px-2 text-right">
                       {u.uid !== user?.uid && (
                         <button 
                           onClick={() => handleDeleteUser(u.uid)}
                           className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                           title="Delete User"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'blogs' && (
           <div className="space-y-4">
              {blogs.length === 0 ? (
                <p className="text-[#6C757D] text-sm">No blogs published yet.</p>
              ) : (
                blogs.map(blog => (
                  <div key={blog.id} className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-2xl border border-transparent hover:border-[#10A37F] transition-all group">
                     <Link to={`/blogs/${blog.id}`} className="flex-1">
                       <h4 className="font-bold text-[#0A2F6F] line-clamp-1">{blog.title}</h4>
                       <p className="text-xs text-[#6C757D] mt-1 flex items-center gap-1">
                         <Calendar className="w-3 h-3" />
                         {blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString() : 'Draft'}
                         <span className="mx-2">•</span>
                         <span className={blog.published ? 'text-[#10A37F]' : 'text-amber-500'}>
                           {blog.published ? 'Published' : 'Draft'}
                         </span>
                       </p>
                     </Link>
                     <div className="flex flex-col sm:flex-row items-center gap-2">
                       <button
                         onClick={async (e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           if (window.confirm("Are you sure you want to delete this blog?")) {
                             try {
                               await deleteDoc(doc(db, 'blogs', blog.id));
                             } catch (error) {
                               handleFirestoreError(error, OperationType.DELETE, `blogs/${blog.id}`);
                             }
                           }
                         }}
                         className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                         title="Delete Blog"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                       <ChevronRight className="w-5 h-5 text-[#6C757D] group-hover:text-[#10A37F]" />
                     </div>
                  </div>
                ))
              )}
           </div>
        )}
      </div>
    </div>
  );
}
