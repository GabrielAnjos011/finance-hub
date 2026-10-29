import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
// Testes unitários nunca usam o projeto Firebase configurado no .env do proprietário.
vi.mock('../src/services/firebase/client', () => ({ configured: false, auth: null, db: null }));
if (!HTMLDialogElement.prototype.showModal)
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
if (!HTMLDialogElement.prototype.close)
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
