import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Image as ImageIcon } from 'lucide-react';

export default function WriteBlog() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied</div>;
  }

  const handleSubmit = async (e: React.FormEvent, published = true) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'blogs'), {
        title,
        content,
        authorId: user?.uid,
        imageUrl: imageUrl || null,
        published,
        createdAt: serverTimestamp(),
        tags: []
      });
      navigate('/admin');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'blogs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="p-2 bg-white rounded-xl shadow-sm hover:scale-105 transition-transform">
          <ArrowLeft className="w-5 h-5 text-[#0A2F6F]" />
        </button>
        <h1 className="text-2xl font-bold text-[#0A2F6F]">Write a Blog Post</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-[#E9ECEF]">
        <form className="space-y-6" onSubmit={(e) => handleSubmit(e, true)}>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#0A2F6F]">Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Post Title..."
              className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#10A37F]/20 text-lg font-bold text-[#0A2F6F] outline-none placeholder:text-[#6C757D]/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#0A2F6F]">Cover Image URL</label>
            <div className="relative">
              <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C757D]" />
              <input 
                type="url" 
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full pl-12 pr-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#10A37F]/20 outline-none placeholder:text-[#6C757D]/50"
              />
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="Cover Preview" className="mt-4 w-full h-48 object-cover rounded-xl" />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#0A2F6F]">Content (Text/Markdown)</label>
            <textarea 
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your article here..."
              className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#10A37F]/20 min-h-[400px] resize-y outline-none font-mono text-sm leading-relaxed"
            />
          </div>

          <div className="pt-6 flex items-center justify-end gap-4 border-t border-[#F8F9FA]">
            <button 
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, false)}
              className="px-6 py-3 bg-[#F8F9FA] text-[#6C757D] font-bold rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-[#0A2F6F] text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {isSubmitting ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
