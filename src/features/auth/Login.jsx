import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { ArrowUpRight, ShieldCheck, TrendingUp, ArrowRight, Leaf } from 'lucide-react';
import { auth, configured } from '../../services/firebase/client';
import { useFinance } from '../../store/useFinance';
import { safeError } from '../../services/errors';
import { useAuth } from './AuthProvider';
const schema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
  remember: z.boolean(),
});
export function Login() {
  const [reset, setReset] = useState(false),
    [message, setMessage] = useState('');
  const { error } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reset ? schema.omit({ password: true }) : schema),
    defaultValues: { remember: false, email: '', password: '' },
  });
  async function submit(values) {
    setMessage('');
    if (!configured) {
      setMessage('Configure o Firebase seguindo o arquivo FIREBASE_SETUP.md do projeto.');
      return;
    }
    try {
      if (reset) {
        await sendPasswordResetEmail(auth, values.email);
        setMessage('Se a conta estiver cadastrada, você receberá as orientações de recuperação.');
      } else {
        await setPersistence(
          auth,
          values.remember ? browserLocalPersistence : browserSessionPersistence,
        );
        await signInWithEmailAndPassword(auth, values.email, values.password);
      }
    } catch (e) {
      setMessage(safeError(e));
    }
  }
  return (
    <main className="login">
      <section className="login-story">
        <a className="brand" href="#/">
          <span className="brand-icon">
            <TrendingUp size={24} />
          </span>
          finance<span className="brand-light">hub</span>
          <span className="brand-dot" />
        </a>
        <div className="login-copy">
          <span className="eyebrow light">MENOS INCERTEZA. MAIS POSSIBILIDADES.</span>
          <h1>
            Seu dinheiro.
            <br />
            Sua vida.
            <br />
            <em>Em equilíbrio.</em>
          </h1>
          <p>Entenda seu presente, planeje o futuro e dê o próximo passo com mais clareza.</p>
          <div className="balance-art" aria-hidden="true">
            <div className="art-top">
              <span>UMA VISÃO MAIS CLARA</span>
              <ArrowUpRight />
            </div>
            <div className="art-title">
              Pequenos passos.
              <br />
              Grandes planos.
            </div>
            <svg viewBox="0 0 380 125">
              <path
                d="M0 110 C45 115 50 70 95 78 S145 105 185 55 S230 80 270 35 S325 45 380 5"
                fill="none"
                stroke="#d8eca5"
                strokeWidth="3"
              />
              <path
                d="M0 110 C45 115 50 70 95 78 S145 105 185 55 S230 80 270 35 S325 45 380 5 V125 H0Z"
                fill="#d8eca5"
                opacity=".09"
              />
            </svg>
            <span className="art-leaf">
              <Leaf />
            </span>
          </div>
        </div>
        <div className="story-footer">
          <ShieldCheck size={16} /> Privacidade em primeiro lugar. Sempre.
        </div>
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <span className="eyebrow">BEM-VINDO AO SEU FINANCE HUB</span>
          <h2>{reset ? 'Recupere seu acesso' : 'Clareza para ir além.'}</h2>
          <p>
            {reset
              ? 'Enviaremos as instruções para o seu e-mail.'
              : 'Acesse seu espaço e cuide do que importa.'}
          </p>
          <form onSubmit={handleSubmit(submit)}>
            <label>
              E-mail
              <input
                type="email"
                autoComplete="username"
                placeholder="voce@exemplo.com"
                {...register('email')}
              />
              {errors.email && <small role="alert">{errors.email.message}</small>}
            </label>
            {!reset && (
              <label>
                Senha
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  {...register('password')}
                />
                {!reset && errors.password && <small role="alert">{errors.password.message}</small>}
              </label>
            )}
            {!reset && (
              <div className="form-options">
                <label className="check">
                  <input type="checkbox" {...register('remember')} />
                  Manter conectado
                </label>
                <button className="text-button" type="button" onClick={() => setReset(true)}>
                  Esqueci a senha
                </button>
              </div>
            )}
            {(message || error) && (
              <div className="notice" role="status">
                {message || error}
              </div>
            )}
            <button className="primary wide" disabled={isSubmitting}>
              {isSubmitting
                ? 'Aguarde…'
                : reset
                  ? 'Enviar recuperação'
                  : 'Entrar no meu Finance Hub'}
              <ArrowRight size={18} />
            </button>
          </form>
          {reset ? (
            <button className="text-button" onClick={() => setReset(false)}>
              Voltar para o login
            </button>
          ) : (
            <>
              <div className="divider">
                <span>CONHEÇA ANTES DE COMEÇAR</span>
              </div>
              <button className="secondary wide" onClick={() => useFinance.getState().enterDemo()}>
                Explorar demonstração <ArrowUpRight size={17} />
              </button>
              <button
                className="text-button wide"
                onClick={() => useFinance.getState().enterDemo({ empty: true })}
              >
                Experimentar do zero
              </button>
              <p className="micro">
                Ambiente de exemplo com dados fictícios.
                <br />
                Nenhuma informação é salva ao sair.
              </p>
            </>
          )}
          <div className="access-note">
            <ShieldCheck size={20} />
            <span>
              Acesso exclusivo a usuários autorizados.
              <br />
              {configured
                ? 'Sua autorização é verificada no servidor.'
                : 'Primeiro acesso? O guia FIREBASE_SETUP.md explica a configuração.'}
            </span>
          </div>
        </div>
        <span className="login-footer">Feito para uma vida financeira mais tranquila.</span>
      </section>
    </main>
  );
}
