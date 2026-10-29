import { useEffect, useRef } from 'react';
import { X, Plus, ArrowUpRight } from 'lucide-react';
export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={'panel ' + className}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({ icon: Icon = Plus, title = 'Um novo começo', text, action }) {
  return (
    <div className="empty">
      <span>
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{text || 'Adicione seus dados para começar a acompanhar.'}</p>
      {action}
    </div>
  );
}
export function Progress({ value, label }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label || 'Progresso'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(100, Math.max(0, value || 0)))}
    >
      <div style={{ width: Math.min(100, Math.max(0, value || 0)) + '%' }} />
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Stat({ label, value, detail, icon: Icon, tone = '' }) {
  return (
    <div className={'stat ' + tone}>
      <div className="stat-top">
        <span>{label}</span>
        {Icon && <Icon size={19} />}
      </div>
      <strong>{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}
export function SectionIntro({ eyebrow, title, text, action }) {
  return (
    <div className="section-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
export function ActionLink({ children, onClick }) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
