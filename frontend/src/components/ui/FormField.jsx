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

export const Input = React.forwardRef(function Input({ error, className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`input-field ${error ? 'input-error' : ''} ${className}`}
      {...props}
    />
  );
});

export const Select = React.forwardRef(function Select({ error, className = '', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`input-field ${error ? 'input-error' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = React.forwardRef(function Textarea({ error, className = '', ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={4}
      className={`input-field resize-y ${error ? 'input-error' : ''} ${className}`}
      {...props}
    />
  );
});
