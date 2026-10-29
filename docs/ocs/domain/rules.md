# Alert and validation rules R1–R23

Levels: **P0** same day · **P1** within 2 working days · **P2** within the week. Every hit has an owner, a due time and a handling log. "Block" means the save is refused with the clause shown, not an alert. Working days use the CN/EU calendars of the people involved.

Working calendars (`packages/core/calendar`): **CN** from the State Council notice per year (2026 loaded; a year without the official notice throws instead of guessing — add 2027 when published, usually November); **ES, DE, PT, GB** nationwide public holidays computed from fixed dates and Easter (regional holidays not yet included). Each rule config names whose calendar applies.

| # | Rule | Fires when | Level | Phase |
|---|---|---|---|---|
| R1 | Shipment without SN / MAC | Block at save | P0 | V1.1 |
| R2 | Not received 3 days after ETA | In transit and today > ETA + 3 | P1 | V1.1 |
| R3 | Installed, not calibrated after 7 days | Installed, no calibration record | P1 | V1.1 |
| R4 | Site late against plan | Actual completion > planned | P2 | V1.1 |
| R5 | Invoice-ready, no invoice | No invoice 5 working days after acceptance gate | P1 | V1 |
| R6 | Duplicate SN / MAC | Block at save: same SN or MAC in two active records | P0 | V1 |
| R7 | Site Information Card missing | Incomplete 10 calendar days after request (SOP-DEL-04) | P1 | V1 |
| R8 | Installation date not agreed | Approved, no date 20 days before planned installation (template-configurable) | P1 | V1 |
| R9 | Readiness / go-no-go not passed | ≤ configured working days to installation (PMI template: D−2), readiness not confirmed | P0 | V1 |
| R10 | Calibration without written DPIA | Calibration requested, DPIA evidence missing | P0 | V1.1 |
| R11 | Calibration access about to expire | < 6 h of 48-hour access left, not done | P1 | V1.1 |
| R12 | Quote ≠ design | Quoted sensor count differs from current design | P0 | V1 |
| R13 | Site in two POs | Same site in more than one open PO | P0 | V1 |
| R14 | Installed without PO | Installation recorded, no PO linked | P0 | V1 |
| R15 | Sensor offline after go-live | Offline > 24 h (device platform) | P1 | Jan |
| R16 | Partner update overdue | No partner update 48 h after installation day | P2 | V1.1 |
| R17 | Case not triaged | No owner after 4 working hours (P0) / 1 working day (others) | P0 | V1 |
| R18 | Work item without ETA | No ETA 2 working days after acceptance or assignment | P1 | V1 |
| R19 | ETA passed | Today > ETA, not done; delivery owner notified on second slip | P1 | V1 |
| R20 | Client update overdue | Client-visible case without update: P0 daily, P1 twice a week, P2 weekly | P1 | V1 |
| R21 | Conflicting answers | Two different answers to the same question (AI check) | P1 | Jan |
| R22 | Change to live devices without client notice | Firmware / configuration push with no client-notice record — block (Change-management SOP) | P0 | V1.1 |
| R23 | Message not linked | Inbox message untouched for 1 working day | P2 | V1 |

Intake (SOP-DEL-01) rules — implemented as validations, not alerts:

| Rule | Clause |
|---|---|
| Blank mandatory item → submission refused; N/A needs a reason | §6, step 2 |
| Blocking items A1, A4, A6, C2, D1, F1 cannot be conditions | §8 |
| Condition deadline ≤ 5 working days; expiry → P1 alert to Sales owner + Delivery Director | §8 |
| Conditional Start only by permission holder (Hai Tao), with missing items + deadline ≤ 5 working days | §9 |
| Dispute → decision due in 2 working days; work does not start while open | §9 |
| Group F (verbal commitments etc.) only in restricted notes | §5 |
| Active projects at effective date: handover folder within 10 working days | §11 |

Site rules (SOP-DEL-04): no installation date before the card is complete; go/no-go the working day before; acceptance evidence per standard (S form / L certificate). Visit rules (SOP-DEL-03): same-day record (P1 alert next morning if a visit has no record); no new commitments on site → client requests become cases/actions for Sales + Delivery Director.
