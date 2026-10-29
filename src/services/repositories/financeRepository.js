import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  query,
  orderBy,
  limit,
  startAfter,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { collections } from '../../constants/catalog';
import { diagnostics } from '../errors';
import { validateRecord } from '../models';
const ref = (uid, module, id) => doc(db, 'users', uid, module, id);
export async function authorized(uid) {
  const result = await getDocFromServer(doc(db, 'authorizedUsers', uid));
  diagnostics.reads++;
  return result.exists() && result.data().enabled === true;
}
export async function loadModule(uid, module) {
  const rows = [];
  let cursor;
  do {
    const parts = [orderBy('__name__'), limit(200)];
    if (cursor) parts.push(startAfter(cursor));
    const page = await getDocsFromServer(query(collection(db, 'users', uid, module), ...parts));
    diagnostics.reads += page.size;
    rows.push(...page.docs.map((d) => ({ id: d.id, ...d.data() })));
    cursor = page.size === 200 ? page.docs.at(-1) : undefined;
  } while (cursor);
  return rows;
}
export async function loadFinance(uid) {
  const values = await Promise.all(collections.map((module) => loadModule(uid, module)));
  return Object.fromEntries(collections.map((module, i) => [module, values[i]]));
}
export async function writeRecords(uid, operations) {
  if (!navigator.onLine) throw new Error('Conecte-se à internet antes de salvar.');
  if (operations.length > 150) throw new Error('Divida a operação em até 150 documentos.');
  const result = await runTransaction(db, async (tx) => {
    const refs = operations.map((op) => ref(uid, op.module, op.id));
    const snapshots = await Promise.all(refs.map((r) => tx.get(r)));
    diagnostics.reads += snapshots.length;
    const committed = [];
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i],
        snapshot = snapshots[i];
      if (op.createOnly && snapshot.exists()) throw new Error('Este lançamento já foi registrado.');
      if (
        op.expectedRevision !== undefined &&
        (!snapshot.exists() || snapshot.data().revision !== op.expectedRevision)
      )
        throw new Error('Os dados mudaram em outra sessão. Atualize a tela antes de salvar.');
      if (op.remove) {
        tx.delete(refs[i]);
        committed.push(op);
        continue;
      }
      const record = validateRecord(op.module, {
        ...op.data,
        ownerUid: uid,
        schemaVersion: 1,
        revision: snapshot.exists() ? snapshot.data().revision + 1 : 1,
      });
      tx.set(refs[i], record);
      committed.push({ ...op, data: record });
    }
    return committed;
  });
  diagnostics.writes += operations.length;
  return result;
}
