import React from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, Input, Select } from '../ui/FormField';

const OUTPUT_UNITS = ['kg', 'ton', 'm3', 'L', 'kWh', 'GJ', 'piece', 'km', 'hour', 'm2'];

const itemSchema = z.object({
  productName:   z.string().min(1, 'Product name required'),
  productCode:   z.string().optional(),
  outputQty:     z.coerce.number({ invalid_type_error: 'Must be a number' }).nonnegative('Must be ≥ 0'),
  outputUnit:    z.enum(OUTPUT_UNITS),
  electricityKwh: z.coerce.number().nonnegative().optional().nullable(),
  gasM3:          z.coerce.number().nonnegative().optional().nullable(),
  solidFuelKg:    z.coerce.number().nonnegative().optional().nullable(),
  transportTkm:   z.coerce.number().nonnegative().optional().nullable(),
  waterM3:        z.coerce.number().nonnegative().optional().nullable(),
  heatKwh:        z.coerce.number().nonnegative().optional().nullable(),
  manualCo2e:     z.coerce.number().nonnegative().optional().nullable(),
  file:           z.any().optional(),
});

const schema = z.object({ items: z.array(itemSchema).min(1, 'Add at least one product row') });

const emptyRow = () => ({
  productName: '', productCode: '', outputQty: '', outputUnit: 'kg',
  electricityKwh: '', gasM3: '', solidFuelKg: '', transportTkm: '',
  waterM3: '', heatKwh: '', manualCo2e: '', file: null,
});

function ActivityInput({ label, name, register, error }) {
  return (
    <div>
      <label className="text-xs text-massure-dark/60 block mb-1">{label}</label>
      <Input {...register(name)} type="number" step="any" min="0"
        placeholder="—" className="text-sm py-1.5" error={error} />
    </div>
  );
}

function ProductRow({ index, register, control, remove, errors }) {
  const [expanded, setExpanded] = React.useState(true);
  const errs = errors?.items?.[index] ?? {};

  return (
    <div className="border border-massure-gray rounded-2xl overflow-hidden">
      <div className="bg-massure-mint/60 px-5 py-3 flex items-center justify-between">
        <span className="font-bold text-massure-darkest text-sm">Product / Service #{index + 1}</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="text-massure-teal text-sm font-semibold">{expanded ? '▲ Collapse' : '▼ Expand'}</button>
          <button type="button" onClick={() => remove(index)}
            className="text-red-400 hover:text-red-600 text-sm font-bold">✕ Remove</button>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-4">
          {/* Identity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <FormField label="Product / service name" error={errs.productName?.message} required>
                <Input {...register(`items.${index}.productName`)} placeholder="e.g. Cardboard box 40L" error={errs.productName} />
              </FormField>
            </div>
            <FormField label="Product code (optional)" error={errs.productCode?.message}>
              <Input {...register(`items.${index}.productCode`)} placeholder="SKU-123" />
            </FormField>
          </div>

          {/* Output */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Output quantity" error={errs.outputQty?.message} required>
              <Input {...register(`items.${index}.outputQty`)} type="number" step="any" min="0"
                placeholder="0" error={errs.outputQty} />
            </FormField>
            <FormField label="Output unit" error={errs.outputUnit?.message} required>
              <Select {...register(`items.${index}.outputUnit`)} error={errs.outputUnit}>
                {OUTPUT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </FormField>
          </div>

          {/* Activity data */}
          <div>
            <p className="text-xs font-bold text-massure-teal uppercase tracking-wide mb-2">Activity data</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ActivityInput label="Electricity (kWh)" name={`items.${index}.electricityKwh`} register={register} error={errs.electricityKwh} />
              <ActivityInput label="Natural gas (m³)" name={`items.${index}.gasM3`} register={register} error={errs.gasM3} />
              <ActivityInput label="Solid fuel (kg)" name={`items.${index}.solidFuelKg`} register={register} error={errs.solidFuelKg} />
              <ActivityInput label="Transport (ton-km)" name={`items.${index}.transportTkm`} register={register} error={errs.transportTkm} />
              <ActivityInput label="Water (m³)" name={`items.${index}.waterM3`} register={register} error={errs.waterM3} />
              <ActivityInput label="Heat / steam (kWh)" name={`items.${index}.heatKwh`} register={register} error={errs.heatKwh} />
            </div>
          </div>

          {/* Manual CO2e + File */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Manual CO₂e estimate (kgCO₂e) — optional" error={errs.manualCo2e?.message}>
              <Input {...register(`items.${index}.manualCo2e`)} type="number" step="any" min="0"
                placeholder="Optional plausibility check" error={errs.manualCo2e} />
              <p className="text-xs text-massure-dark/50 mt-1">Not authoritative — used to flag large deviations only.</p>
            </FormField>
            <FormField label="Supporting document (optional)" error={errs.file?.message}>
              <input {...register(`items.${index}.file`)} type="file"
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                className="block w-full text-sm text-massure-dark/70 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-massure-mint file:text-massure-green file:font-semibold hover:file:bg-massure-green hover:file:text-white file:transition-colors" />
            </FormField>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupplierFormStepB({ defaults, onNext, onBack }) {
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { items: defaults?.items?.length ? defaults.items : [emptyRow()] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  return (
    <form onSubmit={handleSubmit(data => onNext(data))} className="space-y-4">
      {fields.map((field, i) => (
        <ProductRow key={field.id} index={i} register={register} control={control}
          remove={remove} errors={errors} />
      ))}

      {errors.items?.root?.message && (
        <p className="text-red-600 text-sm">{errors.items.root.message}</p>
      )}

      <button type="button" onClick={() => append(emptyRow())}
        className="w-full border-2 border-dashed border-massure-teal/40 rounded-2xl py-3 text-massure-teal font-semibold hover:border-massure-teal hover:bg-massure-mint/30 transition-all text-sm">
        + Add product / service row
      </button>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="btn-secondary">← Back</button>
        <button type="submit" className="btn-primary">Continue to Transport →</button>
      </div>
    </form>
  );
}
