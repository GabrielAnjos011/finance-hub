import { hash } from './files';
import { validateRecord } from '../models';
import { collections } from '../../constants/catalog';
const encode = (data) => btoa(String.fromCharCode(...data));
const decode = (data) => Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
async function key(password, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
export async function createBackup(data) {
  const payload = { format: 'finance-hub', version: 1, createdAt: new Date().toISOString(), data };
  return { ...payload, checksum: await hash(JSON.stringify(payload)) };
}
export async function encryptBackup(backup, password) {
  if (password.length < 12) throw new Error('Use uma senha com pelo menos 12 caracteres.');
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await key(password, salt),
    new TextEncoder().encode(JSON.stringify(backup)),
  );
  const bytes = new Uint8Array(cipher);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return {
    format: 'finance-hub-encrypted',
    version: 1,
    iterations: 310000,
    salt: encode(salt),
    iv: encode(iv),
    cipher: btoa(binary),
  };
}
export async function readBackup(input, password) {
  let value = JSON.parse(input);
  if (value.format === 'finance-hub-encrypted') {
    if (
      value.version !== 1 ||
      value.iterations !== 310000 ||
      typeof value.cipher !== 'string' ||
      value.cipher.length > 30000000
    )
      throw new Error('Backup criptografado inválido.');
    try {
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: decode(value.iv) },
        await key(password, decode(value.salt)),
        decode(value.cipher),
      );
      value = JSON.parse(new TextDecoder().decode(plain));
    } catch {
      throw new Error('Senha incorreta ou backup corrompido.');
    }
  }
  const { checksum, ...payload } = value;
  if (
    payload.format !== 'finance-hub' ||
    payload.version !== 1 ||
    checksum !== (await hash(JSON.stringify(payload)))
  )
    throw new Error('Formato ou integridade do backup inválidos.');
  if (!payload.data || Object.keys(payload.data).some((k) => !collections.includes(k)))
    throw new Error('Módulos inválidos no backup.');
  for (const module of collections) {
    if (!Array.isArray(payload.data[module])) throw new Error('Backup incompleto.');
    const ids = new Set();
    for (const item of payload.data[module]) {
      const { id, ...record } = item;
      if (typeof id !== 'string' || !id || id.length > 128 || id.includes('/') || ids.has(id))
        throw new Error('Identificador inválido ou duplicado.');
      ids.add(id);
      validateRecord(module, record);
    }
  }
  const accountIds = new Set(payload.data.accounts.map((a) => a.id)),
    cardIds = new Set(payload.data.cards.map((c) => c.id));
  for (const item of payload.data.transactions) {
    if (
      (item.accountId && !accountIds.has(item.accountId)) ||
      (item.destinationId && !accountIds.has(item.destinationId)) ||
      (item.cardId && !cardIds.has(item.cardId))
    )
      throw new Error('O backup possui lançamento com vínculo inválido.');
  }
  return payload.data;
}
