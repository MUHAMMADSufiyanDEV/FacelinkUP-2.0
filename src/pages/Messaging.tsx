import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc,
  serverTimestamp, 
  doc, 
  getDoc,
  getDocs,
  limit,
  or,
  and
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from '../components/AuthProvider';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Image as ImageIcon,
  Paperclip,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Loader2, Phone, Video as VideoIcon } from 'lucide-react';
import { useCall } from '../components/CallProvider';

import { sendEmailNotification } from '../lib/notifications';

export default function Messaging() {
  const { profile, user: authUser, isAdmin } = useAuth();
  const { initiateCall } = useCall();
  const location = useLocation();
  const contactIdFromState = location.state?.contactId;
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch active chats instead of just random users
  useEffect(() => {
    if (!profile) return;
    
    // Query chats where user is a participant
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', profile.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Map chats to the other participant's user profile
      const contactPromises = chatsData.map(async (chat: any) => {
        const otherId = chat.participants.find((p: string) => p !== profile.uid);
        if (!otherId) return null;
        
        const userDoc = await getDoc(doc(db, 'users', otherId));
        if (userDoc.exists()) {
          return {
            ...userDoc.data(),
            id: userDoc.id,
            lastMessage: chat.lastMessage,
            chatId: chat.id
          };
        }
        return null;
      });

      const loadedContacts = (await Promise.all(contactPromises)).filter(c => c !== null);
      setContacts(loadedContacts);
      
      if (contactIdFromState) {
        const target = loadedContacts.find(c => c.id === contactIdFromState);
        if (target) {
          setSelectedContact(target);
          setIsMobileListOpen(false);
        } else {
          // If contact not found in existing chats, fetch they profile to initiate new chat
          try {
            const userDoc = await getDoc(doc(db, 'users', contactIdFromState));
            if (userDoc.exists()) {
              setSelectedContact({ ...userDoc.data(), id: userDoc.id });
              setIsMobileListOpen(false);
            }
          } catch (error) {
            console.error("Error fetching new contact profile:", error);
          }
        }
      } else if (!selectedContact && loadedContacts.length > 0) {
        setSelectedContact(loadedContacts[0]);
      }
    }, (error) => {
      console.error("Error fetching chats:", error);
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [profile, contactIdFromState]);

  // Fetch messages for selected contact
  useEffect(() => {
    if (!profile || !selectedContact) return;

    const chatId = [profile.uid, selectedContact.id].sort().join('_');
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    });

    return () => unsub();
  }, [profile, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, attachment?: { url: string, type: string }) => {
    if (e) e.preventDefault();
    if (!msgInput.trim() && !attachment && !profile || !selectedContact || isSending) return;

    setIsSending(true);
    const chatId = [profile!.uid, selectedContact.id].sort().join('_');
    
    try {
      const messageText = attachment ? (msgInput.trim() || `Sent an ${attachment.type}`) : msgInput;

      // Update parent chat document
      await setDoc(doc(db, 'chats', chatId), {
        participants: [profile!.uid, selectedContact.id],
        lastMessage: messageText,
        updatedAt: serverTimestamp(),
        [`participantNames.${profile!.uid}`]: profile!.displayName,
        [`participantNames.${selectedContact.id}`]: selectedContact.displayName
      }, { merge: true });

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: profile!.uid,
        text: messageText,
        attachment: attachment || null,
        createdAt: serverTimestamp()
      });

      // Trigger Notification
      await addDoc(collection(db, 'notifications'), {
        userId: selectedContact.id,
        type: 'message',
        title: 'New Message',
        message: `${profile!.displayName} sent you a message: "${messageText.substring(0, 30)}..."`,
        link: '/messages',
        read: false,
        createdAt: serverTimestamp()
      });

      // Send Email Notification
      if (selectedContact.email) {
        await sendEmailNotification(
          selectedContact.email,
          `New message from ${profile.displayName} on FaceLinkUp`,
          `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e9ecef; rounded-xl: 12px;">
              <h2 style="color: #0A2F6F;">New Message Notification</h2>
              <p>Hi ${selectedContact.displayName},</p>
              <p><strong>${profile.displayName}</strong> has sent you a new message:</p>
              <blockquote style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #0A2F6F;">
                ${msgInput}
              </blockquote>
              <p style="margin-top: 20px;">
                <a href="${window.location.origin}/messages" style="background: #0A2F6F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Message</a>
              </p>
            </div>
          `
        );
      }

      setMsgInput('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] bg-white rounded-3xl border border-[#E9ECEF] shadow-sm overflow-hidden flex">
      {/* Contacts List */}
      <div className={cn(
        "w-full md:w-80 border-r border-[#E9ECEF] flex flex-col shrink-0 transition-all",
        !isMobileListOpen && "hidden md:flex"
      )}>
        <div className="p-6 border-b border-[#E9ECEF]">
          <h2 className="text-xl font-bold text-[#0A2F6F] mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C757D]" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full pl-10 pr-4 py-2 bg-[#F8F9FA] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0A2F6F]/10 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8F9FA]/50">
          {contacts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-xs text-gray-400">No other professionals found yet.</p>
            </div>
          ) : contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => {
                setSelectedContact(contact);
                setIsMobileListOpen(false);
              }}
              className={cn(
                "w-full p-4 flex items-center gap-3 transition-all border-b border-[#F8F9FA] hover:bg-white/80 group relative",
                selectedContact?.id === contact.id && "bg-white shadow-sm z-10"
              )}
            >
              {selectedContact?.id === contact.id && (
                <motion.div 
                  layoutId="active-chat"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-[#0A2F6F] rounded-r-full"
                />
              )}
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-[#0A2F6F]/10 overflow-hidden ring-4 ring-[#F8F9FA] group-hover:ring-white transition-all">
                  <img src={contact.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.displayName}`} alt={contact.displayName} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#10A37F] border-2 border-white rounded-full shadow-sm"></div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h4 className={cn("text-sm font-bold truncate transition-colors", "text-[#2D3436] group-hover:text-[#0A2F6F]")}>
                    {contact.displayName}
                  </h4>
                </div>
                <p className="text-[11px] text-[#6C757D] truncate opacity-80">
                  {contact.lastMessage || contact.role}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-[#F8F9FA]/30",
        isMobileListOpen && "hidden md:flex"
      )}>
        {/* Chat Header */}
        {selectedContact ? (
          <>
        <div className="p-4 bg-white border-b border-[#E9ECEF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileListOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600"
            >
               <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-[#0A2F6F]/10 overflow-hidden">
                <img src={selectedContact.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedContact.displayName}`} alt={selectedContact.displayName} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#2D3436]">{selectedContact.displayName}</h4>
              <p className="text-[10px] text-[#10A37F] font-bold uppercase tracking-widest">
                Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => initiateCall(selectedContact.id, selectedContact.displayName, 'voice')}
                className="p-2.5 text-[#6C757D] hover:text-[#0A2F6F] hover:bg-gray-50 rounded-xl transition-all"
             >
                <Phone className="w-5 h-5" />
             </button>
             <button 
                onClick={() => initiateCall(selectedContact.id, selectedContact.displayName, 'video')}
                className="p-2.5 text-[#10A37F] hover:bg-[#10A37F]/5 rounded-xl transition-all"
             >
                <VideoIcon className="w-5 h-5" />
             </button>
             <ChatAction icon={<MoreVertical className="w-5 h-5" />} />
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white/40">
          {messages.map((msg) => (
            <div key={msg.id} className={cn(
              "flex flex-col max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.senderId === profile?.uid ? "ml-auto items-end" : "mr-auto items-start"
            )}>
              <div className={cn(
                "p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm transition-all hover:shadow-md",
                msg.senderId === profile?.uid 
                  ? "bg-[#0A2F6F] text-white rounded-tr-none shadow-[#0A2F6F]/10" 
                  : "bg-white text-[#2D3436] rounded-tl-none border border-[#E9ECEF]"
              )}>
                {msg.attachment && (
                  <div className="mb-3 rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-black/5">
                    {msg.attachment.type === 'video' ? (
                      <video src={msg.attachment.url} controls className="max-w-full max-h-60 rounded-xl" />
                    ) : (
                      <a href={msg.attachment.url} target="_blank" rel="noreferrer">
                        <img src={msg.attachment.url} alt="Attachment" className="max-w-full max-h-80 object-contain rounded-xl hover:scale-[1.02] transition-transform" />
                      </a>
                    )}
                  </div>
                )}
                {msg.text}
              </div>
              <div className="flex items-center gap-1.5 mt-2 opacity-60">
                <span className="text-[10px] text-[#6C757D] font-medium">
                  {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                </span>
                {msg.senderId === profile?.uid && <div className="w-1 h-1 rounded-full bg-[#10A37F]"></div>}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-6 bg-white border-t border-[#E9ECEF] shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-[#F8F9FA] p-2 rounded-2xl pl-4">
             <input 
               type="file"
               ref={chatFileInputRef}
               className="hidden"
               accept="image/*,video/*"
               onChange={async (e) => {
                 const file = e.target.files?.[0];
                 if (!file) return;
                 setIsUploading(true);
                 try {
                   const { url, resource_type } = await uploadToCloudinary(file);
                   await handleSendMessage(undefined, { url, type: resource_type });
                 } catch (err) {
                   console.error("Chat upload failed:", err);
                   alert("Upload failed.");
                 } finally {
                   setIsUploading(false);
                 }
               }}
             />
             <button 
              type="button" 
              onClick={() => chatFileInputRef.current?.click()}
              disabled={isUploading}
              className="text-[#6C757D] hover:text-[#0A2F6F] transition-colors disabled:opacity-50"
             >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
             </button>
             <button 
              type="button" 
              onClick={() => chatFileInputRef.current?.click()}
              className="text-[#6C757D] hover:text-[#0A2F6F] transition-colors"
             >
                <ImageIcon className="w-5 h-5" />
             </button>
             <input 
              type="text" 
              placeholder={authUser?.emailVerified || isAdmin ? "Type a message..." : "Verify email to message..."}
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              disabled={!isAdmin && !authUser?.emailVerified}
              className="flex-1 bg-transparent border-none outline-none text-sm py-2 disabled:cursor-not-allowed"
             />
             <button 
              type="submit"
              disabled={!msgInput.trim() || isSending || (!isAdmin && !authUser?.emailVerified)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                msgInput.trim() && (isAdmin || authUser?.emailVerified) ? "bg-[#0A2F6F] text-white shadow-lg shadow-[#0A2F6F]/20" : "bg-[#DEE2E6] text-[#6C757D]"
              )}
             >
                <Send className="w-5 h-5" />
             </button>
          </form>
        </div>
        </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-20 h-20 bg-[#0A2F6F]/5 rounded-full flex items-center justify-center text-[#0A2F6F]">
              <MessageSquare className="w-10 h-10 opacity-20" />
            </div>
            <div>
              <h3 className="font-bold text-[#0A2F6F]">Your Inbox</h3>
              <p className="text-sm text-[#6C757D] max-w-[200px]">Select a contact to start a professional conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatAction({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="p-2 hover:bg-[#F8F9FA] rounded-xl text-[#6C757D] hover:text-[#0A2F6F] transition-all">
      {icon}
    </button>
  );
}
