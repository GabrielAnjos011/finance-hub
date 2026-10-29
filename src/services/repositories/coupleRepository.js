import {
  doc,
  getDocFromServer,
  collection,
  getDocsFromServer,
  setDoc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { today } from '../../utils/dates';
export async function invite(uid, recipientUid) {
  const id = crypto.randomUUID();
  await setDoc(doc(db, 'invites', id), {
    senderUid: uid,
    recipientUid,
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400000),
    state: 'pending',
  });
  return id;
}
export async function getInvite(id) {
  const snapshot = await getDocFromServer(doc(db, 'invites', id));
  if (!snapshot.exists()) throw new Error('Convite não encontrado.');
  return { id, ...snapshot.data() };
}
export async function respondInvite(uid, id, accept) {
  await runTransaction(db, async (tx) => {
    const invRef = doc(db, 'invites', id),
      snapshot = await tx.get(invRef),
      inv = snapshot.data();
    if (
      !inv ||
      inv.recipientUid !== uid ||
      inv.state !== 'pending' ||
      inv.expiresAt.toMillis() <= Date.now()
    )
      throw new Error('Convite inválido ou expirado.');
    tx.update(invRef, { state: accept ? 'accepted' : 'declined' });
    if (accept) {
      tx.set(doc(db, 'couples', id), { memberA: inv.senderUid, memberB: uid, status: 'active' });
      tx.set(doc(db, 'memberships', uid), { coupleId: id });
      tx.set(doc(db, 'memberships', inv.senderUid), { coupleId: id });
    }
  });
}
export async function coupleData(uid) {
  const membership = await getDocFromServer(doc(db, 'memberships', uid));
  if (!membership.exists()) return null;
  const id = membership.data().coupleId;
  const snap = await getDocFromServer(doc(db, 'couples', id));
  const pair = snap.data(),
    partner = pair.memberA === uid ? pair.memberB : pair.memberA;
  let indicator = null;
  try {
    const shared = await getDocFromServer(doc(db, 'couples', id, 'indicators', partner));
    if (shared.exists()) indicator = shared.data();
  } catch (error) {
    if (error.code !== 'permission-denied') throw error;
  }
  const goals = await getDocsFromServer(collection(db, 'couples', id, 'goals'));
  const items = await Promise.all(
    goals.docs.map(async (g) => {
      const contributions = await getDocsFromServer(
        collection(db, 'couples', id, 'goals', g.id, 'contributions'),
      );
      return {
        id: g.id,
        ...g.data(),
        savedCents: contributions.docs.reduce((n, d) => n + d.data().amountCents, 0),
        contributions: contributions.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
    }),
  );
  return { id, ...pair, partner, indicator, goals: items };
}
export async function revokePair(pair) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'couples', pair.id);
    const snap = await tx.get(ref);
    if (snap.data()?.status !== 'active') throw new Error('Vínculo já encerrado.');
    tx.update(ref, { status: 'revoked' });
    tx.delete(doc(db, 'memberships', pair.memberA));
    tx.delete(doc(db, 'memberships', pair.memberB));
  });
}
export const shareIndicator = (uid, id, summary, consent) =>
  setDoc(doc(db, 'couples', id, 'indicators', uid), {
    consent,
    health: summary.health.state,
    reserve: !summary.config.essentialCents
      ? 'Não informado'
      : summary.reserve >= summary.config.essentialCents * summary.config.reserveMonths
        ? 'Adequada'
        : 'Em construção',
    organization:
      summary.health.confidence === 'baixa'
        ? 'Não informado'
        : summary.available >= 0
          ? 'Em dia'
          : 'Revisar',
    commitment: summary.income
      ? summary.expenses / summary.income > 0.85
        ? 'Elevado'
        : 'Moderado'
      : 'Não informado',
    updatedDate: today(),
  });
export const addSharedGoal = (uid, id, data) =>
  setDoc(doc(db, 'couples', id, 'goals', crypto.randomUUID()), {
    ...data,
    createdBy: uid,
    revision: 1,
  });
export const contribute = (uid, id, goalId, amountCents) =>
  setDoc(doc(db, 'couples', id, 'goals', goalId, 'contributions', crypto.randomUUID()), {
    uid,
    amountCents,
    date: today(),
  });
