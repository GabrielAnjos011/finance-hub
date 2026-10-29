export const diagnostics = { reads: 0, writes: 0, errors: 0, lastCode: null };
export function safeError(error) {
  diagnostics.errors++;
  diagnostics.lastCode = error?.code || 'validation';
  const code = error?.code || '';
  if (code.includes('permission-denied'))
    return 'Acesso negado. Confira sua autorização ou entre novamente.';
  if (code.includes('resource-exhausted'))
    return 'A cota do Firebase foi atingida. Tente novamente após a renovação da cota.';
  if (code.includes('unavailable'))
    return 'Sem conexão com o Firebase. Nenhuma gravação foi confirmada.';
  if (code.startsWith('auth/'))
    return 'Não foi possível entrar. Confira os dados ou solicite ajuda ao administrador.';
  return error?.message || 'Não foi possível concluir a operação.';
}
