// Sign-in style screens: a centred card with the blue wordmark, labelled fields and announced messages.
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  SyntheticEvent,
  TextareaHTMLAttributes,
} from 'react';
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

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string }) {
  const { label, id, ...area } = props;
  return (
    <div className="ocs-field">
      <label className="ocs-field__label" htmlFor={id}>
        {label}
      </label>
      <textarea {...area} id={id} className="ocs-field__input ocs-field__input--multiline" />
    </div>
  );
}

export function SelectField(
  props: SelectHTMLAttributes<HTMLSelectElement> & {
    id: string;
    label: string;
    options: readonly { value: string; label: string }[];
  },
) {
  const { label, id, options, ...select } = props;
  return (
    <div className="ocs-field">
      <label className="ocs-field__label" htmlFor={id}>
        {label}
      </label>
      <select {...select} id={id} className="ocs-field__input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A labelled group of checkboxes; `value` holds the checked ids. */
export function CheckboxGroup(props: {
  legend: string;
  options: readonly { id: string; label: string }[];
  value: readonly string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="ocs-field ocs-checkboxes">
      <legend className="ocs-field__label">{props.legend}</legend>
      {props.options.map((o) => (
        <label key={o.id} className="ocs-checkboxes__option">
          <input
            type="checkbox"
            checked={props.value.includes(o.id)}
            onChange={(e) => {
              props.onChange(
                e.currentTarget.checked ? [...props.value, o.id] : props.value.filter((v) => v !== o.id),
              );
            }}
          />{' '}
          {o.label}
        </label>
      ))}
    </fieldset>
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
