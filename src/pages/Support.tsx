import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Mail, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function Support() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-20 px-4">
      <SEO title="Support - FaceLinkUp" description="Get help with FaceLinkUp. Contact our support team for any issues or questions." />
      <div className="max-w-5xl mx-auto py-12">
        <Link to="/" className="text-sm text-[#0A2F6F] hover:underline mb-8 inline-block">← Back to Home</Link>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-extrabold text-[#0A2F6F] mb-4">How can we help?</h1>
          <p className="text-[#6C757D]">Search our help center or contact our support team directly.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          <SupportCard 
            icon={<HelpCircle className="w-8 h-8 text-[#0A2F6F]" />}
            title="FAQ"
            desc="Find answers to common questions about accounts, billing, and networking."
          />
          <SupportCard 
            icon={<Mail className="w-8 h-8 text-[#10A37F]" />}
            title="Email Support"
            desc="Our support team typically responds within 24 hours on business days."
          />
          <SupportCard 
            icon={<MessageSquare className="w-8 h-8 text-[#0A2F6F]" />}
            title="Community Forum"
            desc="Connect with other users and share tips on using FaceLinkUp."
          />
        </div>

        <div className="mt-20 bg-white rounded-3xl p-10 border border-gray-100 shadow-xl shadow-gray-200/50">
          <h2 className="text-2xl font-bold text-[#0A2F6F] mb-6">Contact Us</h2>
          <form action="https://formsubmit.co/m.sufiyan1581@gmail.com" method="POST" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_next" value={window.location.origin + "/support"} />
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Name</label>
              <input type="text" name="name" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none" placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Email</label>
              <input type="email" name="email" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none" placeholder="Your email" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-gray-700">Message</label>
              <textarea name="message" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none h-32 resize-none" placeholder="How can we help?"></textarea>
            </div>
            <button type="submit" className="md:col-span-2 py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:bg-[#0A2F6F]/90 transition-all">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SupportCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
      <div className="mb-6 p-4 bg-gray-50 w-fit rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-lg font-bold text-[#0A2F6F] mb-2">{title}</h3>
      <p className="text-sm text-[#6C757D] leading-relaxed">{desc}</p>
    </div>
  );
}
