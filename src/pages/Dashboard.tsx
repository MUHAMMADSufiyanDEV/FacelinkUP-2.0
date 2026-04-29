import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment,
  setDoc,
  deleteDoc,
  getDoc,
  where,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from '../components/AuthProvider';
import { Post as PostType, Gig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Image as ImageIcon, 
  Send,
  MoreHorizontal,
  ArrowUpRight,
  X,
  Edit,
  Trash2,
  FileVideo,
  ShoppingBag,
  Star
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

interface PostCardProps {
  post: PostType;
  onLike: () => void;
  onDelete: (postId: string) => Promise<void>;
  onEdit: (postId: string, newContent: string) => Promise<void>;
  key?: React.Key;
}

export default function Dashboard() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [popularGigs, setPopularGigs] = useState<Gig[]>([]);
  const [isLoadingGigs, setIsLoadingGigs] = useState(true);
  const { profile, user, isAdmin } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as PostType));
      setPosts(postsData);
      setIsLoadingPosts(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'gigs'), orderBy('rating', 'desc'), limit(3));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPopularGigs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gig)));
      setIsLoadingGigs(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please select a file under 5MB.");
      return;
    }

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      
      // If image, attempt to compress if it's potentially too large for Firestore (1MB limit)
      if (!isVideo && result.length > 800000) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max width/height to further reduce size if needed
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress quality
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          if (compressed.length > 1048576) {
            alert("The image is still too large for our database (limit 1MB). Please try a smaller image.");
            setMediaUrl('');
          } else {
            setMediaUrl(compressed);
          }
        };
        img.src = result;
      } else {
        if (result.length > 1048576) {
          alert("The file is too large for our database (limit 1MB). Please try a smaller file.");
          return;
        }
        setMediaUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !profile) return;

    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName || profile.email.split('@')[0],
        authorPhoto: profile.photoURL || null,
        content: newPostContent,
        mediaUrl: mediaUrl || null,
        mediaType: mediaUrl ? mediaType : null,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      });
      setNewPostContent('');
      setMediaUrl('');
      setShowMediaInput(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!profile) return;
    const likeRef = doc(db, 'posts', postId, 'likes', profile.uid);
    try {
      const likeDoc = await getDoc(likeRef);
      if (likeDoc.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', postId), {
          likesCount: increment(-1)
        });
      } else {
        await setDoc(likeRef, { createdAt: serverTimestamp() });
        await updateDoc(doc(db, 'posts', postId), {
          likesCount: increment(1)
        });

        // Trigger Notification
        const postSnap = await getDoc(doc(db, 'posts', postId));
        const postData = postSnap.data() as PostType;
        if (postData.authorId !== profile.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: postData.authorId,
            type: 'like',
            title: 'New Like',
            message: `${profile.displayName || profile.email.split('@')[0]} liked your post`,
            link: '/dashboard',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}/likes`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!profile) {
      console.error("No profile found during delete attempt");
      return;
    }
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      try {
        console.log("Attempting to delete post:", postId);
        await deleteDoc(doc(db, 'posts', postId));
        console.log("Post deleted successfully");
      } catch (error) {
        console.error("Delete operation failed:", error);
        handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
      }
    }
  };

  const handleEditPost = async (postId: string, newContent: string) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        content: newContent
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Feed */}
      <div className="lg:col-span-2 space-y-6">
        {/* Create Post */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex gap-4">
            <Link to={`/profile/${profile?.uid}`} className="w-10 h-10 rounded-full bg-gray-100 shrink-0 overflow-hidden hover:opacity-80 transition-opacity">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#0A2F6F] font-bold bg-[#0A2F6F]/10">
                  {profile?.displayName?.charAt(0)}
                </div>
              )}
            </Link>
            <form onSubmit={handleCreatePost} className="flex-1">
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share a professional update or freelance tip..."
                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-0 resize-none h-20 outline-none"
              />
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*,video/*"
              />

              <AnimatePresence>
                {mediaUrl && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-3 relative">
                      <button 
                        type="button"
                        onClick={() => setMediaUrl('')}
                        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-gray-600 hover:text-red-500 shadow-sm z-10"
                      >
                         <X className="w-4 h-4" />
                      </button>
                      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white max-h-60 flex items-center justify-center">
                        {mediaType === 'image' ? (
                          <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
                        ) : (
                          <video src={mediaUrl} className="w-full h-full" autoPlay muted loop />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setMediaType('image');
                      fileInputRef.current?.click();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-colors text-[#6C757D] hover:text-[#0A2F6F]"
                    )}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setMediaType('video');
                      fileInputRef.current?.click();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-colors text-[#6C757D] hover:text-[#0A2F6F]"
                    )}
                  >
                    <FileVideo className="w-4 h-4" />
                    Video
                  </button>
                </div>
                <button 
                  disabled={isPosting || !newPostContent.trim() || (!isAdmin && !user?.emailVerified)}
                  className="bg-[#0A2F6F] text-white px-5 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#0A2F6F]/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPosting ? 'Post...' : 'Post'}
                </button>
              </div>
            </form>
            {!isAdmin && !user?.emailVerified && (
              <p className="text-[10px] text-amber-600 font-medium mt-2">Verify email to share updates.</p>
            )}
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {isLoadingPosts ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="w-24 h-4 bg-gray-200 rounded-lg mb-2" />
                    <div className="w-16 h-3 bg-gray-200 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="w-full h-4 bg-gray-200 rounded-lg" />
                  <div className="w-5/6 h-4 bg-gray-200 rounded-lg" />
                  <div className="w-4/6 h-4 bg-gray-200 rounded-lg" />
                </div>
                <div className="h-48 w-full bg-gray-200 rounded-xl mb-4" />
                <div className="flex gap-6 mt-4">
                  <div className="w-16 h-4 bg-gray-200 rounded-lg" />
                  <div className="w-20 h-4 bg-gray-200 rounded-lg" />
                </div>
              </div>
            ))
          ) : (
            <AnimatePresence>
              {posts.map((post) => (
                <div key={post.id} className="mb-6">
                  <PostCard 
                    post={post} 
                    onLike={() => handleLike(post.id)} 
                    onDelete={handleDeletePost}
                    onEdit={handleEditPost}
                  />
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Sidebar Suggestions */}
      <div className="hidden lg:block space-y-6 sticky top-6 self-start">
        <div className="bg-[#0A2F6F] rounded-3xl p-6 text-white shadow-xl shadow-[#0A2F6F]/20 relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-2">Unlock FaceLinkUp Pro</h3>
            <p className="text-xs opacity-80 mb-4">Get 5x more profile views and reach top recruiters instantly.</p>
            <button className="px-5 py-2 bg-[#10A37F] text-white text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-[#10A37F]/90 transition-all">Upgrade Now</button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF] shadow-sm">
          <h3 className="font-bold text-[#0A2F6F] mb-4">Trending on FaceLinkUp</h3>
          <div className="space-y-4">
            <TrendingItem hashtag="#FutureOfWork" count="12.4k posts" />
            <TrendingItem hashtag="#FreelanceLife" count="8.1k posts" />
            <TrendingItem hashtag="#TechTalent" count="5.2k posts" />
            <TrendingItem hashtag="#RemoteGigs" count="3.9k posts" />
          </div>
          <button className="w-full mt-6 py-3 bg-[#F8F9FA] text-[#0A2F6F] text-sm font-bold rounded-xl hover:bg-[#E9ECEF] transition-colors">
            See all trends
          </button>
        </div>

        <div className="bg-[#10A37F]/5 rounded-3xl p-6 border border-[#10A37F]/10 shadow-sm">
          <h3 className="font-bold text-[#10A37F] mb-2">New Job Openings</h3>
          <p className="text-xs text-[#6C757D] mb-4">Based on your skills</p>
          <div className="space-y-3">
             <JobPreview title="Senior React Dev" company="TechFlow" />
             <JobPreview title="UI/UX Designer" company="DesignGrid" />
          </div>
          <button className="w-full mt-4 py-2 text-[#10A37F] text-xs font-bold hover:underline">
            Visit Marketplace
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#E9ECEF] shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-[#0A2F6F]">Popular Gigs</h3>
             <Link to="/gigs" className="text-[10px] font-bold text-[#10A37F] hover:underline uppercase">View All</Link>
           </div>
           <div className="space-y-4">
              {isLoadingGigs ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-center animate-pulse">
                      <div className="w-12 h-12 rounded-xl bg-gray-200 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-5/6 bg-gray-200 rounded" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : popularGigs.length > 0 ? (
                popularGigs.map(gig => (
                  <Link key={gig.id} to="/gigs" className="flex gap-3 items-center group">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                       <img src={gig.images?.[0] || 'https://images.unsplash.com/photo-1542744094-3a56aabd37a3?q=80&w=200&auto=format&fit=crop'} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#2D3436] truncate group-hover:text-[#0A2F6F] transition-colors">{gig.title}</h4>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 text-amber-500 fill-current" />
                          <span className="text-[10px] font-bold text-[#0A2F6F]">5.0</span>
                        </div>
                        <span className="text-xs font-bold text-[#10A37F]">${gig.price}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No services listed yet.</p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, onLike, onDelete, onEdit }: PostCardProps) {
  const { profile, user, isAdmin } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const likeRef = doc(db, 'posts', post.id, 'likes', profile.uid);
    const unsubLike = onSnapshot(likeRef, (doc) => setIsLiked(doc.exists()));

    const commentsQ = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'desc'));
    const unsubComments = onSnapshot(commentsQ, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubLike();
      unsubComments();
    };
  }, [post.id, profile]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !profile) return;
    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        authorId: profile.uid,
        authorName: profile.displayName || profile.email.split('@')[0],
        authorPhoto: profile.photoURL || null,
        text: commentText,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: increment(1)
      });

      // Trigger Notification
      if (post.authorId !== profile.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.authorId,
          type: 'comment',
          title: 'New Comment',
          message: `${profile.displayName || profile.email.split('@')[0]} commented on your post: "${commentText.substring(0, 30)}..."`,
          link: '/dashboard',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setCommentText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${post.id}/comments`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + '/dashboard');
    alert('Link copied to clipboard!');
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      await onEdit(post.id, editContent);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
    >
      <div className="p-5">
        {/* Author Info */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.authorId}`} className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#0A2F6F] font-bold italic overflow-hidden hover:opacity-80 transition-opacity">
               <img src={post.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} alt={post.authorName} className="w-full h-full object-cover" />
            </Link>
            <div>
              <Link to={`/profile/${post.authorId}`} className="text-sm font-bold text-[#2D3436] hover:text-[#0A2F6F] transition-colors">
                {post.authorName}
              </Link>
              <span className="text-[10px] text-gray-400 ml-1">• {post.createdAt ? formatDistanceToNow(new Date((post.createdAt as any).seconds * 1000), { addSuffix: true }) : 'Just now'}</span>
              <p className="text-[11px] text-[#6C757D] font-medium leading-tight mt-0.5">Contributor at FaceLinkUp</p>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden"
                  >
                    {profile?.uid === post.authorId ? (
                      <>
                        <button 
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit Post
                        </button>
                        <button 
                          onClick={() => {
                            onDelete(post.id);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Post
                        </button>
                      </>
                    ) : (
                      <button className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">
                        Report Post
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mb-4">
            <textarea 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:ring-1 focus:ring-[#0A2F6F] outline-none h-24 resize-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSaving || !editContent.trim()}
                className="px-4 py-1 bg-[#0A2F6F] text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-[#2D3436] mb-4 whitespace-pre-wrap">
            {post.content}
          </p>
        )}

        {post.mediaUrl && (
          <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
            {post.mediaType === 'video' ? (
               <video src={post.mediaUrl} controls className="w-full h-auto" />
            ) : (
               <img src={post.mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[400px]" onError={(e) => (e.currentTarget.style.display = 'none')} />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-6 pt-4 border-t border-gray-50">
          <button 
            onClick={onLike}
            disabled={!isAdmin && !user?.emailVerified}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isLiked ? "text-[#DC3545]" : "text-[#6C757D] hover:text-[#DC3545]"
            )}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            {post.likesCount || 0} Likes
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-xs text-[#6C757D] font-medium hover:text-[#0A2F6F] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {post.commentsCount || 0} Comments
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-[#6C757D] font-medium ml-auto hover:text-[#10A37F] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 space-y-4 border-t border-gray-50">
                <form onSubmit={handleComment} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0 overflow-hidden">
                    <img src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} alt={profile?.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full bg-gray-50 border border-gray-100 rounded-full py-1.5 px-4 text-xs focus:ring-1 focus:ring-[#0A2F6F] outline-none"
                    />
                    <button 
                      disabled={isSubmittingComment || !commentText.trim() || (!isAdmin && !user?.emailVerified)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0A2F6F] hover:text-[#0A2F6F]/80 disabled:opacity-30"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0 overflow-hidden">
                        <img src={comment.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorId}`} alt={comment.authorName} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[11px] font-bold text-[#2D3436]">{comment.authorName}</p>
                          <p className="text-[9px] text-gray-400">{comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt.seconds * 1000), { addSuffix: true }) : 'Just now'}</p>
                        </div>
                        <p className="text-xs text-[#6C757D] leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TrendingItem({ hashtag, count }: { hashtag: string, count: string }) {
  return (
    <div className="flex items-center justify-between group cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
      <div>
        <h4 className="text-sm font-bold text-[#2D3436] group-hover:text-[#0A2F6F] transition-colors">{hashtag}</h4>
        <p className="text-[10px] text-[#6C757D] font-medium">{count}</p>
      </div>
      <ArrowUpRight className="w-3 h-3 text-[#10A37F] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function JobPreview({ title, company }: { title: string, company: string }) {
  return (
    <div className="p-3 bg-white rounded-2xl border border-transparent hover:border-[#10A37F]/20 hover:shadow-sm transition-all cursor-pointer">
      <h4 className="text-xs font-bold text-[#212529]">{title}</h4>
      <p className="text-[10px] text-[#6C757D]">{company}</p>
    </div>
  );
}
