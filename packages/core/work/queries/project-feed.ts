// work.feed.list — E5 AC4: one feed per project — actions, comments and visit records, newest first, each
// with its source. RLS limits the rows; the feed only merges what the actor may already read.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { workPermissions } from '../permissions.ts';
import { projectFeedRows } from '../repository.ts';

export interface FeedItem {
  readonly kind: 'action' | 'comment' | 'visit';
  readonly id: string;
  /** When it entered OCS (ISO 8601); the feed is ordered by it, newest first. */
  readonly at: string;
  readonly by: string;
  readonly text: string;
  /** Where it came from (E5 AC4): visit, meeting, mail, DingTalk… with a reference when there is one. */
  readonly source: { readonly kind: string; readonly ref: string | null };
  readonly visibility: 'internal' | 'client';
  /** Kind-specific facts the screen shows next to the text. */
  readonly detail: Readonly<Record<string, string | number | boolean | null>>;
}

export const projectFeed = defineQuery({
  name: 'work.feed.list',
  permission: workPermissions.projectFeed,
  input: z.object({
    siteId: z.uuid(),
    /** Paging: items strictly older than this; omit for the newest page. */
    before: z.iso.datetime({ offset: true }).optional(),
    limit: z.int().min(1).max(100).default(50),
  }),
  handle: async (ctx, i): Promise<FeedItem[]> => {
    const before = i.before ? new Date(i.before) : new Date(ctx.now.getTime() + 1);
    const { actions, comments, visits } = await projectFeedRows(ctx.tx, i.siteId, before, i.limit);
    const items: FeedItem[] = [
      ...actions.map((a) => ({
        kind: 'action' as const,
        id: a.id,
        at: a.createdAt.toISOString(),
        by: a.createdBy,
        text: a.title,
        source: { kind: a.sourceKind, ref: a.sourceRef },
        visibility: a.visibility,
        detail: { status: a.status, due: a.due, ownerId: a.ownerId, ownerName: a.ownerName },
      })),
      ...comments.map((c) => ({
        kind: 'comment' as const,
        id: c.id,
        at: c.createdAt.toISOString(),
        by: c.authorId,
        text: c.body,
        source: { kind: c.sourceKind, ref: c.sourceRef },
        visibility: c.visibility,
        detail: { mentions: c.mentions.length },
      })),
      ...visits.map((v) => ({
        kind: 'visit' as const,
        id: v.id,
        at: v.recordedAt.toISOString(),
        by: v.recordedBy,
        text: v.summary,
        source: { kind: 'visit', ref: v.minutesRef },
        visibility: v.visibility,
        detail: {
          type: v.type,
          visitDate: v.visitDate,
          coverage: `${String(v.coverageDone)} of ${String(v.coverageTotal)}`,
          escalate: v.escalate,
        },
      })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, i.limit);
  },
});
