import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
let env;
const account = (uid = 'alice', revision = 1) => ({
  ownerUid: uid,
  schemaVersion: 1,
  revision,
  name: 'Conta',
  institution: 'Banco',
  kind: 'checking',
  initialCents: 10000,
  referenceDate: '2026-10-01',
  purpose: '',
  spendable: true,
  includeInWealth: true,
});
const tx = (uid = 'alice') => ({
  ownerUid: uid,
  schemaVersion: 1,
  revision: 1,
  description: 'Teste',
  amountCents: 100,
  category: 'Outros',
  type: 'expense',
  date: '2026-10-01',
  competence: '2026-10',
  dueDate: '2026-10-01',
  status: 'confirmed',
  accountId: 'a',
  destinationId: '',
  cardId: '',
  groupId: 'x',
  installment: 1,
  installments: 1,
  tags: '',
  notes: '',
  recurrence: false,
});
const db = (uid) =>
  uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
const invite = (senderUid = 'alice', recipientUid = 'bob') => ({
  senderUid,
  recipientUid,
  state: 'pending',
  expiresAt: Timestamp.fromMillis(Date.now() + 86400000),
});
async function seed(callback) {
  await env.withSecurityRulesDisabled(async (context) => callback(context.firestore()));
}
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-finance-hub',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (admin) => {
    await Promise.all(
      ['alice', 'bob', 'carol'].map((uid) =>
        setDoc(doc(admin, 'authorizedUsers', uid), { enabled: true }),
      ),
    );
    await setDoc(doc(admin, 'users/alice/accounts/a'), account());
  });
});
afterAll(async () => {
  await env?.cleanup();
});
describe('Isolamento e schemas no SDK direto', () => {
  it('A lê sua conta', async () =>
    assertSucceeds(getDoc(doc(db('alice'), 'users/alice/accounts/a'))));
  it('B não lê A mesmo sabendo o ID', async () =>
    assertFails(getDoc(doc(db('bob'), 'users/alice/accounts/a'))));
  it('B não altera A', async () =>
    assertFails(
      updateDoc(doc(db('bob'), 'users/alice/accounts/a'), { initialCents: 999, revision: 2 }),
    ));
  it('B não exclui A', async () =>
    assertFails(deleteDoc(doc(db('bob'), 'users/alice/accounts/a'))));
  it('conta Auth sem autorização não lê nem cria registros', async () => {
    await assertFails(getDoc(doc(db('intruder'), 'users/alice/accounts/a')));
    await assertFails(
      setDoc(doc(db('intruder'), 'users/intruder/accounts/a'), account('intruder')),
    );
  });
  it('sem autenticação não acessa', async () =>
    assertFails(getDoc(doc(db(), 'users/alice/accounts/a'))));
  it('não permite conceder autorização pelo cliente', async () =>
    assertFails(setDoc(doc(db('alice'), 'authorizedUsers/alice'), { enabled: true, admin: true })));
  it('não permite lista global de usuários autorizados', async () =>
    assertFails(getDocs(collection(db('alice'), 'authorizedUsers'))));
  it('não permite ler autorização de outro UID', async () =>
    assertFails(getDoc(doc(db('alice'), 'authorizedUsers/bob'))));
  it('não permite alterar proprietário', async () =>
    assertFails(setDoc(doc(db('alice'), 'users/alice/accounts/a'), account('bob', 2))));
  it('não permite campos arbitrários ou valor fracionário', async () => {
    await assertFails(
      setDoc(doc(db('alice'), 'users/alice/accounts/new'), { ...account(), admin: true }),
    );
    await assertFails(
      setDoc(doc(db('alice'), 'users/alice/accounts/new'), { ...account(), initialCents: 10.1 }),
    );
  });
  it('exige incremento de revisão', async () => {
    await assertFails(setDoc(doc(db('alice'), 'users/alice/accounts/a'), account('alice', 1)));
    await assertSucceeds(setDoc(doc(db('alice'), 'users/alice/accounts/a'), account('alice', 2)));
  });
  it('nega coleções não previstas', async () =>
    assertFails(setDoc(doc(db('alice'), 'users/alice/admin/new'), account())));
  it('revogação da autorização bloqueia novas leituras', async () => {
    await seed((admin) => setDoc(doc(admin, 'authorizedUsers/alice'), { enabled: false }));
    await assertFails(getDoc(doc(db('alice'), 'users/alice/accounts/a')));
  });
  it('aceita lançamento válido e bloqueia mês fechado', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'users/alice/transactions/x'), tx()));
    await seed((admin) => setDoc(doc(admin, 'users/alice/closures/2026-10'), { closed: true }));
    await assertFails(setDoc(doc(db('alice'), 'users/alice/transactions/y'), tx()));
    await assertFails(deleteDoc(doc(db('alice'), 'users/alice/transactions/x')));
  });
});
async function createInvitation(id = 'pair') {
  await assertSucceeds(setDoc(doc(db('alice'), 'invites', id), invite()));
}
async function accept(id = 'pair', actor = 'bob') {
  const client = db(actor),
    batch = writeBatch(client);
  batch.update(doc(client, 'invites', id), { state: 'accepted' });
  batch.set(doc(client, 'couples', id), { memberA: 'alice', memberB: 'bob', status: 'active' });
  batch.set(doc(client, 'memberships/alice'), { coupleId: id });
  batch.set(doc(client, 'memberships/bob'), { coupleId: id });
  return batch.commit();
}
async function revoke() {
  const client = db('alice'),
    batch = writeBatch(client);
  batch.update(doc(client, 'couples/pair'), { status: 'revoked' });
  batch.delete(doc(client, 'memberships/alice'));
  batch.delete(doc(client, 'memberships/bob'));
  return batch.commit();
}
const indicator = {
  consent: true,
  health: 'Atenção',
  reserve: 'Em construção',
  organization: 'Em dia',
  commitment: 'Moderado',
  updatedDate: '2026-10-28',
};
describe('Consentimento bilateral e privacidade do casal', () => {
  it('destinatário aceita em uma operação atômica', async () => {
    await createInvitation();
    await assertSucceeds(accept());
    await assertSucceeds(getDoc(doc(db('bob'), 'couples/pair')));
  });
  it('terceiro não pode aceitar convite', async () => {
    await createInvitation();
    await assertFails(accept('pair', 'carol'));
  });
  it('remetente não aceita em nome do parceiro', async () => {
    await createInvitation();
    await assertFails(accept('pair', 'alice'));
  });
  it('não aceita vínculo sem locks bilaterais', async () => {
    await createInvitation();
    const client = db('bob'),
      batch = writeBatch(client);
    batch.update(doc(client, 'invites/pair'), { state: 'accepted' });
    batch.set(doc(client, 'couples/pair'), { memberA: 'alice', memberB: 'bob', status: 'active' });
    await assertFails(batch.commit());
  });
  it('não aceita convite expirado', async () => {
    await seed((admin) =>
      setDoc(doc(admin, 'invites/pair'), {
        ...invite(),
        expiresAt: Timestamp.fromMillis(Date.now() - 1000),
      }),
    );
    await assertFails(accept());
  });
  it('convite não pode ser lido por terceiro', async () => {
    await createInvitation();
    await assertFails(getDoc(doc(db('carol'), 'invites/pair')));
  });
  it('não cria convite para usuário não autorizado', async () =>
    assertFails(setDoc(doc(db('alice'), 'invites/x'), invite('alice', 'intruder'))));
  it('recusa não cria relacionamento', async () => {
    await createInvitation();
    await assertSucceeds(updateDoc(doc(db('bob'), 'invites/pair'), { state: 'declined' }));
    await assertFails(accept());
  });
  it('impede múltiplos relacionamentos simultâneos', async () => {
    await createInvitation();
    await accept();
    await assertFails(setDoc(doc(db('alice'), 'invites/second'), invite('alice', 'carol')));
  });
  it('mesmo vinculado, parceiro nunca lê conta ou transações privadas', async () => {
    await createInvitation();
    await accept();
    await assertFails(getDoc(doc(db('bob'), 'users/alice/accounts/a')));
    await assertFails(getDocs(collection(db('bob'), 'users/alice/transactions')));
  });
  it('compartilha somente rótulos permitidos', async () => {
    await createInvitation();
    await accept();
    await assertSucceeds(setDoc(doc(db('alice'), 'couples/pair/indicators/alice'), indicator));
    const result = await assertSucceeds(getDoc(doc(db('bob'), 'couples/pair/indicators/alice')));
    expect(result.data().health).toBe('Atenção');
    await assertFails(
      setDoc(doc(db('alice'), 'couples/pair/indicators/alice'), {
        ...indicator,
        balanceCents: 100,
      }),
    );
  });
  it('parceiro não escreve indicador de outro nem lê sem consentimento', async () => {
    await createInvitation();
    await accept();
    await assertFails(setDoc(doc(db('bob'), 'couples/pair/indicators/alice'), indicator));
    await setDoc(doc(db('alice'), 'couples/pair/indicators/alice'), {
      ...indicator,
      consent: false,
    });
    await assertFails(getDoc(doc(db('bob'), 'couples/pair/indicators/alice')));
  });
  it('terceiro não lê por conhecer coupleId', async () => {
    await createInvitation();
    await accept();
    await setDoc(doc(db('alice'), 'couples/pair/indicators/alice'), indicator);
    await assertFails(getDoc(doc(db('carol'), 'couples/pair/indicators/alice')));
  });
  it('desvinculação revoga novas leituras e remove locks', async () => {
    await createInvitation();
    await accept();
    await setDoc(doc(db('alice'), 'couples/pair/indicators/alice'), indicator);
    await assertSucceeds(revoke());
    await assertFails(getDoc(doc(db('bob'), 'couples/pair/indicators/alice')));
    await assertFails(getDoc(doc(db('bob'), 'couples/pair')));
    expect((await getDoc(doc(db('bob'), 'memberships/bob'))).exists()).toBe(false);
  });
  it('não permite liberar apenas um lock mantendo vínculo ativo', async () => {
    await createInvitation();
    await accept();
    await assertFails(deleteDoc(doc(db('alice'), 'memberships/alice')));
  });
  it('objetivos compartilhados aceitam contribuições dos membros', async () => {
    await createInvitation();
    await accept();
    await assertSucceeds(
      setDoc(doc(db('alice'), 'couples/pair/goals/trip'), {
        name: 'Viagem',
        targetCents: 10000,
        deadline: '2027-01-01',
        createdBy: 'alice',
        revision: 1,
      }),
    );
    await assertSucceeds(
      setDoc(doc(db('bob'), 'couples/pair/goals/trip/contributions/x'), {
        uid: 'bob',
        amountCents: 100,
        date: '2026-10-28',
      }),
    );
    await assertFails(
      setDoc(doc(db('bob'), 'couples/pair/goals/trip/contributions/y'), {
        uid: 'alice',
        amountCents: 100,
        date: '2026-10-28',
      }),
    );
    await assertFails(getDocs(collection(db('carol'), 'couples/pair/goals')));
  });
});
