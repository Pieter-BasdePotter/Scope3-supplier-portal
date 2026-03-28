import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRequests, getPublished } from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import { StatusBadge, QualityBadge } from '../components/ui/Badge';
import { format } from '../utils/format';

export default function DashboardPage() {
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['requests'], queryFn: getRequests });
  const { data: published = [] } = useQuery({ queryKey: ['published'], queryFn: getPublished });

  return (
    <PageLayout title="Dashboard" subtitle="Manage supplier Scope 3 data requests.">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Requests', value: requests.length, color: 'text-massure-darkest' },
          { label: 'Submitted', value: requests.filter(r => r.status === 'SUBMITTED').length, color: 'text-purple-600' },
          { label: 'Published', value: requests.filter(r => r.status === 'PUBLISHED').length, color: 'text-massure-green' },
          { label: 'Action Required', value: requests.filter(r => ['SUBMITTED', 'VALIDATED'].includes(r.status)).length, color: 'text-yellow-600' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-massure-dark/60 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Requests table */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Supplier Requests</h2>
          <Link to="/requests/new" className="btn-primary text-sm">+ New Request</Link>
        </div>

        {isLoading ? (
          <p className="text-massure-dark/50 text-center py-8">Loading…</p>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-massure-dark/50 mb-4">No supplier requests yet.</p>
            <Link to="/requests/new" className="btn-primary">Create your first request</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-massure-gray text-left">
                  <th className="pb-3 font-semibold text-massure-dark/70">Supplier</th>
                  <th className="pb-3 font-semibold text-massure-dark/70">Email</th>
                  <th className="pb-3 font-semibold text-massure-dark/70">Year</th>
                  <th className="pb-3 font-semibold text-massure-dark/70">Status</th>
                  <th className="pb-3 font-semibold text-massure-dark/70">Created</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-massure-gray/50 hover:bg-massure-mint/30 transition-colors">
                    <td className="py-3 font-semibold text-massure-darkest">{req.supplierName}</td>
                    <td className="py-3 text-massure-dark/70">{req.supplierEmail}</td>
                    <td className="py-3">{req.referenceYear}</td>
                    <td className="py-3"><StatusBadge status={req.status} /></td>
                    <td className="py-3 text-massure-dark/50">{format.date(req.createdAt)}</td>
                    <td className="py-3 text-right">
                      <Link to={`/requests/${req.id}`} className="text-massure-teal font-semibold hover:underline">
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Published results */}
      {published.length > 0 && (
        <div className="card">
          <h2 className="section-title">Published Results</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-massure-gray text-left">
                  <th className="pb-3 font-semibold text-massure-dark/70">Supplier</th>
                  <th className="pb-3 font-semibold text-massure-dark/70">Product</th>
                  <th className="pb-3 font-semibold text-massure-dark/70">Year</th>
                  <th className="pb-3 font-semibold text-massure-dark/70">Intensity (kgCO₂e/unit)</th>
                  <th className="pb-3 font-semibold text-massure-dark/70">Total (kgCO₂e)</th>
                  <th className="pb-3 font-semibold text-massure-dark/70">Quality</th>
                </tr>
              </thead>
              <tbody>
                {published.map(calc => (
                  <tr key={calc.id} className="border-b border-massure-gray/50">
                    <td className="py-3 font-semibold">{calc.response?.request?.supplierName ?? '—'}</td>
                    <td className="py-3">{calc.item?.productName ?? '—'}</td>
                    <td className="py-3">{calc.response?.referenceYear}</td>
                    <td className="py-3 font-mono text-massure-darkest">{calc.intensityKgco2ePerUnit.toFixed(4)}</td>
                    <td className="py-3 font-mono">{calc.totalKgco2e.toFixed(2)}</td>
                    <td className="py-3"><QualityBadge label={calc.qualityLabel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
