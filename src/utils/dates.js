import { addMonths, format, parseISO, lastDayOfMonth, differenceInCalendarDays } from 'date-fns';
export const today = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const dateLabel = (value) => (value ? format(parseISO(value), 'dd/MM/yyyy') : '—');
export function dayInMonth(month, day) {
  const start = parseISO(month + '-01');
  return format(
    new Date(start.getFullYear(), start.getMonth(), Math.min(day, lastDayOfMonth(start).getDate())),
    'yyyy-MM-dd',
  );
}
export const shiftMonth = (month, amount) =>
  format(addMonths(parseISO(month + '-01'), amount), 'yyyy-MM');
export function nextSalary(date, day) {
  const month = date.slice(0, 7);
  const current = dayInMonth(month, day);
  return current > date ? current : dayInMonth(shiftMonth(month, 1), day);
}
export function periodRange(month, mode = 'month', salaryDay = 25, custom = {}) {
  if (mode === 'custom') return custom;
  if (mode === 'year')
    return { start: month.slice(0, 4) + '-01-01', end: month.slice(0, 4) + '-12-31' };
  if (mode === 'cycle') {
    const start = dayInMonth(month, salaryDay);
    return {
      start,
      end: format(
        new Date(parseISO(dayInMonth(shiftMonth(month, 1), salaryDay)).getTime() - 86400000),
        'yyyy-MM-dd',
      ),
    };
  }
  return {
    start: month + '-01',
    end: format(lastDayOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd'),
  };
}
export const daysBetween = (a, b) => differenceInCalendarDays(parseISO(b), parseISO(a));
export function invoiceDates(purchaseDate, closingDay, dueDay, index = 0) {
  let month = purchaseDate.slice(0, 7);
  if (Number(purchaseDate.slice(8)) >= closingDay) month = shiftMonth(month, 1);
  month = shiftMonth(month, index);
  const closing = dayInMonth(month, closingDay);
  const dueMonth = dueDay <= closingDay ? shiftMonth(month, 1) : month;
  return { competence: month, dueDate: dayInMonth(dueMonth, dueDay), closingDate: closing };
}
