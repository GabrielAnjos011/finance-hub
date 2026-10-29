import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { Plus, Info, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Primitives';
import { safeError } from '../../services/errors';
import {
  visibleField,
  fieldText,
  fieldOptions,
  fieldLength,
  formSchema,
  formValues,
} from './fieldRules';

export function RecordForm({
  title,
  fields,
  initial = {},
  onSave,
  onClose,
  note,
  active = true,
  prerequisite,
  validate,
  derive,
  onCreateRelated,
  submitLabel = 'Salvar',
}) {
  const [error, setError] = useState(''),
    [advanced, setAdvanced] = useState(false);
  const previous = useRef({});
  const prefix = useId();
  const methods = useForm({
    resolver: (values, context, options) =>
      zodResolver(formSchema(fields, values))(values, context, options),
    defaultValues: Object.fromEntries(
      fields.map((field) => [
        field.name,
        initial[field.name] ?? field.default ?? (field.type === 'checkbox' ? false : ''),
      ]),
    ),
    mode: 'onBlur',
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = methods;
  const values = watch();
  const signature = JSON.stringify(values);
  useEffect(() => {
    if (!active) return;
    const updates = derive?.(values, previous.current) || {};
    previous.current = { ...values };
    for (const [key, value] of Object.entries(updates))
      if (values[key] !== value) setValue(key, value, { shouldDirty: false });
  }, [signature, active, derive, setValue]);
  const gate = prerequisite?.(values);
  const liveIssues = validate?.(values) || {};
  const basic = fields.filter(
    (field) =>
      visibleField(field, values) &&
      !field.advanced &&
      (!gate || field.beforeGate || gate.fields?.includes(field.name)),
  );
  const extra = fields.filter((field) => visibleField(field, values) && field.advanced);
  const reveal = (fieldName) => {
    if (fields.find((field) => field.name === fieldName)?.advanced) setAdvanced(true);
    requestAnimationFrame(() => document.getElementById(prefix + '-' + fieldName)?.focus());
  };
  const submit = async (raw) => {
    if (gate) return;
    setError('');
    const issues = validate?.(raw) || {};
    if (Object.keys(issues).length) {
      Object.entries(issues).forEach(([key, message]) =>
        setFieldError(key, { type: 'validate', message }),
      );
      reveal(Object.keys(issues)[0]);
      return;
    }
    try {
      await onSave(formValues(fields, raw));
      onClose();
    } catch (error) {
      setError(safeError(error));
    }
  };
  function renderField(field) {
    const label = fieldText(field.label, values),
      hint = fieldText(field.hint, values),
      options = fieldOptions(field, values);
    const id = prefix + '-' + field.name;
    const issue = errors[field.name]?.message || liveIssues[field.name];
    const shared = {
      id,
      'aria-label': label,
      'aria-invalid': Boolean(issue),
      'aria-describedby': hint || issue ? id + '-help' : undefined,
      ...register(field.name),
    };
    return (
      <div key={field.name} className={'field ' + (field.full ? 'full' : '')}>
        <label htmlFor={id} className={field.type === 'checkbox' ? 'check' : ''}>
          {field.type === 'checkbox' && <input type="checkbox" {...shared} />}
          <span>
            {label}
            {field.optional && field.type !== 'checkbox' && (
              <small className="optional-label">Opcional</small>
            )}
          </span>
        </label>
        {options ? (
          <select {...shared} disabled={field.disabled?.(values)}>
            <option value="">
              {field.emptyLabel || (field.optional ? 'Preencher depois' : 'Selecione')}
            </option>
            {options.map((option) => (
              <option key={option.value ?? option} value={option.value ?? option}>
                {option.label ?? option}
              </option>
            ))}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea {...shared} rows={3} maxLength={fieldLength(field)} />
        ) : field.type !== 'checkbox' ? (
          <input
            {...shared}
            type={field.type || 'text'}
            inputMode={field.money ? 'decimal' : field.number ? 'numeric' : field.inputMode}
            enterKeyHint="next"
            readOnly={field.readOnly}
            step={field.step}
            maxLength={fieldLength(field)}
            placeholder={fieldText(field.placeholder, values)}
          />
        ) : null}
        <div id={id + '-help'}>
          {issue ? (
            <small className="field-error" role="alert">
              {issue}
            </small>
          ) : hint ? (
            <small className="field-hint">{hint}</small>
          ) : null}
        </div>
        {field.related && onCreateRelated && (
          <button
            type="button"
            className="text-button field-add"
            onClick={() =>
              onCreateRelated(field.related.module, field.related.initial || {}, (result) => {
                setValue(field.name, result.id, { shouldValidate: true, shouldDirty: true });
              })
            }
          >
            <Plus size={14} />
            {field.related.label}
          </button>
        )}
      </div>
    );
  }
  return (
    <Modal title={title} onClose={onClose} active={active}>
      <form
        onSubmit={handleSubmit(submit, (issues) => reveal(Object.keys(issues)[0]))}
        className="record-form"
        noValidate
      >
        {note && !gate && (
          <div className="form-guide">
            <Info size={17} />
            <p>{fieldText(note, values)}</p>
          </div>
        )}
        <div className="form-grid">{basic.map(renderField)}</div>
        {gate && (
          <div className="prerequisite" role="status">
            <span className="eyebrow">VAMOS POR PARTES</span>
            <h3>{gate.title}</h3>
            <p>{gate.text}</p>
            {gate.module && (
              <button
                type="button"
                className="primary"
                onClick={() =>
                  onCreateRelated(gate.module, gate.initial || {}, (result) => {
                    if (gate.field)
                      setValue(gate.field, result[gate.resultKey || 'id'], { shouldDirty: true });
                  })
                }
              >
                {gate.action}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
        {!gate && extra.length > 0 && (
          <details
            className="advanced-fields"
            open={advanced}
            onToggle={(event) => setAdvanced(event.currentTarget.open)}
          >
            <summary>
              Mais opções <small>Preencha só se precisar</small>
            </summary>
            <div className="form-grid">{extra.map(renderField)}</div>
          </details>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            className="primary"
            disabled={isSubmitting || Boolean(gate) || Object.keys(liveIssues).length > 0}
          >
            {isSubmitting ? 'Salvando…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
