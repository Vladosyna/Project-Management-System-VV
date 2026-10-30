// Sign-in style screens: a centred card with the blue wordmark, labelled fields and announced messages.
import type { InputHTMLAttributes, ReactNode, SyntheticEvent } from 'react';
import logoBlue from '../assets/vionvision-logo-blue.svg';
import { useI18n } from '../i18n-context.tsx';

export function AuthLayout(props: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="ocs-auth">
      <section className="ocs-auth__card" aria-labelledby="ocs-auth-title">
        <img className="ocs-auth__logo" src={logoBlue} alt={t('brand.name')} />
        <h1 className="ocs-auth__title" id="ocs-auth-title">
          {props.title}
        </h1>
        {props.children}
      </section>
    </div>
  );
}

export function Form(props: { onSubmit: () => void | Promise<void>; children: ReactNode }) {
  return (
    <form
      className="ocs-form"
      noValidate
      onSubmit={(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
        event.preventDefault();
        void props.onSubmit();
      }}
    >
      {props.children}
    </form>
  );
}

export function TextField(
  props: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string },
) {
  const { label, hint, id, ...input } = props;
  return (
    <div className="ocs-field">
      <label className="ocs-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...input}
        id={id}
        className="ocs-field__input"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? (
        <span className="ocs-field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** An error or success line, announced to screen readers when it appears. */
export function FormMessage(props: { tone: 'error' | 'ok'; children: ReactNode }) {
  return (
    <p
      className={`ocs-form-message ocs-form-message--${props.tone}`}
      role={props.tone === 'error' ? 'alert' : 'status'}
    >
      {props.children}
    </p>
  );
}
