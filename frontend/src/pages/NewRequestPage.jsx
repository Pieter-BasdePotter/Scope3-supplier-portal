import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createRequest } from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import { FormField, Input, Textarea, Select } from '../components/ui/FormField';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => CURRENT_YEAR - i);

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: createRequest,
    onSuccess: (data) => setInviteLink(data.inviteLink),
    onError: (err) => {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.target);
    mutation.mutate({
      supplierName:    fd.get('supplierName'),
      supplierEmail:   fd.get('supplierEmail'),
      referenceYear:   parseInt(fd.get('referenceYear')),
      categoryContext: fd.get('categoryContext'),
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (inviteLink) {
    return (
      <PageLayout title="Request Created" subtitle="Share the invitation link with your supplier.">
        <div className="max-w-2xl">
          <div className="card border-l-4 border-l-massure-green">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-massure-mint rounded-xl flex items-center justify-center text-massure-green font-bold text-lg shrink-0">✓</div>
              <div>
                <h2 className="font-bold text-massure-darkest text-lg">Invitation link generated</h2>
                <p className="text-massure-dark/70 text-sm">Send this link to the supplier. It expires in 72 hours.</p>
              </div>
            </div>

            <div className="bg-massure-mint rounded-xl p-4 mb-4">
              <p className="text-xs text-massure-teal font-semibold mb-2 uppercase tracking-wide">Supplier Invitation Link</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-massure-darkest break-all flex-1 font-mono">{inviteLink}</code>
                <button onClick={copyLink} className="btn-secondary text-sm shrink-0">
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <p className="text-xs text-massure-dark/50 mb-6">
              📋 Also logged to backend console for easy access during testing.
            </p>

            <div className="flex gap-3">
              <button onClick={() => navigate('/')} className="btn-secondary">Back to Dashboard</button>
              <button onClick={() => { setInviteLink(null); mutation.reset(); }} className="btn-primary">Create Another</button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="New Supplier Request" subtitle="Create an invitation for a supplier to submit Scope 3 data.">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="card space-y-5">
          <FormField label="Supplier name" error={errors.supplierName} required>
            <Input name="supplierName" placeholder="e.g. Acme Packaging BV" error={errors.supplierName} />
          </FormField>

          <FormField label="Supplier email" error={errors.supplierEmail} required>
            <Input name="supplierEmail" type="email" placeholder="contact@supplier.com" error={errors.supplierEmail} />
          </FormField>

          <FormField label="Reference year" error={errors.referenceYear} required>
            <Select name="referenceYear" error={errors.referenceYear}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </FormField>

          <FormField label="Category / Product context" error={errors.categoryContext} required>
            <Textarea name="categoryContext"
              placeholder="e.g. Cardboard packaging materials for product delivery"
              error={errors.categoryContext} />
          </FormField>

          {mutation.isError && !Object.keys(errors).length && (
            <p className="text-red-600 text-sm bg-red-50 rounded-xl p-3">
              {mutation.error?.response?.data?.error ?? 'An error occurred. Please try again.'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Creating…' : 'Create & Generate Link'}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
