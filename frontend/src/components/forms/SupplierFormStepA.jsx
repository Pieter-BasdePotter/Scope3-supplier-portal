import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, Input, Select } from '../../components/ui/FormField';

const CURRENT_YEAR = new Date().getFullYear();

const schema = z.object({
  identifier:       z.string().min(2, 'Identifier is required'),
  identifierType:   z.enum(['KVK', 'VAT', 'DUNS', 'OTHER']),
  orgName:          z.string().min(2, 'Organisation name is required'),
  referenceYear:    z.number(),
  dataSourceType:   z.enum(['MEASURED', 'CALCULATED', 'ESTIMATED', 'EXTERNAL_LCA']),
  contactPerson:    z.string().min(2, 'Contact person is required'),
  contactEmail:     z.string().email('Valid email required'),
});

export default function SupplierFormStepA({ request, defaults, onNext }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      identifier:       defaults?.identifier ?? '',
      identifierType:   defaults?.identifierType ?? 'KVK',
      orgName:          defaults?.orgName ?? '',
      referenceYear:    request.referenceYear,
      dataSourceType:   defaults?.dataSourceType ?? 'MEASURED',
      contactPerson:    defaults?.contactPerson ?? '',
      contactEmail:     defaults?.contactEmail ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Identifier (KVK / VAT / DUNS)" error={errors.identifier?.message} required>
          <Input {...register('identifier')} placeholder="e.g. 12345678" error={errors.identifier} />
        </FormField>

        <FormField label="Identifier type" error={errors.identifierType?.message} required>
          <Select {...register('identifierType')} error={errors.identifierType}>
            <option value="KVK">KVK</option>
            <option value="VAT">VAT</option>
            <option value="DUNS">DUNS</option>
            <option value="OTHER">Other</option>
          </Select>
        </FormField>
      </div>

      <FormField label="Organisation name" error={errors.orgName?.message} required>
        <Input {...register('orgName')} placeholder="Your company name" error={errors.orgName} />
      </FormField>

      <FormField label="Reference year" error={errors.referenceYear?.message} required>
        <Input value={request.referenceYear} readOnly className="input-field bg-massure-mint text-massure-darkest font-semibold" />
        <input type="hidden" {...register('referenceYear', { valueAsNumber: true })} value={request.referenceYear} />
      </FormField>

      <FormField label="Data source type" error={errors.dataSourceType?.message} required>
        <Select {...register('dataSourceType')} error={errors.dataSourceType}>
          <option value="MEASURED">Measured (direct measurement)</option>
          <option value="CALCULATED">Calculated (activity-based)</option>
          <option value="ESTIMATED">Estimated (approximation)</option>
          <option value="EXTERNAL_LCA">External LCA</option>
        </Select>
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Contact person" error={errors.contactPerson?.message} required>
          <Input {...register('contactPerson')} placeholder="Full name" error={errors.contactPerson} />
        </FormField>
        <FormField label="Contact email" error={errors.contactEmail?.message} required>
          <Input {...register('contactEmail')} type="email" placeholder="contact@yourcompany.com" error={errors.contactEmail} />
        </FormField>
      </div>

      <div className="pt-2">
        <button type="submit" className="btn-primary">Continue to Product Data →</button>
      </div>
    </form>
  );
}
