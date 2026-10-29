export function goalPlan(target, current, months, monthlyRate = 0) {
  const remaining = Math.max(0, target - current);
  if (months <= 0) return { remaining, monthly: remaining };
  if (monthlyRate === 0) return { remaining, monthly: Math.ceil(remaining / months) };
  const factor = (1 + monthlyRate) ** months;
  return {
    remaining,
    monthly: Math.max(0, Math.ceil(((target - current * factor) * monthlyRate) / (factor - 1))),
  };
}
export function futureValue(initial, monthly, months, rate = 0) {
  return Math.round(
    rate === 0
      ? initial + monthly * months
      : initial * (1 + rate) ** months + (monthly * ((1 + rate) ** months - 1)) / rate,
  );
}
export function amortization(principal, monthlyPayment, monthlyRate, extra = 0) {
  let debt = principal,
    interest = 0,
    months = 0;
  const payment = monthlyPayment + extra;
  if (payment <= principal * monthlyRate) return { possible: false };
  while (debt > 0 && months < 1200) {
    const fee = Math.round(debt * monthlyRate);
    interest += fee;
    debt = Math.max(0, debt + fee - payment);
    months++;
  }
  return { possible: debt === 0, months, interest };
}
