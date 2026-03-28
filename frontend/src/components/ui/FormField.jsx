import React from 'react';

export function FormField({ label, error, required, children }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-massure-green ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

export function Input({ error, className = '', ...props }) {
  return (
    <input
      className={`input-field ${error ? 'input-error' : ''} ${className}`}
      {...props}
    />
  );
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select
      className={`input-field ${error ? 'input-error' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ error, className = '', ...props }) {
  return (
    <textarea
      rows={4}
      className={`input-field resize-y ${error ? 'input-error' : ''} ${className}`}
      {...props}
    />
  );
}
