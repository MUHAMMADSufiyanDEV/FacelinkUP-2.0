import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Camera, 
  Wand2, 
  Loader2, 
  AlertCircle,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AudioRecorder, AudioPlayer } from '../lib/liveApiUtils';
import { cn } from '../lib/utils';

export default function AIInterviewLive() {
  const [isJoined, setIsJoined] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [aiTranscription, setAiTranscription] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const sessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const hasVideoRef = useRef(false);
  const hasAudioRef = useRef(false);

  // Initialize Audio
  const initAudio = useCallback(() => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new AudioPlayer();
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    audioRecorderRef.current?.stop();
    audioPlayerRef.current?.stop();
    sessionRef.current?.close();
    
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    
    audioRecorderRef.current = null;
    audioPlayerRef.current = null;
    sessionRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startInterview = async () => {
    setLoading(true);
    setError(null);
    initAudio();

    try {
      // 1. Get Camera/Mic Access
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        }
      }
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      hasVideoRef.current = hasVideo;
      hasAudioRef.current = hasAudio;
      setIsVideoEnabled(hasVideo);
      setIsAudioEnabled(hasAudio);
      if (videoRef.current && hasVideo) {
        videoRef.current.srcObject = stream;
      }

      // 2. Connect to Gemini Live API
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a professional technical interviewer. Conduct a friendly but challenging interview. Keep your responses concise and naturally conversational. Respond only with audio. If the user stops talking, wait a moment before prompting them.",
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
            setIsJoined(true);
            setLoading(false);
            
            // Start Audio Streaming
            audioRecorderRef.current = new AudioRecorder((base64Data) => {
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            });
            if (hasAudioRef.current) {
              audioRecorderRef.current.start();
            }

            // Start Video Streaming (Frames)
            frameIntervalRef.current = window.setInterval(() => {
              if (videoRef.current && canvasRef.current && isVideoEnabled) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (context) {
                  canvas.width = 300; // Small size for performance
                  canvas.height = (video.videoHeight / video.videoWidth) * 300;
                  context.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                  sessionPromise.then(session => {
                    session.sendRealtimeInput({
                      video: { data: base64Data, mimeType: 'image/jpeg' }
                    });
                  });
                }
              }
            }, 1000); // 1 frame per second is usually enough for visual context
          },
          onmessage: (message: any) => {
            // Handle Audio
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              audioPlayerRef.current?.playChunk(audioData);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              // Note: Implementation of a global interruption clear might be complex here
              // For now, we rely on the live server handling it.
            }

            // Handle Transcription
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              setAiTranscription(prev => (prev + ' ' + message.serverContent.modelTurn.parts[0].text).slice(-200));
            }
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            setError("Connection error. Please try again.");
            cleanup();
          },
          onclose: () => {
            console.log("Gemini Live Session Closed");
            cleanup();
            setIsJoined(false);
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start interview. Check camera/mic permissions.");
      setLoading(false);
    }
  };

  const endInterview = () => {
    cleanup();
    setIsJoined(false);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col">
      <AnimatePresence mode="wait">
        {!isJoined ? (
          /* Pre-call Setup Screen */
          <motion.div 
            key="setup"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 max-w-4xl mx-auto w-full flex flex-col items-center justify-center space-y-8 p-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black text-[#0A2F6F] tracking-tight">AI Video Interview</h1>
              <p className="text-gray-500">Practice your skills with our real-time AI interviewer.</p>
            </div>

            <div className="relative group w-full aspect-video max-w-2xl bg-gray-900 rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl">
              <video 
                ref={videoRef}
                autoPlay 
                muted 
                playsInline 
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-500",
                  isVideoEnabled ? "opacity-100" : "opacity-0"
                )}
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center">
                    <VideoOff className="w-10 h-10 text-gray-600" />
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <button 
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className={cn(
                    "p-4 rounded-2xl transition-all shadow-lg",
                    isAudioEnabled ? "bg-white/20 backdrop-blur-md text-white border border-white/30" : "bg-red-500 text-white"
                  )}
                >
                  {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </button>
                <button 
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                  className={cn(
                    "p-4 rounded-2xl transition-all shadow-lg",
                    isVideoEnabled ? "bg-white/20 backdrop-blur-md text-white border border-white/30" : "bg-red-500 text-white"
                  )}
                >
                  {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 w-full p-4 rounded-2xl text-sm border border-red-100 italic">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}
              <button 
                onClick={startInterview}
                disabled={loading}
                className="w-full py-5 bg-[#0A2F6F] text-white font-black rounded-3xl shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Connecting to AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Join Interview Room
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400">By joining, you agree to camera/mic usage for this session only.</p>
            </div>
          </motion.div>
        ) : (
          /* Active Call Screen */
          <motion.div 
            key="active-call"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
              {/* Main AI View (Large) */}
              <div className="lg:col-span-3 relative bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white group">
                {/* Simulated AI Video (Character/Waveform) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-48 h-48 bg-[#0A2F6F] rounded-full flex items-center justify-center shadow-2xl relative z-10">
                      <Sparkles className="w-24 h-24 text-blue-200 animate-pulse" />
                    </div>
                    {/* Pulsing rings for AI activity */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-blue-500/20 rounded-full animate-ping" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border-2 border-blue-500/10 rounded-full animate-ping delay-75" />
                  </div>
                  
                  <div className="mt-12 text-center">
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">Gemini AI</h2>
                    <p className="text-blue-400 font-bold text-sm tracking-widest flex items-center justify-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                       INTERVIEWER LIVE
                    </p>
                  </div>
                </div>

                {/* Subtitles/Transcription Overlay */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6">
                  <AnimatePresence>
                    {aiTranscription && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/40 backdrop-blur-lg border border-white/10 px-6 py-4 rounded-2xl text-center"
                      >
                        <p className="text-white font-medium text-lg italic">"{aiTranscription}"</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                    className={cn(
                      "p-4 rounded-2xl transition-all shadow-lg",
                      isAudioEnabled ? "bg-white/10 backdrop-blur-md text-white border border-white/20" : "bg-red-500 text-white"
                    )}
                  >
                    {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                  </button>
                  <button 
                    onClick={endInterview}
                    className="p-5 bg-red-600 text-white rounded-2xl shadow-xl hover:bg-red-700 transition-all hover:scale-110 active:scale-95"
                  >
                    <PhoneOff className="w-8 h-8" />
                  </button>
                  <button 
                    onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                    className={cn(
                      "p-4 rounded-2xl transition-all shadow-lg",
                      isVideoEnabled ? "bg-white/10 backdrop-blur-md text-white border border-white/20" : "bg-red-500 text-white"
                    )}
                  >
                    {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* Sidebar/Self View */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="aspect-video lg:aspect-square relative bg-gray-800 rounded-3xl overflow-hidden border-4 border-white shadow-lg">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    muted 
                    playsInline 
                    className={cn(
                      "w-full h-full object-cover",
                      isVideoEnabled ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <VideoOff className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest border border-white/20">
                    YOU
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 text-[#0A2F6F]">
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-bold text-sm">Live Insight</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-[#0A2F6F] animate-bounce" />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                      Gemini is listening to your body language and tone of voice. Stay confident!
                    </p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-50">
                    <button className="w-full py-3 text-[#0A2F6F] font-bold text-xs hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center gap-2">
                       Take Sample Notes
                       <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Hidden Canvas for Video Frames */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
