import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, Input, Select } from '../ui/FormField';

const transportSchema = z.object({
  mode:        z.enum(['ROAD', 'RAIL', 'SEA', 'AIR']),
  distanceKm:  z.coerce.number({ invalid_type_error: 'Required' }).nonnegative('Must be ≥ 0'),
  massKg:      z.coerce.number({ invalid_type_error: 'Required' }).nonnegative('Must be ≥ 0'),
  loadFactor:  z.coerce.number().nonnegative().max(1).optional().nullable(),
  refrigerated: z.boolean().optional(),
});

const schema = z.object({ transport: z.array(transportSchema) });

const emptyRow = () => ({ mode: 'ROAD', distanceKm: '', massKg: '', loadFactor: '', refrigerated: false });

function TransportRow({ index, register, remove, errors }) {
  const errs = errors?.transport?.[index] ?? {};
  return (
    <div className="border border-massure-gray rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-massure-darkest text-sm">Transport leg #{index + 1}</span>
        <button type="button" onClick={() => remove(index)}
          className="text-red-400 hover:text-red-600 text-sm font-bold">✕ Remove</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FormField label="Mode" error={errs.mode?.message} required>
          <Select {...register(`transport.${index}.mode`)} error={errs.mode}>
            <option value="ROAD">🚛 Road</option>
            <option value="RAIL">🚂 Rail</option>
            <option value="SEA">🚢 Sea</option>
            <option value="AIR">✈️ Air</option>
          </Select>
        </FormField>
        <FormField label="Distance (km)" error={errs.distanceKm?.message} required>
          <Input {...register(`transport.${index}.distanceKm`)} type="number" step="any" min="0"
            placeholder="0" error={errs.distanceKm} />
        </FormField>
        <FormField label="Mass (kg)" error={errs.massKg?.message} required>
          <Input {...register(`transport.${index}.massKg`)} type="number" step="any" min="0"
            placeholder="0" error={errs.massKg} />
        </FormField>
        <FormField label="Load factor (0–1)" error={errs.loadFactor?.message}>
          <Input {...register(`transport.${index}.loadFactor`)} type="number" step="0.01" min="0" max="1"
            placeholder="Optional" />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-massure-dark cursor-pointer">
        <input type="checkbox" {...register(`transport.${index}.refrigerated`)}
          className="w-4 h-4 accent-massure-green" />
        Refrigerated transport
      </label>
    </div>
  );
}

export default function SupplierFormStepC({ defaults, onSubmit, onBack, isSubmitting }) {
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { transport: defaults?.transport ?? [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'transport' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-massure-mint rounded-2xl p-4 text-sm text-massure-teal font-semibold">
        ℹ️ Transport data is optional. Add rows only if transport emissions should be included separately from Step B activity data.
      </div>

      {fields.map((field, i) => (
        <TransportRow key={field.id} index={i} register={register} remove={remove} errors={errors} />
      ))}

      <button type="button" onClick={() => append(emptyRow())}
        className="w-full border-2 border-dashed border-massure-teal/40 rounded-2xl py-3 text-massure-teal font-semibold hover:border-massure-teal hover:bg-massure-mint/30 transition-all text-sm">
        + Add transport leg
      </button>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="btn-secondary">← Back</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Submitting…' : '✓ Submit to customer'}
        </button>
      </div>
    </form>
  );
}
