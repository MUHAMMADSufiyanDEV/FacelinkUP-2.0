import React from 'react';
import { motion } from 'motion/react';
import { FileText, Scale, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white pt-20 px-4">
      <div className="max-w-3xl mx-auto py-12">
        <Link to="/" className="text-sm text-[#0A2F6F] hover:underline mb-8 inline-block">← Back to Home</Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-extrabold text-[#0A2F6F] mb-6">Terms of Service</h1>
          <p className="text-[#6C757D] mb-8 italic">Last Updated: April 26, 2026</p>
          
          <div className="space-y-8 text-[#212529] leading-loose">
            <section>
              <h2 className="text-xl font-bold text-[#0A2F6F] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" /> 1. Acceptance of Terms
              </h2>
              <p>By accessing or using FaceLinkUp, you agree to be bound by these terms. If you do not agree, you may not use the services.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#0A2F6F] mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5" /> 2. User Obligations
              </h2>
              <p>You are responsible for maintaining the confidentiality of your account and password. You agree to provide accurate, current, and complete information during the registration process.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#0A2F6F] mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> 3. Prohibited Content
              </h2>
              <p>Users are prohibited from posting content that is illegal, offensive, or violates the rights of others. FaceLinkUp reserves the right to remove any content at its sole discretion.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
