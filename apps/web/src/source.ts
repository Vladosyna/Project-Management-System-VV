// How a source is shown on a card: its kind, plus the reference when it is one a person can use (a mail id,
// a minutes link). Internal links — the id of the comment or visit an action came from — are not shown.
import type { useI18n } from '@ocs/ui';

const SOURCES = ['manual', 'mail', 'dingtalk', 'meeting', 'visit', 'alert', 'comment'] as const;
type SourceKind = (typeof SOURCES)[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sourceLabel(
  t: ReturnType<typeof useI18n>['t'],
  source: { readonly kind: string; readonly ref: string | null },
): string {
  const kind: SourceKind = (SOURCES as readonly string[]).includes(source.kind)
    ? (source.kind as SourceKind)
    : 'manual';
  const ref = source.ref && !UUID.test(source.ref) ? ` · ${source.ref}` : '';
  return t('actions.source', { source: t(`source.${kind}`), ref });
}
