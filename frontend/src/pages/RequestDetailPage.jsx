import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequest, validateRequest, acceptRequest, rejectRequest, publishRequest } from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import { StatusBadge, QualityBadge } from '../components/ui/Badge';
import { format } from '../utils/format';

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: req, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: () => getRequest(id),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['request', id] });

  const validateMut  = useMutation({ mutationFn: () => validateRequest(id),  onSuccess: invalidate });
  const acceptMut    = useMutation({ mutationFn: () => acceptRequest(id),    onSuccess: invalidate });
  const rejectMut    = useMutation({ mutationFn: () => rejectRequest(id, rejectNote), onSuccess: () => { invalidate(); setShowRejectForm(false); } });
  const publishMut   = useMutation({ mutationFn: () => publishRequest(id),   onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['requests'] }); qc.invalidateQueries({ queryKey: ['published'] }); } });

  if (isLoading) return <PageLayout title="Loading…"><div className="card py-12 text-center text-massure-dark/50">Loading…</div></PageLayout>;
  if (!req) return <PageLayout title="Not found"><div className="card py-12 text-center">Request not found.</div></PageLayout>;

  const response = req.response;
  const calculations = response?.calculations ?? [];
  const items = response?.items ?? [];

  return (
    <PageLayout
      title={req.supplierName}
      subtitle={`${req.supplierEmail} · Reference year ${req.referenceYear}`}
    >
      {/* Status + Actions */}
      <div className="card mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={req.status} />
          <span className="text-massure-dark/50 text-sm">Created {format.date(req.createdAt)}</span>
          {response?.submittedAt && <span className="text-massure-dark/50 text-sm">Submitted {format.date(response.submittedAt)}</span>}
        </div>

        <div className="flex gap-2 flex-wrap">
          {req.status === 'SUBMITTED' && (
            <button onClick={() => validateMut.mutate()} disabled={validateMut.isPending} className="btn-teal text-sm">
              {validateMut.isPending ? '…' : 'Validate'}
            </button>
          )}
          {req.status === 'VALIDATED' && (
            <>
              <button onClick={() => setShowRejectForm(v => !v)} className="btn-secondary text-sm">Reject</button>
              <button onClick={() => acceptMut.mutate()} disabled={acceptMut.isPending} className="btn-primary text-sm">
                {acceptMut.isPending ? '…' : 'Accept'}
              </button>
            </>
          )}
          {req.status === 'ACCEPTED' && (
            <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending} className="btn-primary text-sm">
              {publishMut.isPending ? '…' : '🌐 Publish Results'}
            </button>
          )}
        </div>
      </div>

      {/* Reject form */}
      {showRejectForm && (
        <div className="card mb-6 border-l-4 border-l-red-400">
          <h3 className="font-bold text-massure-darkest mb-2">Rejection reason</h3>
          <textarea rows={3} value={rejectNote} onChange={e => setRejectNote(e.target.value)}
            className="input-field mb-3" placeholder="Explain what the supplier needs to correct…" />
          <div className="flex gap-2">
            <button onClick={() => setShowRejectForm(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={() => rejectMut.mutate()} disabled={rejectNote.length < 10 || rejectMut.isPending}
              className="btn-danger text-sm">
              {rejectMut.isPending ? '…' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      )}

      {/* Invite link */}
      {['INVITED', 'STARTED'].includes(req.status) && (
        <div className="card mb-6 bg-massure-mint border border-massure-teal/30">
          <p className="text-sm font-semibold text-massure-teal mb-1">Supplier Invitation Link</p>
          <code className="text-sm text-massure-darkest font-mono break-all">
            {`${window.location.origin}/supplier/${req.token}`}
          </code>
        </div>
      )}

      {/* Review note */}
      {response?.reviewNote && (
        <div className="card mb-6 border-l-4 border-l-red-400">
          <p className="text-sm font-semibold text-red-600 mb-1">Rejection note sent to supplier</p>
          <p className="text-sm text-massure-dark">{response.reviewNote}</p>
        </div>
      )}

      {/* Supplier organisation info */}
      {response && (
        <div className="card mb-6">
          <h2 className="section-title">Supplier Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              ['Organisation', response.orgName],
              ['Identifier', `${response.identifier} (${response.identifierType})`],
              ['Reference year', response.referenceYear],
              ['Data source', response.dataSourceType],
              ['Contact', response.contactPerson],
              ['Contact email', response.contactEmail],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-massure-dark/50 text-xs font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-massure-darkest font-semibold mt-0.5">{value ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calculation results */}
      {calculations.length > 0 && (
        <div className="card mb-6">
          <h2 className="section-title">Emission Calculations</h2>
          <div className="space-y-3">
            {calculations.map(calc => {
              const item = items.find(i => i.id === calc.itemId);
              return (
                <div key={calc.id} className={`rounded-xl p-4 border ${calc.deviationFlag ? 'border-yellow-400 bg-yellow-50' : 'border-massure-gray bg-massure-mint/40'}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-bold text-massure-darkest">{item?.productName ?? `Item #${calc.itemId}`}</p>
                      <p className="text-sm text-massure-dark/60 mt-0.5">
                        Output: {item?.outputQty} {item?.outputUnit} · Version: {calc.calcRuleVersion}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-massure-darkest text-lg">{format.co2e(calc.totalKgco2e)}</p>
                      <p className="text-sm text-massure-dark/60">{calc.intensityKgco2ePerUnit.toFixed(4)} kgCO₂e/{item?.outputUnit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <QualityBadge label={calc.qualityLabel} />
                    {calc.deviationFlag && (
                      <span className="badge bg-yellow-100 text-yellow-700">
                        ⚠ {calc.deviationPercent?.toFixed(1)}% deviation from manual estimate
                      </span>
                    )}
                    {calc.publishedAt && <span className="badge bg-massure-green text-white">Published {format.date(calc.publishedAt)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status history */}
      {req.statusHistory?.length > 0 && (
        <div className="card">
          <h2 className="section-title">Status History</h2>
          <div className="space-y-2">
            {req.statusHistory.map(h => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-massure-green mt-1.5 shrink-0" />
                <div>
                  <span className="font-semibold text-massure-darkest">{h.oldStatus} → {h.newStatus}</span>
                  <span className="text-massure-dark/50 ml-2">by {h.changedBy} · {format.datetime(h.createdAt)}</span>
                  {h.note && <p className="text-massure-dark/70 mt-0.5 italic">"{h.note}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
