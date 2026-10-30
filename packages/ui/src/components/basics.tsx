// Small building blocks: page header, button, card, status chip. Text always comes from the caller (i18n).
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useI18n } from '../i18n-context.tsx';

export function PageHeader(props: { eyebrow: string; title: string; actions?: ReactNode }) {
  return (
    <div className="ocs-page-header">
      <div>
        <div className="ocs-page-header__eyebrow">{props.eyebrow}</div>
        <h1 className="ocs-page-header__title">{props.title}</h1>
      </div>
      {props.actions ? <div className="ocs-page-header__actions">{props.actions}</div> : null}
    </div>
  );
}

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' },
) {
  const { variant = 'primary', className, type = 'button', ...rest } = props;
  return (
    <button
      {...rest}
      type={type === 'submit' ? 'submit' : type === 'reset' ? 'reset' : 'button'}
      className={`ocs-button ocs-button--${variant}${className ? ` ${className}` : ''}`}
    />
  );
}

export function Card(props: { title?: string; titleId?: string; children: ReactNode }) {
  return (
    <section className="ocs-card" aria-labelledby={props.title ? props.titleId : undefined}>
      {props.title ? (
        <h2 className="ocs-card__title" id={props.titleId}>
          {props.title}
        </h2>
      ) : null}
      {props.children}
    </section>
  );
}

export type StatusTone = 'ok' | 'progress' | 'risk' | 'wait' | 'breach' | 'escalated';

/** A status is always a word on a tint — colour is never the only cue. */
export function StatusChip(props: { tone: StatusTone }) {
  const { t } = useI18n();
  return <span className={`ocs-chip ocs-chip--${props.tone}`}>{t(`status.${props.tone}`)}</span>;
}
