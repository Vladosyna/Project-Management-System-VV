// The app shell from the Main mockup: navy sidebar (logo, tagline, navigation, signed-in user) and a
// top bar (search, three clocks, EN/中文 switch, notifications).
import { useEffect, useState, type ReactNode } from 'react';
import type { MessageKey } from '@ocs/i18n';
import logoWhite from '../assets/vionvision-logo-white.svg';
import { useI18n } from '../i18n-context.tsx';

export interface NavItem {
  readonly label: MessageKey;
  readonly href: string;
  readonly active?: boolean;
}

export interface ShellUser {
  readonly name: string;
  /** Role keys, e.g. ['director', 'admin']; shown translated. */
  readonly roles: readonly string[];
}

/** How the app renders a link (e.g. its router's Link); defaults to a plain anchor. */
export type LinkRenderer = (props: {
  href: string;
  className: string;
  current: boolean;
  children: ReactNode;
}) => ReactNode;

const plainLink: LinkRenderer = ({ href, className, current, children }) => (
  <a href={href} className={className} aria-current={current ? 'page' : undefined}>
    {children}
  </a>
);

const CLOCKS = [
  { label: 'shell.clock.beijing', zone: 'Asia/Shanghai' },
  { label: 'shell.clock.madrid', zone: 'Europe/Madrid' },
  { label: 'shell.clock.london', zone: 'Europe/London' },
] as const;

function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => {
      clearInterval(id);
    };
  }, []);
  return now;
}

export function AppShell(props: {
  nav: readonly NavItem[];
  user: ShellUser;
  renderLink?: LinkRenderer;
  children: ReactNode;
}) {
  const { t, language, setLanguage } = useI18n();
  const renderLink = props.renderLink ?? plainLink;
  const now = useMinuteClock();
  const time = (zone: string) =>
    new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
  const roleKey = (role: string) => `role.${role}` as MessageKey;

  return (
    <div className="ocs-shell">
      <nav className="ocs-nav" aria-label={t('nav.label')}>
        <div className="ocs-nav__brand">
          <img className="ocs-nav__logo" src={logoWhite} alt={t('brand.name')} />
          <span className="ocs-nav__tagline">{t('app.tagline')}</span>
        </div>
        {props.nav.map((item) => (
          <span key={item.href}>
            {renderLink({
              href: item.href,
              className: 'ocs-nav__link',
              current: item.active === true,
              children: t(item.label),
            })}
          </span>
        ))}
        <div className="ocs-nav__user" data-testid="signed-in-user">
          {t('shell.signedInAs', { name: props.user.name })}
          <br />
          {props.user.roles.map((r) => t(roleKey(r))).join(' · ')}
        </div>
      </nav>
      <main className="ocs-main">
        <header className="ocs-topbar">
          <label htmlFor="ocs-search" className="ocs-visually-hidden">
            {t('shell.search.label')}
          </label>
          <input
            id="ocs-search"
            type="search"
            className="ocs-topbar__search"
            placeholder={t('shell.search.placeholder')}
          />
          <span className="ocs-topbar__clocks">
            {CLOCKS.map((c) => `${t(c.label)} ${time(c.zone)}`).join(' · ')}
          </span>
          <button
            type="button"
            className="ocs-button ocs-button--secondary"
            aria-label={t('shell.language.toggleLabel')}
            onClick={() => {
              setLanguage(language === 'en' ? 'zh' : 'en');
            }}
          >
            {t('shell.language.toggle')}
          </button>
          <span className="ocs-icon-box" role="img" aria-label={t('shell.notifications')}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
              <path d="M10 20h4" />
            </svg>
          </span>
        </header>
        <div className="ocs-content">{props.children}</div>
      </main>
    </div>
  );
}
