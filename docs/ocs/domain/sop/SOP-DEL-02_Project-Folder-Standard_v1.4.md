**PROJECT FOLDER STANDARD**

*DingTalk Drive: hierarchy, naming, and what goes where — Standards L and S*

|                  |                                                                         |               |                                                             |
|------------------|-------------------------------------------------------------------------|---------------|-------------------------------------------------------------|
| **Document No.** | SOP-DEL-02                                                              | **Version**   | 1.4 — client Site Information Card (SOP-DEL-04) filed in 02 |
| **Owner**        | Overseas Delivery — Vladyslav Yurchyna, Delivery Director               | **Parent**    | SOP-DEL-01 Project Intake & Handover                        |
| **Applies to**   | Everyone who files documents for overseas projects — Sales and Delivery | **Effective** | Together with SOP-DEL-01                                    |

**1. Purpose**

Every project folder has a predictable shape, so anyone can find any document in under a minute — including someone who has never worked on that project. A site with 150 sensors needs structure to manage the volume; a store with five needs speed. This standard therefore has two independent forms, chosen site by site.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>THREE RULES — BOTH STANDARDS</strong></p>
<p><strong>One home.</strong> Every document lives in exactly one place. Link to it; never copy it.</p>
<p><strong>Highest level it applies to.</strong> A document that covers a whole client, country or city lives at that level, not in each project.</p>
<p><strong>Never delete.</strong> Superseded versions go to _Archive. The only exception is in Section 10.</p></td>
</tr>
</tbody>
</table>

**2. Two Standards**

|                    | **STANDARD L — Large**                                                                                                 | **STANDARD S — Small**                                                                |
|--------------------|------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| **Decided by**     | Size of the site: many sensors, or any accompanying work — cabling, network remediation, integration, security review. | Small standard site: up to 20 sensors, mounting and connection only.                  |
| **Project folder** | Lifecycle folders 00–11 (Section 4).                                                                                   | One flat folder, typically 5–7 files; same numbers used as file prefixes (Section 5). |
| **Shared data**    | Client and Country 00_General.                                                                                         | Client / Programme 00_General, including the Site Register (Section 6).               |
| **Client pack**    | CIP-L — the Site Information Card is filed in 02_Site Information; its attachments go into the 02 subfolders.          | CIP-S — the one-page card is filed as slot 02, with photos and layout.                |
| **Handover Card**  | Summary; evidence sits in the subfolders.                                                                              | Commercial and relationship summary; site facts come from the CIP-S card in slot 02.  |
| **Real example**   | Neinver — 17 outlets, up to ~150 sensors each, network works on site.                                                  | PMI — hundreds of IQOS stores, around 5 sensors each.                                 |

**2.1 Which standard applies — decided per site**

**The standard follows the size of the work at one site, not the size of the contract.** 200 stores with 5 sensors each is a large contract made of 200 Standard S sites. 17 outlets with 150 sensors each are 17 Standard L projects.

**Standard S** applies when all three are true for the site:

> • up to 20 sensors;
>
> • mounting and connection only, to the client's or VionVision's standard design, in one or two visits;
>
> • no accompanying work: no new cabling or network remediation by VionVision, no custom integration or API development, no client security review.

**Standard L** applies to everything else. When in doubt, L.

> • **Who decides:** Sales proposes on submission; the Delivery Director confirms at the intake review and records it in the Handover Card, Section 11. The client pack (CIP-L / CIP-S, SOP-DEL-04) always carries the same letter.
>
> • **Upgrade S → L:** when a site turns out to need accompanying work, or grows, the PM creates the L folders and drops each file into the folder with the same number, names unchanged. There is no downgrade from L to S.
>
> • **Mixed clients:** one client can have L and S sites side by side. Client and Country levels are the same for both.

**3. Hierarchy**

The hierarchy lives in the existing DingTalk team space. Existing client and country folders keep their current names (小米海外, 「Portugal」 and so on); new folders follow this standard.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p>0交付中心项目文档 / 3-海外连锁项目资料归档/ <em>root</em></p>
<p>├── _TEMPLATE-L/ <em>copy for a Standard L project</em></p>
<p>├── _TEMPLATE-S/ <em>copy for a Standard S site</em></p>
<p>├── _Intake Register <em>Delivery Director</em></p>
<p>└── Neinver/ <em>1 · CLIENT</em></p>
<p>├── 00_General/</p>
<p>└── Spain/ <em>2 · COUNTRY</em></p>
<p>├── 00_General/</p>
<p>└── Madrid/ <em>3 · CITY — Standard L only</em></p>
<p>└── NEINVER-ES-MAD-001 Las Rozas The Style Outlets/ <em>4 · PROJECT</em></p></td>
</tr>
</tbody>
</table>

| **Level**              | **Folder name**                                                | **What lives here**                                                                                                                                                              | **Example**                                                               |
|------------------------|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| **Root**               | DingTalk team space 0交付中心项目文档 / 3-海外连锁项目资料归档 | \_TEMPLATE-L, \_TEMPLATE-S, \_Intake Register and client folders. Nothing else.                                                                                                  | —                                                                         |
| **1 · Client**         | Client name as in the contract, short form                     | 00_General: master / framework agreement, NDA, DPA and PIA, client-wide contacts and communication rules, security standards, installation guidebook, Site Register (Section 6). | Neinver, PMI                                                              |
| **1a · Programme**     | Optional — only when the client runs separate programmes       | 00_General: programme SOW, trackers, timeline. The client's own site grouping may sit below it.                                                                                  | New Store Deployment / Boutique                                           |
| **2 · Country**        | English name                                                   | 00_General: local entity, local installer and partner agreements, country regulations and permits, country contacts and rollout schedule.                                        | Spain, Portugal                                                           |
| **3 · City**           | Standard L only; local name in Latin script                    | Standard L project folders. Standard S sites sit directly under Country — the Project ID carries the city.                                                                       | Madrid                                                                    |
| **4 · Project / Site** | PROJECT-ID Site name                                           | Everything specific to one site — Section 4 (L) or Section 5 (S).                                                                                                                | NEINVER-ES-MAD-001 Las Rozas The Style Outlets; PMI-PT-LIS-001 Campo Novo |

**Project ID: CLIENT-CC-CITY-NNN** — client short code (up to 8 letters), ISO country code, 3-letter city code (IATA where one exists), running number within that client and city. Same for both standards, so a Standard S site is still traceable to its city without a City folder.

**4. Standard L — Project Folder**

The folders follow the delivery lifecycle, in the order the work happens, as the delivery team already organises Neinver. The difference: phases sit inside each site folder, not at country level, so everything about one site is in one place. Folders are fixed — do not rename them and do not add folders at project root. Subfolders are allowed one level down when volume needs it.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p>NEINVER-ES-MAD-001 Las Rozas The Style Outlets/</p>
<p>├── 00_Handover Card <em>entry point — filled by Sales</em></p>
<p>├── 01_Commercial/</p>
<p>├── 02_Site Information/ <em>everything known before going on site</em></p>
<p>│ ├── Access &amp; Communication Rules/</p>
<p>│ ├── Contacts/</p>
<p>│ ├── Drawings &amp; Design/</p>
<p>│ ├── Network &amp; Security/</p>
<p>│ └── Requirements/</p>
<p>├── 03_Site Visits/</p>
<p>├── 04_Installation Plan/</p>
<p>├── 05_Stock/</p>
<p>├── 06_Installation/</p>
<p>├── 07_Commissioning &amp; Testing/</p>
<p>├── 08_Client Handover/</p>
<p>├── 09_Operation/</p>
<p>├── 10_Project Management/ <em>across all phases</em></p>
<p>├── 11_Internal Notes/ <em>restricted</em></p>
<p>└── _Archive/</p></td>
</tr>
</tbody>
</table>

| **Folder**                                                                                  | **What goes in**                                                                                                                                | **Files it**   |
|---------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|----------------|
| **Before site work — filled by Sales at handover (SOP-DEL-01), kept current by both sides** |                                                                                                                                                 |                |
| **00_Handover Card**                                                                        | The one-document summary of the project (SOP-DEL-01, Annex B).                                                                                  | Sales          |
| **01_Commercial**                                                                           | Contract / PO / SOW, quotation, bill of quantities, warranty and SLA terms, change orders.                                                      | Sales          |
| **02_Site Information**                                                                     | The client's Site Information Card (CIP-L, SOP-DEL-04), current version at the folder root; superseded versions to \_Archive.                   | Sales, then PM |
| **02 / Contacts**                                                                           | Stakeholder map, client org charts, contact lists. Business details only.                                                                       | Sales, then PM |
| **02 / Requirements**                                                                       | Client's KPI and function list, reporting and account requirements, accuracy expectations, gap list.                                            | Sales          |
| **02 / Drawings & Design**                                                                  | Floor plans (DWG + PDF), point design with revision history and editable source files.                                                          | Sales, then PM |
| **02 / Network & Security**                                                                 | Network baseline, switch-access process, VLAN / DHCP, ports, MAC registration; DPA / PIA / InfoSec answers.                                     | Sales, then PM |
| **02 / Access & Communication Rules**                                                       | Working windows, access procedure, permits, advance-notice list; language, contact hours, CC rules.                                             | Sales, then PM |
| **Delivery phases — owned by Delivery from acceptance of the handover**                     |                                                                                                                                                 |                |
| **03_Site Visits**                                                                          | Survey and visit reports with photos, one file per visit.                                                                                       | PM, engineers  |
| **04_Installation Plan**                                                                    | Implementation plan, schedule, installer quotes and orders, point table for installers.                                                         | PM             |
| **05_Stock**                                                                                | Stock count, shipping preparation, serial numbers allocated to the site.                                                                        | PM             |
| **06_Installation**                                                                         | Installer work reports, photos, device list with SN / MAC, construction acceptance.                                                             | PM, engineers  |
| **07_Commissioning & Testing**                                                              | Platform setup records, configuration change log, debug point table, accuracy test data and recordings. No passwords.                           | PM, engineers  |
| **08_Client Handover**                                                                      | Only issued or signed versions of what the client receives: ATR, EHL, PCS, as-built drawings, point table, training sign-in, acceptance report. | PM             |
| **09_Operation**                                                                            | After acceptance: maintenance and support visits, tickets, changes to live devices.                                                             | PM, support    |
| **Across all phases**                                                                       |                                                                                                                                                 |                |
| **10_Project Management**                                                                   | Minutes (DingTalk Action Record), weekly reports, issue log, decisive emails and chat decisions exported.                                       | PM             |
| **11_Internal Notes**                                                                       | Verbal commitments, concessions, relationship map, history. Restricted access.                                                                  | Sales, then PM |
| **\_Archive**                                                                               | Every superseded version. Nothing is deleted.                                                                                                   | Anyone         |

**4.1 Moving from the current phase layout**

Numbers 02–06 are the same as in the phase folders the team already uses. Programme-wide files (point-design versions, centre drawings, rollout plan) move up to Client / 00_General; POC history to Client / 00_General / \_Archive.

| **Current folder**                  | **Standard L**                           | **Note**                                                       |
|-------------------------------------|------------------------------------------|----------------------------------------------------------------|
| —                                   | 01_Commercial                            | Contracts and POs were kept outside the phase folders.         |
| \[2\] 前期信息收集 Site information | 02_Site Information                      | Same number.                                                   |
| \[3\] 勘场 site visit               | 03_Site Visits                           | Same number.                                                   |
| \[4\] 实施计划 installation plans   | 04_Installation Plan                     | Same number.                                                   |
| \[5\] 库存管理 stock management     | 05_Stock                                 | Same number.                                                   |
| \[6\] 实施交付 Installation         | 06_Installation                          | Same number; test files move to 07.                            |
| —                                   | 07_Commissioning & Testing               | New.                                                           |
| —                                   | 08_Client Handover                       | New — the acceptance documents had no home.                    |
| \[7\] 后期运维 Operation            | 09_Operation                             | Moves from 7 to 9: testing and handover come before operation. |
| —                                   | 10_Project Management, 11_Internal Notes | New.                                                           |

**5. Standard S — Site Folder**

One flat folder per site, no subfolders except \_Archive when a file is superseded. Every file starts with a slot number, and the numbers are the same as the Standard L folders — 06 means installation in both. A small site simply skips the phases it does not need and uses files instead of folders. One slot can hold several files, and the client's original file name can follow the prefix. PMI boutique folders already hold a median of five files per store — Standard S formalises that and adds the installation and acceptance records the store folders checked on 29 September did not have.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p>PMI-PT-LIS-001 Campo Novo/ <em>one flat folder</em></p>
<p>├── 00_Handover-Card <em>SOP-DEL-01 Annex B — the main document</em></p>
<p>├── 01_PO-5701732764.pdf <em>client PO</em></p>
<p>├── 01_Quotation-VionVision.pdf <em>our quotation</em></p>
<p>├── 02_Site-Information-Card_v1.docx <em>CIP-S, returned by the client</em></p>
<p>├── 02_Store-Layout-BTQ-160_VER02.pdf <em>client drawing, original name kept</em></p>
<p>├── 02_Solution-Proposal.pdf <em>our camera design</em></p>
<p>├── 06_Installation-Record.pdf <em>date, installer, SN / MAC, photos after</em></p>
<p>└── 08_Acceptance.pdf <em>test result, client sign-off</em></p></td>
</tr>
</tbody>
</table>

| **Slot**                       | **What goes in**                                                                                                                                                      | **Required** |
|--------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| **00 Handover Card**           | The Handover Card, filled in full: commercial terms, relationship-level contacts, communication rules, gap list, open items.                                          | Mandatory    |
| **01 Commercial**              | Client PO or order for this site; our quotation; installer quote for this site. A master agreement stays in 00_General — the card gives its reference.                | Mandatory    |
| **02 Site Information**        | Site Information Card (CIP-S) returned by the client, with photos; client store layout or DD set; our solution proposal / camera design; survey photos; access rules. | Mandatory    |
| **06 Installation**            | Installation date, installer, device list with SN and MAC, photos after installation, configuration notes. No passwords.                                              | Mandatory    |
| **08 Client Handover**         | Test or accuracy check result and the client's sign-off (signed scan, or acceptance email exported as PDF).                                                           | Mandatory    |
| **09 Operation**               | Tickets and support visits after acceptance.                                                                                                                          | If any       |
| **10 Correspondence & Issues** | Emails and chat decisions that changed scope, dates or terms; short issue log.                                                                                        | If any       |

**Restricted notes.** A Standard S folder has no restricted area. Verbal commitments and relationship notes go to Client / 00_General / \_Internal Notes, with the same restricted access as 11_Internal Notes.

**6. Shared Folders and Site Register — the PMI Model**

For clients with many small sites, the programme is managed one level up: what is common to all sites sits in the client's or programme's 00_General, so each site folder stays small. The PMI folder in the team space already works this way — trackers at programme level, flat store folders of about five files; the tree below shows it arranged to this standard.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p>PMI/ <em>1 · CLIENT</em></p>
<p>├── 00_General/ <em>master agreement, guidebook, Site Register, _Internal Notes</em></p>
<p>└── Deployment/</p>
<p>├── Transition Deployment/ <em>1a · PROGRAMME</em></p>
<p>│ ├── 00_General/ <em>Local Partner Tracker, Store Info &amp; Timeline, Missing Information</em></p>
<p>│ └── Lithuania/ … <em>2 · COUNTRY → Standard S sites</em></p>
<p>└── New Store Deployment/ <em>1a · PROGRAMME</em></p>
<p>└── Boutique/ <em>client's own grouping (Boutique / Islands)</em></p>
<p>└── Portugal/ <em>2 · COUNTRY</em></p>
<p>├── 00_General/ <em>local installer agreement, country contacts</em></p>
<p>└── PMI-PT-LIS-001 Campo Novo/ <em>Standard S site folder</em></p></td>
</tr>
</tbody>
</table>

**6.1 Site Register — one sheet per client or programme**

| **Column**                             | **Content**                                   |
|----------------------------------------|-----------------------------------------------|
| **Project ID**                         | Link to the project folder                    |
| **Country / City / Site**              | Site name and full address                    |
| **Devices**                            | Model × quantity                              |
| **Planned / actual installation date** | Both, so slips are visible                    |
| **Installer**                          | Company and technician                        |
| **Status**                             | Planned · Installed · Accepted · Issue        |
| **Acceptance date**                    | Date of client sign-off                       |
| **PM**                                 | Responsible project manager                   |
| **Notes**                              | One line — anything the next person must know |

The Site Register answers "what is installed where, and when" for the whole client in one place. Where a tracker already exists — PMI's Transition Deployment trackers — it is extended with these columns rather than replaced. The PM updates it on the day of installation and on the day of acceptance. Standard L projects of the same client also get a row.

**7. Where Does It Go?**

| **Document**                                       | **Standard L**                    | **Standard S**                                                      |
|----------------------------------------------------|-----------------------------------|---------------------------------------------------------------------|
| Master agreement, NDA, DPA, PIA                    | Client / 00_General               | Client / 00_General                                                 |
| Installation guidebook, store types                | Client / 00_General               | Client or Programme / 00_General                                    |
| Installer framework agreement for one country      | Country / 00_General              | Country / 00_General                                                |
| All sites with their installation dates            | Site Register                     | Site Register                                                       |
| Signed PO for one site; change order               | 01_Commercial (+ card change log) | 01 (+ card change log)                                              |
| Site Information Card (CIP) returned by the client | 02_Site Information (root)        | 02                                                                  |
| Client's KPI list                                  | 02 / Requirements                 | Client / 00_General if client-wide; else attached to the card in 02 |
| Floor plan, point design                           | 02 / Drawings & Design            | 02                                                                  |
| Access rules, permits                              | 02 / Access & Communication Rules | 02                                                                  |
| Site survey or visit report                        | 03_Site Visits                    | 02 (survey) or 06 (installation visit)                              |
| Installation schedule                              | 04_Installation Plan              | Site Register                                                       |
| Stock count, shipping list                         | 05_Stock                          | Client or Programme / 00_General                                    |
| Device list with SN / MAC                          | 06_Installation                   | 06                                                                  |
| Accuracy test data                                 | 07_Commissioning & Testing        | 08                                                                  |
| Document issued to the client, signed acceptance   | 08_Client Handover                | 08                                                                  |
| Maintenance ticket after acceptance                | 09_Operation                      | 09                                                                  |
| Email or chat message with a decision; minutes     | 10_Project Management             | 10                                                                  |
| Promise made to the client at a dinner             | 11_Internal Notes                 | Client / 00_General / \_Internal Notes                              |
| Switch password, platform login                    | Nowhere — record who holds it     | Nowhere — record who holds it                                       |

**8. File Naming**

**Working files (L): YYYY-MM-DD_Description_vN.ext** — e.g. 2026-09-11_Switch-Inventory-Las-Rozas_v2.xlsx.

**Standard S files:** slot number first, then description or the client's original name — e.g. 01_PO-5701732764.pdf, 06_Installation-Record_v2.pdf.

**Documents issued to the client: PROJECT-ID_DOC-CODE_Title.ext** — e.g. NEINVER-ES-MAD-001_ATR-01_Accuracy-Test-Report.pdf. Signed scans add \_signed.

> • English, hyphens inside the description, underscores between parts. Dates always ISO (YYYY-MM-DD).
>
> • No "final", "new", "latest" or "copy" in a file name. The version number and the folder say which file is current.

**9. Versions and Access**

> • **One current version in place.** When a new version is saved, the previous one moves to \_Archive with its version number intact.
>
> • **Standard L:** drafts stay in the phase folders 03–07; 08_Client Handover holds only what the client has actually received.
>
> • **Access.** Sales Owner, Sales Lead, Delivery Director and assigned PM: edit. Rest of Sales and Delivery: view. 11_Internal Notes and \_Internal Notes: those four only.
>
> • **No external access to project folders.** Clients, installers and partners receive individual files or file links, never a folder.

**10. Never Store**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>DO NOT PUT INTO ANY PROJECT FOLDER</strong></p>
<p><strong>Passwords, tokens, API keys, logins.</strong> Record who holds them, not the values.</p>
<p><strong>Installers' ID documents requested for site access.</strong> Send them straight to the client; do not keep copies.</p>
<p><strong>Personal data beyond business contact details.</strong></p>
<p><strong>Whole chat histories.</strong> Only the messages that record a decision.</p>
<p><strong>Exception to "never delete":</strong> accuracy-test video and images are deleted once the client has accepted the results, in line with the privacy commitment in our accuracy-verification methodology.</p></td>
</tr>
</tbody>
</table>

**11. Keeping It Current**

> • **At handover:** Sales fills 00, 01, 02 and 11 (L) or slots 00–02 (S), per SOP-DEL-01.
>
> • **During delivery:** the PM files phase by phase into 03–07 — site visit reports the same day, minutes into 10 within 24 hours. Standard S: the 06 file and the Site Register on the day of installation. After acceptance, maintenance goes into 09.
>
> • **New contacts, commitments, relationship changes:** whoever learns them files them the same week, whether Sales or Delivery.
>
> • **At project close:** the Delivery Director checks 08 (both standards) and the Site Register status "Accepted" before the project is closed.

**Sign-off**

|                                                |                                                |                                                |
|------------------------------------------------|------------------------------------------------|------------------------------------------------|
| Prepared — Overseas Delivery                   | Agreed — Sales                                 | Approved                                       |
| Vladyslav Yurchyna, Delivery Director          | Alex                                           | Hai Tao                                        |
| Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_    | Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_    | Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_    |
| Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |
