import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export const SEOHead = ({
  title = 'Study Teddy - Your AI-Powered Study Companion',
  description = 'Transform your learning experience with Study Teddy. AI-powered tutoring, smart scheduling, progress tracking, and personalized study plans for academic success.',
  keywords = ['study app', 'AI tutor', 'education', 'learning', 'productivity', 'study planner'],
  canonicalUrl,
  ogImage = '/teddy_tutor.png',
  noIndex = false,
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords.join(', '));
    
    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:site_name', 'Study Teddy', true);
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);
    
    // Robots meta tag
    updateMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    
    // Canonical URL
    if (canonicalUrl) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', canonicalUrl);
    }

    // Structured data for education app
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Study Teddy",
      "description": description,
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "AI-Powered Tutoring",
        "Study Session Tracking",
        "Pomodoro Timer",
        "Progress Analytics",
        "Flashcards",
        "Goal Setting"
      ]
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

  }, [title, description, keywords, canonicalUrl, ogImage, noIndex]);

  return null;
};