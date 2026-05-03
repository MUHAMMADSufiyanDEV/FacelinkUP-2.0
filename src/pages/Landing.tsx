import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  CheckCircle,
  Network
} from 'lucide-react';

import Logo from '../components/Logo';
import SEO from '../components/SEO';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <SEO title="FaceLinkUp - The Ultimate Professional Platform" description="Join FaceLinkUp to connect with industry leaders, discover jobs, and thrive in your professional career." />
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="md" />
            <span className="text-2xl font-black text-[#0A2F6F] tracking-tighter ml-1">LINK</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-[#6C757D] hover:text-[#0A2F6F] transition-colors">Log In</Link>
            <Link to="/login" className="px-5 py-2 bg-[#0A2F6F] text-white text-sm font-semibold rounded-full hover:bg-[#0A2F6F]/90 transition-all shadow-lg shadow-[#0A2F6F]/20">Join Now</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-extrabold text-[#0A2F6F] mb-6 tracking-tight"
          >
            Connect. Grow. <span className="text-[#10A37F]">Succeed.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#6C757D] max-w-2xl mx-auto mb-10"
          >
            The hybrid platform for modern professionals. Network socially, find freelance gigs, and showcase your professional portfolio all in one place.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:scale-105 transition-transform shadow-xl shadow-[#0A2F6F]/30">Get Started Free</Link>
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-4 bg-white text-[#0A2F6F] font-bold rounded-2xl border-2 border-[#0A2F6F]/10 hover:bg-[#0A2F6F]/5 transition-all text-center"
            >
              Explore Features
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0A2F6F]">Why UpLink?</h2>
            <p className="text-[#6C757D] mt-2">Designed for the future of work.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Network className="w-8 h-8 text-[#0A2F6F]" />}
              title="Hybrid Networking"
              desc="Combine the casual feel of social media with the professional depth of traditional networks."
            />
            <FeatureCard 
              icon={<Briefcase className="w-8 h-8 text-[#10A37F]" />}
              title="Service Gigs"
              desc="Browse pre-packaged professional services like logo design, writing, or SEO directly from top freelancers."
            />
            <FeatureCard 
              icon={<Briefcase className="w-8 h-8 text-[#10A37F]" />}
              title="Freelance Jobs"
              desc="Post projects and find high-quality talent through our integrated bidding and hiring system."
            />
            <FeatureCard 
              icon={<TrendingUp className="w-8 h-8 text-[#0A2F6F]" />}
              title="Portfolio Power"
              desc="Showcase your work experience, resume, and portfolio directly on your social profile."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-[#0A2F6F] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,163,127,0.2),transparent)]"></div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to link up?</h2>
          <p className="text-white/80 text-xl mb-10 max-w-xl mx-auto">Join thousands of freelancers and recruiters building the workforce of tomorrow.</p>
          <Link to="/login" className="px-10 py-5 bg-[#10A37F] text-white font-bold rounded-2xl hover:scale-105 transition-transform shadow-2xl shadow-[#10A37F]/20 inline-block">Create Your Profile</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-black text-[#0A2F6F] tracking-tighter">LINK</span>
          </div>
          <p className="text-[#6C757D] text-sm">&copy; {new Date().getFullYear()} UpLink Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-[#6C757D] hover:text-[#0A2F6F]">Privacy</Link>
            <Link to="/terms" className="text-sm text-[#6C757D] hover:text-[#0A2F6F]">Terms</Link>
            <Link to="/support" className="text-sm text-[#6C757D] hover:text-[#0A2F6F]">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div className="mb-6 p-4 bg-gray-50 w-fit rounded-2xl">{icon}</div>
      <h3 className="text-xl font-bold text-[#0A2F6F] mb-4">{title}</h3>
      <p className="text-[#6C757D] leading-relaxed">{desc}</p>
    </motion.div>
  );
}
