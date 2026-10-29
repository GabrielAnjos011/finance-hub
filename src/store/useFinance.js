import { create } from 'zustand';
import { collections } from '../constants/catalog';
import { loadFinance, writeRecords } from '../services/repositories/financeRepository';
import { demoData } from '../services/repositories/demoRepository';
import { validateRecord } from '../services/models';
const empty = () => Object.fromEntries(collections.map((c) => [c, []]));
let epoch = 0;
export const useFinance = create((set, get) => ({
  data: empty(),
  uid: null,
  demo: false,
  loading: false,
  busy: false,
  error: null,
  enterDemo: ({ empty: blank = false } = {}) => {
    epoch++;
    set({
      uid: 'demo',
      demo: true,
      data: blank ? empty() : demoData(),
      loading: false,
      error: null,
    });
  },
  clear: () => {
    epoch++;
    set({ data: empty(), uid: null, demo: false, loading: false, busy: false, error: null });
  },
  load: async (uid) => {
    const token = ++epoch;
    set({ uid, demo: false, data: empty(), loading: true, error: null });
    try {
      const data = await loadFinance(uid);
      if (token === epoch) set({ data, loading: false });
    } catch (error) {
      if (token === epoch) set({ loading: false, error });
    }
  },
  refresh: async () => {
    const { uid, demo } = get();
    if (demo) return;
    const token = epoch;
    const data = await loadFinance(uid);
    if (token === epoch) set({ data });
  },
  commit: async (operations) => {
    if (get().busy) throw new Error('Aguarde a operação em andamento.');
    const { uid, demo } = get(),
      token = epoch;
    set({ busy: true });
    try {
      if (!uid) throw new Error('Entre novamente para continuar.');
      const committed = demo ? operations : await writeRecords(uid, operations);
      if (token !== epoch) return;
      const data = structuredClone(get().data);
      for (const op of committed) {
        const index = data[op.module].findIndex((d) => d.id === op.id);
        if (demo && op.createOnly && index >= 0) throw new Error('Este lançamento já existe.');
        if (
          demo &&
          op.expectedRevision !== undefined &&
          data[op.module][index]?.revision !== op.expectedRevision
        )
          throw new Error('Os dados mudaram. Atualize a tela.');
        if (op.remove) {
          data[op.module] = data[op.module].filter((d) => d.id !== op.id);
          continue;
        }
        const record = demo
          ? validateRecord(op.module, {
              ...op.data,
              ownerUid: uid,
              schemaVersion: 1,
              revision: index >= 0 ? data[op.module][index].revision + 1 : 1,
            })
          : op.data;
        const item = { id: op.id, ...record };
        if (index >= 0) data[op.module][index] = item;
        else data[op.module].push(item);
      }
      set({ data });
    } finally {
      if (token === epoch) set({ busy: false });
    }
  },
}));
