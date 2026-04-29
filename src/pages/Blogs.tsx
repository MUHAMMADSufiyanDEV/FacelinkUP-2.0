import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../components/AuthProvider';
import { Blog } from '../types';
import { Calendar, ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Blogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'blogs'), 
      where('published', '==', true), 
      limit(20) // For simplicity sorting by published is missing index for now, so fetching directly. To order by desc, a composite index would be needed. 
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Sort in memory to avoid missing index error
      const fetchedBlogs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Blog));
      fetchedBlogs.sort((a, b) => {
         const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
         const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
         return tB - tA;
      });
      setBlogs(fetchedBlogs);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'blogs');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-[#0A2F6F] rounded-3xl p-8 lg:p-12 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter">Insights & Updates</h1>
          <p className="text-blue-100 text-lg">Read the latest articles from the UpLink platform.</p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 blur-2xl">
           <FileText className="w-64 h-64 -mb-10 -mr-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map((n) => (
             <div key={n} className="bg-white rounded-3xl border border-[#E9ECEF] p-5 shadow-sm animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-2xl mb-4" />
                <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded-md w-1/4 mb-4" />
                <div className="h-20 bg-gray-200 rounded-md w-full mb-4" />
             </div>
          ))
        ) : blogs.length > 0 ? (
          blogs.map(blog => (
            <Link key={blog.id} to={`/blogs/${blog.id}`} className="bg-white rounded-3xl border border-[#E9ECEF] p-4 shadow-sm hover:shadow-xl hover:border-[#10A37F]/50 transition-all group flex flex-col h-full">
              {blog.imageUrl ? (
                <img src={blog.imageUrl} className="w-full h-48 object-cover rounded-2xl mb-4" alt={blog.title} />
              ) : (
                <div className="w-full h-48 bg-[#F8F9FA] rounded-2xl mb-4 flex items-center justify-center border border-gray-100">
                  <FileText className="w-12 h-12 text-[#E9ECEF]" />
                </div>
              )}
              <div className="flex flex-col flex-1">
                <h3 className="text-xl font-bold text-[#0A2F6F] group-hover:text-[#10A37F] transition-colors mb-2 line-clamp-2">{blog.title}</h3>
                <p className="text-[#6C757D] text-sm line-clamp-3 mb-4 flex-1">{blog.content}</p>
                
                <div className="mt-auto pt-4 border-t border-[#F8F9FA] flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs text-[#6C757D] font-medium">
                     <Calendar className="w-3.5 h-3.5" />
                     {blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString() : 'Recent'}
                  </div>
                  <span className="text-sm font-bold text-[#10A37F] flex items-center">
                    Read <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
             <FileText className="w-12 h-12 mx-auto text-[#6C757D] opacity-20 mb-4" />
             <p className="text-[#6C757D]">No articles published yet. Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
}
