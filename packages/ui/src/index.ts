// @ocs/ui — components on the Vionvision design tokens. The only package that may hold colours, fonts
// and styles (03-engineering-rules §4, §9). Importing it loads the token variables and component CSS.
import './styles/tokens.css';
import './styles/ui.css';

export {
  colors,
  brandColors,
  extensionColors,
  fontFamilies,
  typeStyles,
  space,
  radius,
  shadow,
  motif,
} from './tokens.ts';
export type { ColorToken, ThemedColor, TypeStyle } from './tokens.ts';
export { renderTokensCss } from './css.ts';
export { I18nProvider, useI18n } from './i18n-context.tsx';
export { AppShell } from './components/app-shell.tsx';
export type { LinkRenderer, NavItem, ShellUser } from './components/app-shell.tsx';
export { Button, Card, PageHeader, StatusChip } from './components/basics.tsx';
export type { StatusTone } from './components/basics.tsx';
export { AuthLayout, CheckboxGroup, Form, FormMessage, TextArea, TextField } from './components/forms.tsx';
