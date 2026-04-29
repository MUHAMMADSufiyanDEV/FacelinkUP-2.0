import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './components/AuthProvider';
import Layout from './components/Layout';
import SEO from './components/SEO';

// Lazy load pages for better performance
const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Marketplace = React.lazy(() => import('./pages/Marketplace'));
const Gigs = React.lazy(() => import('./pages/Gigs'));
const Network = React.lazy(() => import('./pages/Network'));
const Messaging = React.lazy(() => import('./pages/Messaging'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Support = React.lazy(() => import('./pages/Support'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Blogs = React.lazy(() => import('./pages/Blogs'));
const WriteBlog = React.lazy(() => import('./pages/WriteBlog'));
const BlogDetails = React.lazy(() => import('./pages/BlogDetails'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A2F6F]"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <SEO />
          <React.Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2F6F]"></div>
            </div>
          }>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout><Profile /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/profile/:userId" element={
              <ProtectedRoute>
                <Layout><Profile /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/marketplace" element={
              <ProtectedRoute>
                <Layout><Marketplace /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/network" element={
              <ProtectedRoute>
                <Layout><Network /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/gigs" element={
              <ProtectedRoute>
                <Layout><Gigs /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/messages" element={
              <ProtectedRoute>
                <Layout><Messaging /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute>
                <Layout><Admin /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/blogs" element={
              <ProtectedRoute>
                <Layout><Blogs /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/blogs/:blogId" element={
              <ProtectedRoute>
                <Layout><BlogDetails /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/write-blog" element={
              <ProtectedRoute>
                <Layout><WriteBlog /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/support" element={<Support />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </Router>
    </AuthProvider>
    </HelmetProvider>
  );
}
