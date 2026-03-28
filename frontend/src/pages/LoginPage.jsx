import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.target);
    try {
      await login(form.get('email'), form.get('password'));
      navigate('/');
    } catch {
      setError('Invalid credentials. Use admin@massure.test / admin123');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-massure-darkest flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-massure-green rounded-2xl flex items-center justify-center font-bold text-white text-2xl mx-auto mb-4">S3</div>
          <h1 className="text-2xl font-bold text-white">Scope 3 Supplier Portal</h1>
          <p className="text-white/50 text-sm mt-1">Customer Dashboard · Prototype</p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" defaultValue="admin@massure.test"
                className="input-field" placeholder="admin@massure.test" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" defaultValue="admin123"
                className="input-field" placeholder="••••••••" required />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl p-3">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full text-center">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-xs text-massure-dark/50 mt-4">
            Prototype mock credentials pre-filled above.
          </p>
        </div>
      </div>
    </div>
  );
}
