import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSupplierForm, saveDraft, submitForm } from '../services/api';
import SupplierFormStepA from '../components/forms/SupplierFormStepA';
import SupplierFormStepB from '../components/forms/SupplierFormStepB';
import SupplierFormStepC from '../components/forms/SupplierFormStepC';

const STEPS = ['Basic information', 'Products & services', 'Transport (optional)'];

function Stepper({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              i < current ? 'bg-massure-green text-white' :
              i === current ? 'bg-massure-teal text-white' :
              'bg-massure-gray text-massure-dark/50'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-semibold hidden sm:block ${
              i === current ? 'text-massure-darkest' : 'text-massure-dark/50'
            }`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 ${i < current ? 'bg-massure-green' : 'bg-massure-gray'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function SupplierPortalPage() {
  const { token } = useParams();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['supplier-form', token],
    queryFn: () => getSupplierForm(token),
    retry: false,
  });

  const draftMut = useMutation({ mutationFn: (d) => saveDraft(token, d) });

  const submitMut = useMutation({
    mutationFn: (payload) => {
      // Build FormData for multipart (file uploads)
      const fd = new FormData();

      // Merge all form data
      const merged = { ...formData, ...payload };

      // Append items with their files
      const items = merged.items ?? [];
      items.forEach((item, i) => {
        const file = item.file?.[0];
        if (file instanceof File) {
          fd.append('files', file, `item_${i}_${file.name}`);
        }
      });

      // Send structured data as JSON string within multipart
      const jsonPayload = {
        stepA: {
          identifier:     merged.identifier,
          identifierType: merged.identifierType,
          orgName:        merged.orgName,
          referenceYear:  merged.referenceYear,
          dataSourceType: merged.dataSourceType,
          contactPerson:  merged.contactPerson,
          contactEmail:   merged.contactEmail,
        },
        stepB: {
          items: items.map((item) => ({
            productName:   item.productName,
            productCode:   item.productCode || null,
            outputQty:     Number(item.outputQty),
            outputUnit:    item.outputUnit,
            electricityKwh: item.electricityKwh ? Number(item.electricityKwh) : null,
            gasM3:          item.gasM3 ? Number(item.gasM3) : null,
            solidFuelKg:    item.solidFuelKg ? Number(item.solidFuelKg) : null,
            transportTkm:   item.transportTkm ? Number(item.transportTkm) : null,
            waterM3:        item.waterM3 ? Number(item.waterM3) : null,
            heatKwh:        item.heatKwh ? Number(item.heatKwh) : null,
            manualCo2e:     item.manualCo2e ? Number(item.manualCo2e) : null,
          })),
        },
        stepC: {
          transport: (merged.transport ?? []).map(t => ({
            mode:         t.mode,
            distanceKm:   Number(t.distanceKm),
            massKg:       Number(t.massKg),
            loadFactor:   t.loadFactor ? Number(t.loadFactor) : null,
            refrigerated: Boolean(t.refrigerated),
          })),
        },
      };

      fd.append('data', JSON.stringify(jsonPayload));
      return submitForm(token, fd);
    },
    onSuccess: () => setSubmitted(true),
  });

  // Save draft automatically when moving between steps
  async function handleStepANext(d) {
    const next = { ...formData, ...d };
    setFormData(next);
    draftMut.mutate({ stepA: d });
    setStep(1);
  }

  async function handleStepBNext(d) {
    const next = { ...formData, ...d };
    setFormData(next);
    draftMut.mutate({ stepA: formData, stepB: d });
    setStep(2);
  }

  function handleStepCSubmit(d) {
    submitMut.mutate(d);
  }

  // ─── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return <PortalShell><p className="text-center text-massure-dark/50 py-12">Loading supplier form…</p></PortalShell>;
  }

  if (error) {
    const msg = error.response?.data?.error ?? 'This invitation link is invalid or has expired.';
    return (
      <PortalShell>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
          <h2 className="text-xl font-bold text-massure-darkest mb-2">Link not valid</h2>
          <p className="text-massure-dark/70">{msg}</p>
        </div>
      </PortalShell>
    );
  }

  if (submitted) {
    return (
      <PortalShell>
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-massure-mint rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
          <h2 className="text-2xl font-bold text-massure-darkest mb-2">Submission received!</h2>
          <p className="text-massure-dark/70 max-w-md mx-auto">
            Thank you. Your Scope 3 data has been submitted to the customer for review. You will be notified if any corrections are needed.
          </p>
        </div>
      </PortalShell>
    );
  }

  const { request, response } = data;

  return (
    <div className="min-h-screen bg-massure-lightgray">
      {/* Supplier nav header */}
      <nav className="bg-massure-darkest text-white">
        <div className="max-w-[800px] mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-massure-green rounded-lg flex items-center justify-center font-bold text-white text-sm">S3</div>
            <span className="font-bold">Scope 3 Supplier Portal</span>
          </div>
          <span className="text-massure-teal text-sm font-semibold">Supplier submission form</span>
        </div>
      </nav>

      {/* Request context banner */}
      <div className="bg-massure-darkest/90 text-white/80 text-sm py-3">
        <div className="max-w-[800px] mx-auto px-6 flex flex-wrap gap-4">
          <span>Customer request: <strong className="text-white">{request.supplierName}</strong></span>
          <span>Reference year: <strong className="text-white">{request.referenceYear}</strong></span>
          {request.categoryContext && <span>Context: <strong className="text-white">{request.categoryContext}</strong></span>}
        </div>
      </div>

      <main className="max-w-[800px] mx-auto px-6 py-8">
        {/* Rejection note */}
        {response?.reviewNote && (
          <div className="card border-l-4 border-l-red-400 mb-6">
            <p className="text-red-600 font-bold mb-1">Previous submission was rejected</p>
            <p className="text-sm text-massure-dark">{response.reviewNote}</p>
            <p className="text-xs text-massure-dark/50 mt-1">Please correct the issues and resubmit.</p>
          </div>
        )}

        <div className="card">
          <Stepper current={step} />

          {step === 0 && (
            <SupplierFormStepA request={request} defaults={response} onNext={handleStepANext} />
          )}
          {step === 1 && (
            <SupplierFormStepB
              defaults={response ? { items: response.items } : {}}
              onNext={handleStepBNext}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <>
              {submitMut.isError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-red-700 font-semibold text-sm">Submission failed</p>
                  <p className="text-red-600 text-sm mt-1">
                    {submitMut.error?.response?.data?.error ?? 'Please check your data and try again.'}
                  </p>
                  {submitMut.error?.response?.data?.errors && (
                    <ul className="mt-2 space-y-1">
                      {Object.entries(submitMut.error.response.data.errors).map(([k, v]) => (
                        <li key={k} className="text-red-600 text-xs">• {k}: {v}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <SupplierFormStepC
                defaults={response ? { transport: response.transport } : {}}
                onSubmit={handleStepCSubmit}
                onBack={() => setStep(1)}
                isSubmitting={submitMut.isPending}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function PortalShell({ children }) {
  return (
    <div className="min-h-screen bg-massure-lightgray">
      <nav className="bg-massure-darkest text-white">
        <div className="max-w-[800px] mx-auto px-6 flex items-center h-16 gap-2">
          <div className="w-8 h-8 bg-massure-green rounded-lg flex items-center justify-center font-bold text-white text-sm">S3</div>
          <span className="font-bold">Scope 3 Supplier Portal</span>
        </div>
      </nav>
      <main className="max-w-[800px] mx-auto px-6 py-8">
        <div className="card">{children}</div>
      </main>
    </div>
  );
}
