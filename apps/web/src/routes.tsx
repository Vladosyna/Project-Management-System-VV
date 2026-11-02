// Routes. Every screen inside the shell needs a signed-in user with MFA set up; the sign-in screens do not.
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  redirect,
  useRouterState,
  type RouteComponent,
} from '@tanstack/react-router';
import { AppShell, type LinkRenderer, type NavItem } from '@ocs/ui';
import { loadSession, type Me } from './api.ts';
import { AcceptInvitationPage } from './pages/accept-invitation.tsx';
import { HomePage, NotYetPage } from './pages/home.tsx';
import { LoginPage } from './pages/login.tsx';
import { SetupMfaPage } from './pages/setup-mfa.tsx';
import { PortfolioPage } from './pages/portfolio.tsx';
import { ActionsPage } from './pages/actions.tsx';
import { SitePage } from './pages/site.tsx';
import { SitesPage } from './pages/sites.tsx';
// gen:screen-imports

/** Navigation as in the Main mockup. Screens other than Home arrive with their epics. */
const NAV: readonly Omit<NavItem, 'active'>[] = [
  { label: 'nav.home', href: '/' },
  { label: 'nav.portfolio', href: '/portfolio' },
  { label: 'nav.projects', href: '/projects' },
  { label: 'nav.sites', href: '/sites' },
  { label: 'nav.platform', href: '/platform' },
  { label: 'nav.actions', href: '/actions' },
  { label: 'nav.cases', href: '/cases' },
  { label: 'nav.commercial', href: '/commercial' },
  { label: 'nav.clientPortal', href: '/client-portal' },
  { label: 'nav.partnerApp', href: '/partner-app' },
  { label: 'nav.knowledge', href: '/knowledge' },
  { label: 'nav.admin', href: '/admin' },
];

/** Screens built so far, by path (`pnpm gen:screen` adds entries). Other NAV entries show NotYetPage. */
const SCREENS: Record<string, RouteComponent> = {
  '/portfolio': PortfolioPage,
  '/actions': ActionsPage,
  '/sites': SitesPage,
  // gen:screens
};

const routerLink: LinkRenderer = ({ href, className, current, children }) => (
  <Link to={href} className={className} aria-current={current ? 'page' : undefined}>
    {children}
  </Link>
);

const rootRoute = createRootRoute({ component: Outlet });

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  beforeLoad: async () => {
    const session = await loadSession();
    if (session.state === 'signed-out') throw redirect({ to: '/login' });
    if (session.state === 'mfa-required') throw redirect({ to: '/setup-mfa' });
    return { me: session.me };
  },
});

/** The signed-in user from beforeLoad; typed explicitly because the router's registered type is circular. */
const useMe = (): Me => shellRoute.useRouteContext({ select: (ctx: { me: Me }) => ctx.me });

function Shell() {
  const me = useMe();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AppShell
      nav={NAV.map((n) => ({
        ...n,
        active: n.href === path || (n.href !== '/' && path.startsWith(`${n.href}/`)),
      }))}
      user={{ name: me.name, roles: me.roles }}
      renderLink={routerLink}
    >
      <Outlet />
    </AppShell>
  );
}
shellRoute.update({ component: Shell });

function Home() {
  const me = useMe();
  return <HomePage me={me} />;
}
const homeRoute = createRoute({ getParentRoute: () => shellRoute, path: '/', component: Home });

const screenRoutes = Object.entries(SCREENS).map(([path, component]) =>
  createRoute({ getParentRoute: () => shellRoute, path, component }),
);

/** One project/site (E1, E5): the Site mockup. Not a NAV entry; opened from the Sites list. */
const siteRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/sites/$siteId',
  component: function Site() {
    // Typed via select: the router's registered type is circular here (as for useMe above).
    const siteId = siteRoute.useParams({ select: (p: { siteId: string }) => p.siteId });
    return <SitePage siteId={siteId} />;
  },
});

const notYetRoutes = NAV.filter((n) => n.href !== '/' && !(n.href in SCREENS)).map((n) =>
  createRoute({ getParentRoute: () => shellRoute, path: n.href, component: NotYetPage }),
);

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([homeRoute, siteRoute, ...screenRoutes, ...notYetRoutes]),
  createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/accept-invitation',
    component: AcceptInvitationPage,
  }),
  createRoute({ getParentRoute: () => rootRoute, path: '/setup-mfa', component: SetupMfaPage }),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
