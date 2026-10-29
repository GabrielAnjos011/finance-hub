import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Modal } from '../ui/Primitives';
import { cents } from '../../utils/money';
import { safeError } from '../../services/errors';
export function RecordForm({ title, fields, initial = {}, onSave, onClose, note }) {
  const [error, setError] = useState('');
  const shape = Object.fromEntries(
    fields.map((f) => [
      f.name,
      f.type === 'checkbox'
        ? z.boolean()
        : f.optional
          ? z.string()
          : z.string().min(1, 'Preencha este campo.'),
    ]),
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(z.object(shape)),
    defaultValues: Object.fromEntries(
      fields.map((f) => [
        f.name,
        initial[f.name] ?? f.default ?? (f.type === 'checkbox' ? false : ''),
      ]),
    ),
  });
  const submit = async (values) => {
    try {
      setError('');
      const data = { ...values };
      for (const f of fields) {
        if (f.money) data[f.name] = cents(values[f.name] || '0');
        if (f.number) data[f.name] = Number(values[f.name]);
        if (f.min !== undefined && data[f.name] < f.min)
          throw new Error(`${f.label}: valor mínimo ${f.min}.`);
        if (f.max !== undefined && data[f.name] > f.max)
          throw new Error(`${f.label}: valor máximo ${f.max}.`);
      }
      await onSave(data);
      onClose();
    } catch (e) {
      setError(safeError(e));
    }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="record-form">
        {note && <div className="notice">{note}</div>}
        <div className="form-grid">
          {fields.map((f) => (
            <label
              key={f.name}
              className={(f.full ? 'full ' : '') + (f.type === 'checkbox' ? 'check' : '')}
            >
              {f.type === 'checkbox' && (
                <input aria-label={f.label} type="checkbox" {...register(f.name)} />
              )}
              <span>{f.label}</span>
              {f.options ? (
                <select aria-label={f.label} {...register(f.name)}>
                  {f.optional && <option value="">Não vincular</option>}
                  {f.options.map((o) => (
                    <option key={o.value ?? o} value={o.value ?? o}>
                      {o.label ?? o}
                    </option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea aria-label={f.label} {...register(f.name)} rows={3} />
              ) : f.type !== 'checkbox' ? (
                <input
                  aria-label={f.label}
                  type={f.type || 'text'}
                  step={f.step}
                  maxLength={f.maxLength || 200}
                  placeholder={f.placeholder}
                  {...register(f.name)}
                />
              ) : null}
              {f.hint && <small className="muted">{f.hint}</small>}
              {errors[f.name] && <small className="field-error">{errors[f.name].message}</small>}
            </label>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
