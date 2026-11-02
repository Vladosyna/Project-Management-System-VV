// Handover Card shape (SOP-DEL-01 Annex B, E2 AC1, AC7). Anonymised examples only.
import { describe, expect, it } from 'vitest';
import { HandoverCardContent, IntakeReview } from '../handover-card.ts';

const id = '00000000-0000-4000-8000-000000000001';
const ok = (v: unknown) => HandoverCardContent.safeParse(v).success;

const filled = {
  identification: {
    projectName: 'Client A Madrid store',
    clientLegalEntity: 'Client A S.L.',
    siteAddresses: 'Street 1, Madrid',
    projectType: 'poc',
    salesOwnerId: id,
    folderPack: 'S',
    oaRef: { value: 'OA-0001' },
    folderLink: { na: 'Folder created at acceptance' },
  },
  commercial: { governingContract: { value: 'PO 001 of 1 Oct 2026' }, warrantySupport: { value: '2 years' } },
  stakeholders: [{ role: 'decision_maker', name: 'Person A', email: 'person.a@example.com' }],
  technical: { gapList: { none: true }, pointDesign: { value: 'Rev 3 by Designer A' } },
  internal: {
    verbalCommitments: { recorded: 2 },
    concessions: 'none',
    relationshipMap: { recorded: true },
    relationshipHealth: { level: 'amber', reason: 'Late PO' },
  },
  openItems: { items: [{ question: 'Ceiling height confirmed?', ownerId: id, due: '2026-11-10' }] },
  salesDeclaration: { salesOwner: { signedById: id, signedAt: '2026-11-02T10:00:00Z' } },
};

describe('HandoverCardContent', () => {
  it('accepts a draft at any stage, from empty to filled', () => {
    expect(ok({})).toBe(true);
    expect(ok({ commercial: { exclusions: { value: 'Cabling' } } })).toBe(true);
    expect(ok(filled)).toBe(true);
  });

  it('never accepts a blank field: a value or N/A with the reason (Annex B "How to fill")', () => {
    expect(ok({ commercial: { exclusions: { value: '   ' } } })).toBe(false);
    expect(ok({ commercial: { exclusions: { na: '' } } })).toBe(false);
    expect(ok({ commercial: { exclusions: {} } })).toBe(false);
    expect(ok({ commercial: { exclusions: { value: 'x', na: 'y' } } })).toBe(false);
  });

  it('"nothing to list" is said explicitly, never by an empty list (D1, G1)', () => {
    expect(ok({ technical: { gapList: { items: [] } } })).toBe(false);
    expect(ok({ openItems: { items: [] } })).toBe(false);
    expect(ok({ openItems: { none: true } })).toBe(true);
  });

  it('keeps group F text out of the card: only that it was recorded (E2 AC7)', () => {
    const withText = { ...filled.internal, verbalCommitments: { recorded: 2, text: 'Free extra camera' } };
    expect(ok({ internal: withText })).toBe(false);
    expect(ok({ internal: { verbalCommitmentsText: 'Free extra camera' } })).toBe(false);
    expect(ok({ internal: { concessions: '10% discount' } })).toBe(false);
  });

  it('refuses keys the Annex does not have', () => {
    expect(ok({ notes: 'anything' })).toBe(false);
    expect(ok({ identification: { projectId: 'CLIENTA-ES-MAD-001' } })).toBe(false);
  });
});

describe('IntakeReview (section 11)', () => {
  it('takes a decision with conditions on checklist items and dated deadlines', () => {
    const review = {
      decision: 'accepted_with_conditions',
      folderStandard: 'S',
      conditions: [{ itemCode: 'C3', text: 'Editable point design', deadline: '2026-11-06' }],
    };
    expect(IntakeReview.safeParse(review).success).toBe(true);
    expect(IntakeReview.safeParse({ ...review, decision: 'maybe' }).success).toBe(false);
    const badCode = { ...review, conditions: [{ ...review.conditions[0], itemCode: 'Z9' }] };
    expect(IntakeReview.safeParse(badCode).success).toBe(false);
  });
});
