import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white pt-20 px-4">
      <div className="max-w-3xl mx-auto py-12">
        <Link to="/" className="text-sm text-[#0A2F6F] hover:underline mb-8 inline-block">← Back to Home</Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-extrabold text-[#0A2F6F] mb-6">Privacy Policy</h1>
          <p className="text-[#6C757D] mb-8 italic">Last Updated: April 26, 2026</p>
          
          <div className="space-y-8 text-[#212529] leading-loose">
            <section>
              <h2 className="text-xl font-bold text-[#0A2F6F] mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" /> 1. Information We Collect
              </h2>
              <p>We collect information you provide directly to us, such as when you create an account, update your profile, post content, or communicate with other users. This includes your name, email address, profile photo, bio, and any professional information you share.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#0A2F6F] mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" /> 2. How We Use Your Information
              </h2>
              <p>We use the information we collect to provide, maintain, and improve our services, facilitate networking and freelance opportunities, and send you technical notices and support messages.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#0A2F6F] mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" /> 3. Data Security
              </h2>
              <p>We implement a variety of security measures to maintain the safety of your personal information when you enter, submit, or access your information.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
