import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../components/AuthProvider';
import { motion } from 'motion/react';
import { UserRole } from '../types';
import { Mail, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';
import SEO from '../components/SEO';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await sendEmailVerification(userCredential.user);
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email,
          displayName: name,
          role,
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: new Date().toISOString()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first to reset password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4">
      <SEO title={isSignUp ? "Sign Up - FaceLinkUp" : "Log In - FaceLinkUp"} description="Log in or create a new FaceLinkUp account to access your professional dashboard." />
      <Link to="/" className="flex flex-col items-center gap-2 mb-8 group">
        <Logo size="xl" />
        <span className="text-3xl font-black text-[#0A2F6F] tracking-tighter">LINK</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl shadow-[#0A2F6F]/5 w-full max-w-md border border-gray-100"
      >
        <h2 className="text-2xl font-bold text-[#0A2F6F] mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="text-[#6C757D] mb-8">{isSignUp ? 'Join the hybrid workforce network' : 'Log in to your professional social hub'}</p>

        {error && (
          <div className={`mb-6 p-4 rounded-xl text-sm border ${error.includes('sent') ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C757D]" />
              <input 
                type="text" 
                placeholder="Full Name" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border-none rounded-2xl focus:ring-2 focus:ring-[#0A2F6F]/20 outline-none"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C757D]" />
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border-none rounded-2xl focus:ring-2 focus:ring-[#0A2F6F]/20 outline-none"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C757D]" />
            <input 
              type="password" 
              placeholder="Password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border-none rounded-2xl focus:ring-2 focus:ring-[#0A2F6F]/20 outline-none"
            />
          </div>

          {!isSignUp && (
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-xs font-bold text-[#10A37F] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-[#0A2F6F] block">Select Your Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(['user', 'freelancer', 'recruiter'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      role === r 
                        ? 'bg-[#0A2F6F] text-white shadow-lg' 
                        : 'bg-[#F8F9FA] text-[#6C757D] hover:bg-gray-200'
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:bg-[#0A2F6F]/90 transition-all shadow-lg shadow-[#0A2F6F]/20 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div className="mt-8 flex items-center gap-4 text-[#6C757D]">
          <div className="flex-1 h-px bg-gray-100"></div>
          <span className="text-xs font-semibold uppercase tracking-wider">Or continue with</span>
          <div className="flex-1 h-px bg-gray-100"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          type="button"
          className="w-full mt-6 py-4 bg-white border border-gray-200 text-[#212529] font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Google
        </button>

        <p className="mt-8 text-center text-[#6C757D]">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 font-bold text-[#10A37F] hover:underline"
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
