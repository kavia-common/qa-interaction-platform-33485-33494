import React from 'react';

/**
 * Header component rendering the title and a subtle brand accent.
 * PUBLIC_INTERFACE
 * This component displays the app header with branding and subtitle.
 * It uses styles from App.css: header, brand, brand-accent, title, subtitle.
 */
export default function Header() {
  return (
    <header className="header" role="banner">
      <div className="brand">
        <div className="brand-accent" />
        <h1 className="title">Q&A Agent</h1>
      </div>
      <p className="subtitle">Ask questions and review your conversation history</p>
    </header>
  );
}
