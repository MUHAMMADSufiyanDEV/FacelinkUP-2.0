import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from '../components/AuthProvider';
import { Blog, UserProfile } from '../types';
import { ArrowLeft, Calendar, User, Trash2 } from 'lucide-react';

export default function BlogDetails() {
  const { blogId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!blogId) return;

    const fetchBlog = async () => {
      try {
        const blogDoc = await getDoc(doc(db, 'blogs', blogId));
        if (blogDoc.exists()) {
          const blogData = { id: blogDoc.id, ...blogDoc.data() } as unknown as Blog;
          setBlog(blogData);
          
          if (blogData.authorId) {
            const authorDoc = await getDoc(doc(db, 'users', blogData.authorId));
            if (authorDoc.exists()) {
               setAuthor(authorDoc.data() as UserProfile);
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `blogs/${blogId}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlog();
  }, [blogId]);

  const handleDelete = async () => {
    if (!blogId || !isAdmin) return;
    if (window.confirm("Are you sure you want to delete this blog?")) {
      try {
        await deleteDoc(doc(db, 'blogs', blogId));
        navigate('/admin');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `blogs/${blogId}`);
      }
    }
  };

  if (isLoading) {
     return <div className="p-8 text-center text-[#6C757D]">Loading article...</div>;
  }

  if (!blog) {
     return <div className="p-8 text-center text-[#6C757D]">Blog not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/blogs')} className="flex items-center gap-2 text-[#0A2F6F] font-bold hover:opacity-80 transition-opacity">
          <ArrowLeft className="w-5 h-5" />
          Back to Blogs
        </button>
        {isAdmin && (
           <button onClick={handleDelete} className="flex items-center gap-2 text-red-500 font-bold px-4 py-2 hover:bg-red-50 rounded-xl transition-colors">
              <Trash2 className="w-4 h-4" /> Delete
           </button>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 lg:p-12 shadow-sm border border-[#E9ECEF] relative overflow-hidden">
        {blog.imageUrl && (
          <div className="mb-8 -mx-6 lg:-mx-12 -mt-6 lg:-mt-12 h-64 md:h-96 relative">
            <img src={blog.imageUrl} className="w-full h-full object-cover" alt={blog.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
               <div className="p-6 lg:p-12 w-full text-white pb-6">
                 <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 text-shadow-sm">{blog.title}</h1>
               </div>
            </div>
          </div>
        )}

        {!blog.imageUrl && (
          <h1 className="text-3xl md:text-5xl font-black text-[#0A2F6F] tracking-tighter mb-6">{blog.title}</h1>
        )}

        <div className="flex flex-wrap items-center gap-6 text-sm text-[#6C757D] font-medium border-b border-[#F8F9FA] pb-6 mb-8">
           <div className="flex items-center gap-2">
             {author?.photoURL ? (
                <img src={author.photoURL} className="w-8 h-8 rounded-full" alt="" />
             ) : (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><User className="w-4 h-4" /></div>
             )}
             <span className="text-[#0A2F6F] font-bold">{author?.displayName || 'Admin'}</span>
           </div>
           
           <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString() : 'Draft'}
           </div>
           
           {!blog.published && (
              <span className="px-2 py-1 text-xs bg-amber-50 text-amber-600 rounded-md">Draft</span>
           )}
        </div>

        <div className="prose prose-lg max-w-none text-[#2D3436] font-serif leading-relaxed whitespace-pre-wrap">
           {blog.content}
        </div>
      </div>
    </div>
  );
}
