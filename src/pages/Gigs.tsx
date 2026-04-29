import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from '../components/AuthProvider';
import { Gig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  X, 
  Star, 
  Clock, 
  Tag, 
  Filter,
  MessageSquare,
  DollarSign,
  ChevronRight,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Gigs() {
  const { profile, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  
  const [newGig, setNewGig] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Design',
    deliveryDays: '3'
  });

  const categories = ['All', 'My Gigs', 'Design', 'Development', 'Marketing', 'Writing', 'Video', 'Music', 'Business'];

  useEffect(() => {
    const q = query(collection(db, 'gigs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGigs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gig)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gigs');
    });
    return () => unsubscribe();
  }, []);

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (profile.role !== 'freelancer' && !isAdmin)) return;

    try {
      await addDoc(collection(db, 'gigs'), {
        freelancerId: profile.uid,
        freelancerName: profile.displayName || profile.email.split('@')[0],
        freelancerPhoto: profile.photoURL || null,
        title: newGig.title,
        description: newGig.description,
        price: parseFloat(newGig.price),
        category: newGig.category,
        deliveryDays: parseInt(newGig.deliveryDays),
        rating: 5.0,
        reviewsCount: 0,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewGig({ title: '', description: '', price: '', category: 'Design', deliveryDays: '3' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'gigs');
    }
  };

  const startConversation = async (freelancerId: string) => {
    if (!user) return;
    if (user.uid === freelancerId) return;

    const chatId = [user.uid, freelancerId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        participants: [user.uid, freelancerId],
        updatedAt: serverTimestamp(),
      });
    }
    navigate('/messages', { state: { contactId: freelancerId } });
  };

  const handleDeleteGig = async (gigId: string) => {
    if (!profile) return;
    if (window.confirm('Are you sure you want to delete this gig? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'gigs', gigId));
        setSelectedGig(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `gigs/${gigId}`);
      }
    }
  };

  const filteredGigs = gigs.filter(gig => {
    const matchesSearch = gig.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         gig.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCategory === 'My Gigs') {
      return matchesSearch && gig.freelancerId === user?.uid;
    }
    
    const matchesCategory = selectedCategory === 'All' || gig.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0A2F6F] mb-1 tracking-tight">Service Gigs</h1>
          <p className="text-[#6C757D] text-sm">Browse professional services offered by our network of freelancers.</p>
        </div>
        {(profile?.role === 'freelancer' || isAdmin) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={!isAdmin && !user?.emailVerified}
            className="flex items-center gap-2 px-6 py-3 bg-[#10A37F] text-white font-bold rounded-2xl hover:scale-105 transition-all shadow-lg shadow-[#10A37F]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Post a Gig
          </button>
        )}
      </div>

      {/* Categories Scroller */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border",
              selectedCategory === cat 
                ? "bg-[#0A2F6F] text-white border-[#0A2F6F] shadow-md shadow-[#0A2F6F]/20" 
                : "bg-white text-[#6C757D] border-[#E9ECEF] hover:bg-gray-50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C757D]" />
        <input 
          type="text" 
          placeholder="What service are you looking for today?" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-[#E9ECEF] rounded-2xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none shadow-sm"
        />
      </div>

      {/* Gigs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatePresence>
          {filteredGigs.length > 0 ? (
            filteredGigs.map((gig) => (
              <GigCard 
                key={gig.id} 
                gig={gig} 
                onClick={() => setSelectedGig(gig)} 
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-[#6C757D] bg-white rounded-3xl border border-dashed border-gray-200">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No gigs found match your criteria.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Post Gig Modal */}
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
                <h2 className="text-2xl font-bold text-[#0A2F6F]">Create a Searchable Gig</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#F8F9FA] rounded-full">
                  <X className="w-6 h-6 text-[#6C757D]" />
                </button>
              </div>

              <form onSubmit={handleCreateGig} className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Gig Title</label>
                  <input 
                    required
                    maxLength={100}
                    value={newGig.title}
                    onChange={(e) => setNewGig({...newGig, title: e.target.value})}
                    placeholder="e.g. I will design a modern logo for your brand" 
                    className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Description</label>
                  <textarea 
                    required
                    value={newGig.description}
                    onChange={(e) => setNewGig({...newGig, description: e.target.value})}
                    placeholder="Describe your service in detail..." 
                    className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none h-32 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Starting Price ($)</label>
                    <input 
                      required
                      type="number"
                      min="5"
                      value={newGig.price}
                      onChange={(e) => setNewGig({...newGig, price: e.target.value})}
                      placeholder="e.g. 50" 
                      className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Delivery Time (Days)</label>
                    <input 
                      required
                      type="number"
                      min="1"
                      value={newGig.deliveryDays}
                      onChange={(e) => setNewGig({...newGig, deliveryDays: e.target.value})}
                      placeholder="e.g. 3" 
                      className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-[#0A2F6F] mb-2 block">Category</label>
                  <select 
                    value={newGig.category}
                    onChange={(e) => setNewGig({...newGig, category: e.target.value})}
                    className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
                  >
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
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
                    Publish Gig
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gig Details Modal */}
      <AnimatePresence>
        {selectedGig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGig(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl p-0 shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Product Info */}
              <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[80vh] md:max-h-full">
                <div className="flex justify-between items-start">
                   <span className="px-2 py-1 bg-blue-50 text-[#0A2F6F] text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">
                    {selectedGig.category}
                  </span>
                  <button onClick={() => setSelectedGig(null)} className="p-2 hover:bg-[#F8F9FA] rounded-full translate-x-2 -translate-y-2">
                    <X className="w-6 h-6 text-[#6C757D]" />
                  </button>
                </div>
                
                <h2 className="text-2xl font-bold text-[#0A2F6F] leading-tight">{selectedGig.title}</h2>
                
                <div className="flex items-center gap-4 py-4 border-y border-gray-50">
                   <div className="flex items-center gap-1.5">
                     <Star className="w-4 h-4 text-amber-400 fill-current" />
                     <span className="text-sm font-bold text-[#0A2F6F]">{selectedGig.rating || '5.0'}</span>
                     <span className="text-xs text-[#6C757D]">({selectedGig.reviewsCount || 0})</span>
                   </div>
                   <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                   <div className="flex items-center gap-1.5">
                     <Clock className="w-4 h-4 text-[#6C757D]" />
                     <span className="text-sm text-[#6C757D]">{selectedGig.deliveryDays} Days Delivery</span>
                   </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#0A2F6F] uppercase tracking-wider">Gig Description</h3>
                  <p className="text-[#2D3436] text-sm leading-loose whitespace-pre-wrap">
                    {selectedGig.description}
                  </p>
                </div>
              </div>

              {/* Sidebar / Checkout */}
              <div className="w-full md:w-72 bg-[#F8F9FA] p-8 space-y-6 flex flex-col">
                <div className="text-center">
                  <p className="text-xs text-[#6C757D] font-bold uppercase mb-1">Starting At</p>
                  <p className="text-4xl font-extrabold text-[#0A2F6F]">${selectedGig.price}</p>
                </div>

                <div className="pt-6 border-t border-gray-200 flex flex-col gap-3">
                  <button 
                    disabled={!user?.emailVerified || user?.uid === selectedGig.freelancerId}
                    className="w-full py-4 bg-[#10A37F] text-white font-bold rounded-2xl hover:bg-[#10A37F]/90 transition-all shadow-lg shadow-[#10A37F]/20 disabled:opacity-50"
                  >
                    Continue to Order
                  </button>
                  <button 
                    onClick={() => startConversation(selectedGig.freelancerId)}
                    disabled={!user?.emailVerified || user?.uid === selectedGig.freelancerId}
                    className="w-full py-4 bg-white border border-[#E9ECEF] text-[#0A2F6F] font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Contact Seller
                  </button>
                  {user?.uid === selectedGig.freelancerId && (
                    <button 
                      onClick={() => handleDeleteGig(selectedGig.id)}
                      className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      Delete Gig
                    </button>
                  )}
                </div>

                <div className="mt-auto pt-6 flex items-center gap-3">
                  <img 
                    src={selectedGig.freelancerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedGig.freelancerName}`} 
                    className="w-10 h-10 rounded-full border border-white shadow-sm"
                    alt="" 
                  />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-0.5">Freelancer</p>
                    <p className="text-xs font-bold text-[#0A2F6F] leading-none mb-1">{selectedGig.freelancerName}</p>
                    <div className="flex items-center gap-1">
                       <Star className="w-2.5 h-2.5 text-amber-400 fill-current" />
                       <span className="text-[10px] font-bold text-[#0A2F6F]">5.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GigCard({ gig, onClick }: { gig: Gig; onClick: () => void; key?: React.Key }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="bg-white rounded-3xl border border-[#E9ECEF] overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-[#0A2F6F]/5 transition-all duration-300 flex flex-col"
    >
      <div className="aspect-[4/3] bg-[#F8F9FA] relative overflow-hidden">
        <img 
           src={gig.images?.[0] || `https://images.unsplash.com/photo-1542744094-3a56aabd37a3?q=80&w=800&auto=format&fit=crop`} 
           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
           alt="" 
        />
        <div className="absolute top-4 left-4">
           <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[#0A2F6F] text-[9px] font-black rounded-lg uppercase tracking-tight shadow-sm">
            {gig.category}
          </span>
        </div>
      </div>
      
      <div className="p-5 space-y-3 flex flex-col flex-1">
        <div className="flex items-center gap-2">
          <img 
             src={gig.freelancerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${gig.freelancerName}`} 
             className="w-5 h-5 rounded-full border border-gray-100"
             alt="" 
          />
          <span className="text-[10px] font-bold text-[#6C757D] truncate">{gig.freelancerName}</span>
        </div>

        <h3 className="text-sm font-bold text-[#0A2F6F] line-clamp-2 leading-snug group-hover:text-[#10A37F] transition-colors">
          {gig.title}
        </h3>

        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span className="text-xs font-bold text-[#0A2F6F]">{gig.rating || '5.0'}</span>
          <span className="text-[10px] text-[#6C757D]">({gig.reviewsCount || 0})</span>
        </div>

        <div className="pt-3 border-t border-[#F8F9FA] flex items-center justify-between mt-auto">
          <p className="text-[10px] text-[#6C757D] font-bold uppercase tracking-tight">Starting At</p>
          <p className="text-base font-black text-[#0A2F6F]">${gig.price}</p>
        </div>
      </div>
    </motion.div>
  );
}
