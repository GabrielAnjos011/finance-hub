import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { it, expect, afterEach, vi } from 'vitest';
import { Login } from '../src/features/auth/Login';
import { useFinance } from '../src/store/useFinance';
vi.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ error: null }) }));
afterEach(() => {
  cleanup();
  useFinance.getState().clear();
});
it('não oferece cadastro público e identifica dados demonstrativos', () => {
  render(<Login />);
  expect(screen.queryByText(/criar conta/i)).not.toBeInTheDocument();
  expect(screen.getByText(/dados fictícios/i)).toBeInTheDocument();
});
it('entrada na demonstração é explícita e logout remove registros', () => {
  render(<Login />);
  expect(useFinance.getState().data.accounts).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: /explorar demonstração/i }));
  expect(useFinance.getState().demo).toBe(true);
  expect(useFinance.getState().data.accounts.length).toBeGreaterThan(0);
  useFinance.getState().clear();
  expect(useFinance.getState().data.transactions).toHaveLength(0);
});
it('recuperação exige somente e-mail, sem senha de login', async () => {
  render(<Login />);
  fireEvent.click(screen.getByRole('button', { name: 'Esqueci a senha' }));
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'teste@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar recuperação' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Configure o Firebase');
});
