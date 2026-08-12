import React from 'react';

/**
 * Skip-to-content link for keyboard accessibility.
 * Renders a visually hidden link that becomes visible on focus,
 * allowing keyboard users to skip navigation and jump to main content.
 */
export const SkipToContent: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
  >
    Aller au contenu principal
  </a>
);
