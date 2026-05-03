import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from './AuthProvider';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, X, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface CallContextType {
  initiateCall: (receiverId: string, receiverName: string, type: 'voice' | 'video') => Promise<void>;
  activeCall: CallData | null;
  incomingCall: CallData | null;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
}

interface CallData {
  id: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName: string;
  type: 'voice' | 'video';
  status: 'calling' | 'connected' | 'ended';
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    if (!profile) return;

    // Listen for incoming calls
    const path = 'calls';
    const q = query(
      collection(db, path),
      where('receiverId', '==', profile.uid),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const call = snapshot.docs[0];
      if (call && !activeCall) {
        setIncomingCall({ id: call.id, ...call.data() } as CallData);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [profile, activeCall]);

  // Listen for call status changes if we are part of a call
  useEffect(() => {
    if (!activeCall) return;

    const path = `calls/${activeCall.id}`;
    const unsubscribe = onSnapshot(doc(db, 'calls', activeCall.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CallData;
        if (data.status === 'ended') {
          cleanupCall();
        }
      } else {
        cleanupCall();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [activeCall]);

  const cleanupCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
  };

  const setupPeerConnection = async (callId: string) => {
    const pc = new RTCPeerConnection(servers);
    pcRef.current = pc;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: activeCall?.type === 'video' || incomingCall?.type === 'video',
      audio: true
    });
    
    setLocalStream(stream);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Signaling ICE Candidates
    const candidatesCollectionPath = `calls/${callId}/candidates`;
    const candidatesCollection = collection(db, 'calls', callId, 'candidates');
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(candidatesCollection, {
          ...event.candidate.toJSON(),
          senderId: profile?.uid
        });
      }
    };

    // Listen for remote candidates
    onSnapshot(candidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.senderId !== profile?.uid) {
            pc.addIceCandidate(new RTCIceCandidate(data as any));
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, candidatesCollectionPath);
    });

    return pc;
  };

  const initiateCall = async (receiverId: string, receiverName: string, type: 'voice' | 'video') => {
    if (!profile) return;

    try {
      const callDoc = await addDoc(collection(db, 'calls'), {
        callerId: profile.uid,
        callerName: profile.displayName || profile.email.split('@')[0],
        receiverId,
        receiverName,
        type,
        status: 'calling',
        createdAt: serverTimestamp()
      });

      // Also create a notification for the receiver
      await addDoc(collection(db, 'notifications'), {
        userId: receiverId,
        type: 'system',
        title: 'Incoming Call',
        message: `${profile.displayName || profile.email.split('@')[0]} is calling you (${type} call)`,
        link: '/dashboard', // Or some other relevant link
        read: false,
        createdAt: serverTimestamp()
      });

      const callData: CallData = {
        id: callDoc.id,
        callerId: profile.uid,
        callerName: profile.displayName || 'Me',
        receiverId,
        receiverName,
        type,
        status: 'calling'
      };

      setActiveCall(callData);

      const pc = await setupPeerConnection(callDoc.id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await updateDoc(doc(db, 'calls', callDoc.id), {
        offer: { type: offer.type, sdp: offer.sdp }
      });

      // Listen for answer
      const path = `calls/${callDoc.id}`;
      onSnapshot(doc(db, 'calls', callDoc.id), async (snap) => {
        const data = snap.data();
        if (data?.answer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await updateDoc(doc(db, 'calls', callDoc.id), { status: 'connected' });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'calls');
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !profile) return;

    setActiveCall({ ...incomingCall, status: 'connected' });
    const callId = incomingCall.id;
    setIncomingCall(null);

    try {
      const pc = await setupPeerConnection(callId);
      
      const unsub = onSnapshot(doc(db, 'calls', callId), async (s) => {
         const data = s.data();
         if (data?.offer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateDoc(doc(db, 'calls', callId), { 
              answer: { type: answer.type, sdp: answer.sdp },
              status: 'connected'
            });
            unsub();
         }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `calls/${callId}`);
      });
    } catch (error) {
      console.error("Accept call error:", error);
    }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'ended' });
    setIncomingCall(null);
  };

  const endCall = async () => {
    if (!activeCall) return;
    await updateDoc(doc(db, 'calls', activeCall.id), { status: 'ended' });
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider value={{ initiateCall, activeCall, incomingCall, acceptCall, rejectCall, endCall }}>
      {children}
      
      {/* Call UI */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-[#0A2F6F] rounded-3xl p-4 shadow-2xl border border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  {incomingCall.type === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Incoming {incomingCall.type} Call</p>
                  <p className="font-bold">{incomingCall.callerName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={rejectCall}
                  className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
                <button 
                  onClick={acceptCall}
                  className="w-10 h-10 rounded-full bg-[#10A37F] flex items-center justify-center hover:bg-[#10A37F]/90 transition-colors shadow-lg shadow-[#10A37F]/20"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg aspect-video md:aspect-[4/3] bg-[#1a1a1a] rounded-[40px] overflow-hidden relative shadow-2xl border border-white/5">
              
              {/* Remote Stream */}
              {activeCall.type === 'video' ? (
                <video 
                  ref={el => {
                    if (el && remoteStream) el.srcObject = remoteStream;
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 rounded-full border border-white/20 animate-ping" />
                    <Phone className="w-12 h-12 text-[#10A37F]" />
                  </div>
                  <h2 className="text-2xl font-bold">{activeCall.receiverId === profile?.uid ? activeCall.callerName : activeCall.receiverName}</h2>
                  <p className="text-sm opacity-60 mt-2">{activeCall.status === 'calling' ? 'Calling...' : 'In Conversation'}</p>
                </div>
              )}

              {/* Local Stream (PIP) */}
              {activeCall.type === 'video' && localStream && (
                <div className="absolute top-6 right-6 w-1/4 aspect-video bg-black rounded-2xl overflow-hidden border border-white/20 shadow-xl">
                  <video 
                    ref={el => {
                      if (el && localStream) el.srcObject = localStream;
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Controls */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-full border border-white/10">
                <button 
                  onClick={toggleMute}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                    isMuted ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                  )}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                
                {activeCall.type === 'video' && (
                  <button 
                    onClick={toggleVideo}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                      isVideoOff ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                    )}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                  </button>
                )}

                <button 
                  onClick={endCall}
                  className="w-16 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>

              {/* Info Overlay */}
              <div className="absolute top-8 left-8 text-white">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 rounded-full bg-[#10A37F] animate-pulse" />
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                     {activeCall.type === 'video' ? 'Video' : 'Voice'} Call
                   </p>
                </div>
                <h3 className="font-bold text-lg">
                  {activeCall.receiverId === profile?.uid ? activeCall.callerName : activeCall.receiverName}
                </h3>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CallContext.Provider>
  );
};
