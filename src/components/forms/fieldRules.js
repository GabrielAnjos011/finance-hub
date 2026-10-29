import { z } from 'zod';
import { cents } from '../../utils/money';
export const visibleField = (field, values) => !field.when || field.when(values);
export const fieldText = (text, values) => (typeof text === 'function' ? text(values) : text);
export const fieldLength = (field) =>
  field.maxLength ??
  {
    name: 100,
    institution: 100,
    purpose: 200,
    notes: 1000,
    tags: 200,
    category: 100,
    accountId: 128,
    destinationId: 128,
    cardId: 128,
  }[field.name] ??
  200;
export const fieldOptions = (field, values) =>
  typeof field.options === 'function' ? field.options(values) : field.options;
export const inputAmount = (value) => {
  try {
    return cents(value || '0');
  } catch {
    return 0;
  }
};
export function formSchema(fields, values) {
  return z.object(
    Object.fromEntries(
      fields.map((field) => {
        if (!visibleField(field, values)) return [field.name, z.any().optional()];
        if (field.type === 'checkbox') return [field.name, z.boolean()];
        let schema = z
          .string()
          .max(fieldLength(field), `Use até ${fieldLength(field)} caracteres.`);
        if (!field.optional) schema = schema.min(1, 'Preencha este campo.');
        if (field.money)
          schema = schema.superRefine((value, context) => {
            if (!value && field.optional) return;
            try {
              const number = cents(value);
              if (field.min !== undefined && number < field.min)
                throw new Error(
                  field.min === 1
                    ? 'Informe um valor maior que zero.'
                    : 'Confira o valor informado.',
                );
            } catch (error) {
              context.addIssue({ code: 'custom', message: error.message });
            }
          });
        if (field.number)
          schema = schema.refine(
            (value) =>
              (!value && field.optional) ||
              (Number.isFinite(Number(value)) &&
                (field.step === 'any' || Number.isInteger(Number(value))) &&
                (field.min === undefined || Number(value) >= field.min) &&
                (field.max === undefined || Number(value) <= field.max)),
            `Informe ${field.min ?? 0} a ${field.max ?? 'um número válido'}.`,
          );
        if (field.type === 'date')
          schema = schema.refine(
            (value) => (!value && field.optional) || z.iso.date().safeParse(value).success,
            'Informe uma data válida.',
          );
        if (field.type === 'month')
          schema = schema.refine(
            (value) => (!value && field.optional) || /^\d{4}-(0[1-9]|1[0-2])$/.test(value),
            'Escolha um mês válido.',
          );
        const options = fieldOptions(field, values);
        if (options)
          schema = schema.refine(
            (value) =>
              (!value && field.optional) ||
              options.some((option) => String(option.value ?? option) === value),
            'Escolha uma opção disponível.',
          );
        return [field.name, schema];
      }),
    ),
  );
}
export function formValues(fields, values) {
  return Object.fromEntries(
    fields.map((field) => {
      let value = visibleField(field, values)
        ? values[field.name]
        : (field.default ?? (field.type === 'checkbox' ? false : ''));
      if (field.money) value = cents(value || '0');
      if (field.number) value = Number(value || field.default || 0);
      return [field.name, value];
    }),
  );
}
