export const money = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
export function cents(input) {
  let value = String(input ?? '')
    .trim()
    .replace(/R\$|\s/g, '');
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(value))
    throw new Error('Informe um valor válido com até duas casas decimais.');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace('-', '').split('.');
  const result = (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) * (negative ? -1 : 1);
  if (!Number.isSafeInteger(result) || Math.abs(result) > 100000000000)
    throw new Error('Valor fora do limite permitido.');
  return result;
}
export const sum = (values) => values.reduce((total, value) => total + value, 0);
export function splitCents(amount, count) {
  if (
    !Number.isSafeInteger(amount) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 120 ||
    amount < count
  )
    throw new Error('Parcelamento inválido.');
  const base = Math.floor(amount / count);
  return Array.from({ length: count }, (_, i) => base + (i < amount % count ? 1 : 0));
}
