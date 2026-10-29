import { it, expect } from 'vitest';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signOut,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } from 'firebase/firestore';
it('duas sessões reais do Authentication Emulator permanecem isoladas', async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-finance-hub',
    firestore: { host: '127.0.0.1', port: 8080 },
  });
  const apps = [];
  try {
    for (const label of ['a', 'b']) {
      const app = initializeApp(
        {
          projectId: 'demo-finance-hub',
          apiKey: 'demo-public-test-key',
          authDomain: 'demo-finance-hub.firebaseapp.com',
        },
        'test-' + label + '-' + Date.now(),
      );
      const auth = getAuth(app);
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      const store = getFirestore(app);
      connectFirestoreEmulator(store, '127.0.0.1', 8080);
      const email = `${label}-${crypto.randomUUID()}@example.test`;
      const user = await createUserWithEmailAndPassword(auth, email, 'EmulatorOnlyPassword123');
      apps.push({ app, auth, store, uid: user.user.uid, email });
    }
    const [a, b] = apps;
    await assertFails(getDoc(doc(a.store, 'users', a.uid, 'accounts', 'test')));
    await env.withSecurityRulesDisabled(async (context) => {
      for (const item of apps)
        await setDoc(doc(context.firestore(), 'authorizedUsers', item.uid), { enabled: true });
    });
    await setDoc(doc(a.store, 'users', a.uid, 'accounts', 'test'), {
      ownerUid: a.uid,
      schemaVersion: 1,
      revision: 1,
      name: 'Conta isolada',
      institution: 'Teste',
      kind: 'checking',
      initialCents: 100,
      referenceDate: '2026-10-01',
      purpose: '',
      spendable: true,
      includeInWealth: true,
    });
    expect((await getDoc(doc(a.store, 'users', a.uid, 'accounts', 'test'))).exists()).toBe(true);
    await assertFails(getDoc(doc(b.store, 'users', a.uid, 'accounts', 'test')));
    await signOut(a.auth);
    await signInWithEmailAndPassword(a.auth, a.email, 'EmulatorOnlyPassword123');
    expect(a.auth.currentUser.uid).toBe(a.uid);
  } finally {
    await Promise.all(apps.map((item) => deleteApp(item.app)));
    await env.cleanup();
  }
});
