import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function TopNav() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-massure-darkest text-white">
      <div className="max-w-[1290px] mx-auto px-6 flex items-center justify-between h-16">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-massure-green rounded-lg flex items-center justify-center font-bold text-white text-sm">S3</div>
          <span className="font-bold text-lg tracking-tight">Scope 3 Portal</span>
          <span className="text-massure-teal text-xs font-semibold ml-1 opacity-75">prototype</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          <NavLink to="/" label="Dashboard" active={location.pathname === '/'} />
          <NavLink to="/requests/new" label="+ New Request" active={location.pathname === '/requests/new'} />
        </div>

        {/* User */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/60">{user?.email}</span>
          <button onClick={logout} className="text-massure-teal hover:text-white transition-colors font-semibold">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      className={`text-sm font-bold uppercase tracking-wide transition-colors ${
        active ? 'text-massure-green' : 'text-white/80 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}
