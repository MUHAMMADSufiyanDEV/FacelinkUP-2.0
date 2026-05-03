import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  name?: string;
  type?: string;
}

export default function SEO({ 
  title = 'FaceLinkUp - Professional Networking, Marketplace, and Freelance Gigs', 
  description = 'Connect with industry professionals, find exciting job opportunities, and hire top-rated freelancers all in one unified platform.', 
  name = 'FaceLinkUp', 
  type = 'website' 
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={name} />
      <meta name="twitter:creator" content={name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
}
