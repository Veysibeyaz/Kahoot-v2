// src/components/QuizMasterLogo.js
import React from 'react';

const QuizMasterLogo = ({ size = 50, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      style={{ borderRadius: '12px' }}
    >
      {/* Background gradient */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f7fafc" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect width="100" height="100" rx="16" fill="url(#bgGradient)" />
      
      {/* Quiz icon - stylized Q with question mark */}
      <circle cx="35" cy="35" r="20" stroke="url(#iconGradient)" strokeWidth="4" fill="none" />
      <path d="M45 35 L55 45" stroke="url(#iconGradient)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="55" cy="55" r="3" fill="url(#iconGradient)" />
      
      {/* Decorative elements */}
      <circle cx="75" cy="25" r="4" fill="rgba(255,255,255,0.6)" />
      <circle cx="20" cy="70" r="3" fill="rgba(255,255,255,0.4)" />
      <circle cx="80" cy="75" r="2" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
};

export default QuizMasterLogo;