import React from 'react';
import TopNav from './TopNav';

export default function PageLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-massure-lightgray">
      <TopNav />
      <main className="max-w-[1290px] mx-auto px-6 py-8">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h1 className="text-2xl font-bold text-massure-darkest">{title}</h1>}
            {subtitle && <p className="text-massure-dark/70 mt-1">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
