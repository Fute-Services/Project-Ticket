const ExcelJS = require('exceljs');
const { FieldValue } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { ok, created, fail } = require('../utils/respond');

const leadsCollection = db.collection('sales_leads');
const campaignsCollection = db.collection('sales_campaigns');
// Single-doc collection, same shape as Super Admin's system_config — one
// settings record, not one per something, so a fixed doc id is simplest.
const settingsDoc = db.collection('sales_settings').doc('config');

const PRIORITY_VALUES = ['Hot', 'Warm', 'Cold'];
// Same enum-not-freetext decision already made for Candidates.rejectionReason.
const LOST_REASON_VALUES = [
  'Budget Mismatch', 'Wrong Timing', 'Chose a Competitor', 'No Longer Interested',
  'Invalid Lead', 'Unresponsive', 'Other',
];

// sales_leads runs well past the shared UNPAGINATED_READ_LIMIT (200) — the
// real Bangalore import alone produces ~311 leads, and this is meant to
// grow with future city lists. A dedicated, still-bounded cap instead of
// reusing the shared constant (which every other HR-desk resource also
// uses and shouldn't have to grow just for this one collection).
const SALES_LEADS_READ_LIMIT = 3000;

const STATUS_VALUES = [
  'Yet to be Called', 'Contacted', 'Did Not Pick', 'Invalid', 'Not Interested',
  'Details Shared', 'Requested Call Back', 'Meeting Arranged', 'Proposal', 'Converted', 'Lost',
];

// Added for the Marketing Master Sheet import (docs/SALES_FILTERS_IMPLEMENTATION_PLAN.md)
// — a multi-contact-per-company, multi-channel outreach tracker, on top of
// the single-contact-per-company Bangalore-list leads this desk already has.
const COUNTRY_VALUES = ['India', 'Australia'];
const DESIGNATION_LEVEL_VALUES = ['Decision Maker', 'Influencer', 'Other'];
const EMAIL_VERIFIED_VALUES = ['Valid', 'Invalid', 'Unknown'];
const PHONE_VERIFIED_VALUES = ['Correct', 'Wrong', 'Unknown'];
const EMAIL_CAMPAIGN_VALUES = ['Not Sent', 'Sent', 'Both Done', 'Got Response', 'Bounced'];
const WHATSAPP_CAMPAIGN_VALUES = ['Not Started', 'Going On', 'Done', 'No Response'];
const LINKEDIN_CAMPAIGN_VALUES = ['Not Started', '1st Msg Sent', 'Follow-up Done'];
const LINKEDIN_CONNECTION_VALUES = ['Not Sent', 'Sent', 'Accepted', 'Already Connected'];

function serializeDoc(data) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value && typeof value.toDate === 'function' ? value.toDate().toISOString() : value;
  }
  return out;
}

// GET /api/sales-desk/leads
async function listLeads(req, res) {
  const snap = await leadsCollection.limit(SALES_LEADS_READ_LIMIT).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
  rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  ok(res, rows);
}

const EDITABLE_FIELDS = [
  'companyName', 'contactTitle', 'contactName', 'designation',
  'address1', 'address2', 'city', 'pin', 'state', 'phone', 'mobile', 'email',
  'status', 'assignedTo', 'comments', 'lastCalledDate', 'nextCallDate',
  'meetingDate', 'meetingNotes', 'source', 'importRowNo', 'importFlag',
  'dealValue', 'priority', 'lostReason',
  // Marketing Master Sheet fields (see docs/SALES_FILTERS_IMPLEMENTATION_PLAN.md)
  'country', 'designationLevel', 'emailVerified', 'phoneVerified',
  'emailCampaignStatus', 'whatsappCampaignStatus', 'linkedinCampaignStatus',
  'linkedinConnectionStatus', 'leftOrganisation', 'nextAction', 'lastContactedDate',
];

// POST /api/sales-desk/leads
async function createLead(req, res) {
  if (!req.body.companyName) return fail(res, { status: 400, message: 'companyName is required', code: 'VALIDATION_ERROR' });
  const docData = {
    status: 'Yet to be Called',
    priority: 'Warm',
    dealValue: 0,
    callLog: [],
    created_at: new Date().toISOString(),
    lastUpdatedBy: req.user.full_name,
  };
  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) docData[key] = req.body[key];
  }
  const docRef = await leadsCollection.add(docData);
  created(res, { id: docRef.id, ...serializeDoc(docData) }, 'Lead created');
}

// PATCH /api/sales-desk/leads/:id
async function updateLead(req, res) {
  const { id } = req.params;
  const docRef = leadsCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Lead not found', code: 'NOT_FOUND' });

  const updates = { updated_at: new Date().toISOString(), lastUpdatedBy: req.user.full_name };
  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  await docRef.update(updates);
  ok(res, { id, ...serializeDoc({ ...doc.data(), ...updates }) }, { message: 'Lead updated' });
}

// DELETE /api/sales-desk/leads/:id
async function deleteLead(req, res) {
  const { id } = req.params;
  const docRef = leadsCollection.doc(id);
  if (!(await docRef.get()).exists) return fail(res, { status: 404, message: 'Lead not found', code: 'NOT_FOUND' });
  await docRef.delete();
  ok(res, { id }, { message: 'Lead deleted' });
}

// POST /api/sales-desk/leads/:id/log-call — { outcome, comment?, nextCallDate? }
// The one action Daily Calls/Follow-ups/Meetings all funnel through: records
// a real call event (unlike a plain PATCH, which could silently change
// status from a bulk edit or the import) so Dashboard's "Calls Today" and
// Team Activity counts are counting actual calls, not incidental writes.
async function logCall(req, res) {
  const { id } = req.params;
  const { outcome, comment, nextCallDate } = req.body;
  if (!outcome) return fail(res, { status: 400, message: 'outcome is required', code: 'VALIDATION_ERROR' });

  const docRef = leadsCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Lead not found', code: 'NOT_FOUND' });

  const now = new Date().toISOString();
  const entry = { at: now, by: req.user.full_name, outcome, comment: comment || '' };
  const updates = {
    status: outcome,
    lastCalledDate: now.slice(0, 10),
    updated_at: now,
    lastUpdatedBy: req.user.full_name,
    callLog: FieldValue.arrayUnion(entry),
  };
  if (comment) updates.comments = comment;
  if (nextCallDate !== undefined) updates.nextCallDate = nextCallDate;

  await docRef.update(updates);
  const merged = { ...doc.data(), ...updates, callLog: [...(doc.data().callLog || []), entry] };
  ok(res, { id, ...serializeDoc(merged) }, { message: 'Call logged' });
}

// --- Import from the working Excel file --------------------------------
//
// Frist and Second/Moving-to-sales-team are NOT the same list at two
// stages — verified against the real file (see docs/SALES_DESK_BUILD_PLAN.md):
// only ~67% of Second's companies are also in Frist. So this builds a true
// union keyed on normalized company name, not a one-way overlay.

// Strips legal-entity suffixes and punctuation so "Abrar Investors and
// Developers Private Limited" and "Abrar Investors And Developers Pvt Ltd"
// key together.
function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(private|pvt\.?|limited|ltd\.?|llp|corporation|corp\.?)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// exceljs returns plain strings/numbers for most cells, but a hyperlinked
// cell (every email in this file) comes back as {text, hyperlink} instead —
// and in the Marketing Master Sheet, a hyperlinked cell that also has rich
// text formatting nests one more level: {text: {richText: [...]}, hyperlink}.
// Recursing (rather than a flat `String(v.text)`) is what stops that nested
// case from stringifying to the literal text "[object Object]".
function cellText(v) {
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('').trim();
  if (typeof v === 'object' && 'text' in v) return cellText(v.text);
  if (typeof v === 'object' && 'result' in v) return cellText(v.result);
  return String(v).trim();
}

function headerMap(worksheet) {
  const map = {};
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = cellText(cell.value);
    if (key) map[key] = colNumber;
  });
  return map;
}

function rowValue(row, map, header) {
  const col = map[header];
  return col ? cellText(row.getCell(col).value) : '';
}

// Frist's own earlier round of tracking used short codes, not the full
// status vocabulary Second later settled on.
const FRIST_CODE_TO_STATUS = { DNP: 'Did Not Pick', Positive: 'Contacted', Invalid: 'Invalid', RCB: 'Requested Call Back' };

function normalizeStatus(raw) {
  const s = String(raw || '').trim();
  if (!s) return 'Yet to be Called';
  if (FRIST_CODE_TO_STATUS[s]) return FRIST_CODE_TO_STATUS[s];
  // Both "Not Interested" and "Not interested" appear in the real sheet —
  // fold any casing variant onto the one canonical value.
  if (/^not interested$/i.test(s)) return 'Not Interested';
  return s;
}

function readSheetRows(worksheet, requiredHeader) {
  if (!worksheet) return [];
  const map = headerMap(worksheet);
  if (!map[requiredHeader]) return [];
  const rows = [];
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const name = rowValue(row, map, requiredHeader);
    if (!name) continue; // real sheets have a dimensioned range far longer than the actual data
    rows.push({ row, map });
  }
  return rows;
}

// Parses the workbook and returns { leads, stats } — leads keyed by
// normalized company name, stats for the import summary shown to the user.
function parseWorkbook(workbook) {
  const leads = new Map(); // normalizedName -> lead object

  // 1) Frist — the master list. Every real row becomes a lead.
  const fristRows = readSheetRows(workbook.getWorksheet('Frist'), 'NAME OF THE COMPANY');
  for (const { row, map } of fristRows) {
    const companyName = rowValue(row, map, 'NAME OF THE COMPANY');
    const key = normalizeName(companyName);
    if (!key || leads.has(key)) continue; // first occurrence wins for exact duplicate rows
    leads.set(key, {
      companyName,
      contactTitle: rowValue(row, map, 'Title'),
      contactName: rowValue(row, map, 'NAME OF THE PERSON'),
      designation: rowValue(row, map, 'DESIGNATION'),
      address1: rowValue(row, map, 'ADD1'),
      address2: rowValue(row, map, 'ADD2'),
      city: rowValue(row, map, 'CITY'),
      pin: rowValue(row, map, 'PIN'),
      state: rowValue(row, map, 'STATE'),
      phone: rowValue(row, map, 'TEL(O)'),
      mobile: rowValue(row, map, 'MOBILE'),
      email: rowValue(row, map, 'E-MAIL'),
      status: normalizeStatus(rowValue(row, map, 'Call Status')),
      comments: rowValue(row, map, 'Comments'),
      assignedTo: '',
      lastCalledDate: '',
      nextCallDate: '',
      meetingNotes: '',
      source: 'Bangalore 2026',
      importRowNo: rowValue(row, map, 'Sl. No'),
      importFlag: '',
      priority: 'Warm',
      dealValue: 0,
      callLog: [],
    });
  }

  // 2) Second — overlays tracking onto a matching Frist lead, or creates a
  // new tracking-only lead when the company isn't in Frist at all.
  function overlayTrackingSheet(worksheet) {
    if (!worksheet) return;
    const rows = readSheetRows(worksheet, "Company's Name");
    // The 10th column ("Given to Sales" on Second, unlabeled on Moving to
    // sales team) has no reliable header name on both sheets — read it
    // positionally instead of by header lookup.
    const lastCol = worksheet.getRow(1).cellCount;
    for (const { row, map } of rows) {
      const companyName = rowValue(row, map, "Company's Name");
      const key = normalizeName(companyName);
      if (!key) continue;
      const status = normalizeStatus(rowValue(row, map, 'Status'));
      const assignedTo = rowValue(row, map, 'Assigned to');
      const comments = rowValue(row, map, 'Comment');
      const lastCalledDate = rowValue(row, map, 'Last called Date');
      const nextCallDate = rowValue(row, map, 'Next call Date');
      const importFlag = lastCol ? cellText(row.getCell(lastCol).value) : '';

      if (leads.has(key)) {
        const lead = leads.get(key);
        if (status && status !== 'Yet to be Called') lead.status = status;
        if (assignedTo) lead.assignedTo = assignedTo;
        if (comments) lead.comments = comments;
        if (lastCalledDate) lead.lastCalledDate = lastCalledDate;
        if (nextCallDate) lead.nextCallDate = nextCallDate;
        if (importFlag) lead.importFlag = importFlag;
      } else {
        leads.set(key, {
          companyName,
          contactTitle: '',
          contactName: rowValue(row, map, "Promoter's Name"),
          designation: '',
          address1: '', address2: '', city: '', pin: '', state: '',
          phone: '',
          mobile: rowValue(row, map, 'Mobile No.'),
          email: '',
          status,
          comments,
          assignedTo,
          lastCalledDate,
          nextCallDate,
          meetingNotes: '',
          source: 'Bangalore 2026',
          importRowNo: rowValue(row, map, 'Sl. No.'),
          importFlag,
          priority: 'Warm',
          dealValue: 0,
          callLog: [],
        });
      }
    }
  }
  overlayTrackingSheet(workbook.getWorksheet('Second'));
  // Moving to sales team is fully contained inside Second (verified — every
  // one of its companies already appears there), so it can only ever
  // refine an already-known lead, never introduce a new one.
  overlayTrackingSheet(workbook.getWorksheet('Moving to sales team'));

  return [...leads.values()];
}

// --- Import from the Marketing Master Sheet -----------------------------
//
// A different shape from Frist/Second above: one row per *contact*, several
// contacts per company, spread across up to 5 tabs with overlapping but
// not-identical headers (Sheet10, "marketing 2", "New data added", and an
// "client details Australia" tab included). Detected in importLeads() by
// the presence of a "Company Name" header anywhere in the workbook, since
// there's no single fixed sheet name to key off like "Frist".

// Known typos/variants seen in the real file - fixed by hand rather than
// fuzzy-matched, since a wrong auto-correction silently merges two real
// cities. Extend this map as new variants show up in future re-imports.
const CITY_FIXES = {
  hydarebad: 'Hyderabad',
  amedhabad: 'Ahmedabad',
  gurgaon: 'Gurugram',
  gurugram: 'Gurugram',
  india: '',
  'wadala / thane mumbai': 'Mumbai',
};
function normalizeCity(raw) {
  let s = String(raw || '').trim().replace(/,+$/, '').trim();
  if (!s) return '';
  // A handful of rows have "City, City2" in one cell (data-entry error) -
  // the first one is treated as the primary.
  s = s.split(',')[0].trim();
  const fixed = CITY_FIXES[s.toLowerCase()];
  if (fixed !== undefined) return fixed;
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

const DECISION_MAKER_RE = /\b(ceo|cfo|coo|cmo|cto|md|managing director|founder|chairman|president|owner|promoter|director)\b/i;
const INFLUENCER_RE = /\b(head|vice president|\bvp\b|\bavp\b|general manager|\bgm\b|manager|lead)\b/i;
function designationLevelOf(designation) {
  const d = String(designation || '');
  if (!d) return 'Other';
  if (DECISION_MAKER_RE.test(d)) return 'Decision Maker';
  if (INFLUENCER_RE.test(d)) return 'Influencer';
  return 'Other';
}

function normalizeEmailVerified(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'valid') return 'Valid';
  if (s === 'not valid' || s === 'invalid') return 'Invalid';
  return 'Unknown';
}
function normalizePhoneVerified(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'Unknown';
  if (s.includes('wrong') || s === 'no' || s === 'n') return 'Wrong';
  if (s.includes('correct') || s === 'yes' || s === 'y') return 'Correct';
  return 'Unknown';
}
function normalizeEmailCampaign(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return 'Not Sent';
  if (s.includes("wasn't delivered") || s.includes('not delivered') || s.includes('bounce')) return 'Bounced';
  if (s.includes('got response')) return 'Got Response';
  if (s.includes('both done')) return 'Both Done';
  return 'Sent';
}
function normalizeWhatsappCampaign(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return 'Not Started';
  if (s.includes('not started')) return 'Not Started';
  if (s.includes('done')) return 'Done';
  if (s.includes('going on')) return 'Going On';
  if (s.includes('no response')) return 'No Response';
  return 'Not Started';
}
function normalizeLinkedinCampaign(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return 'Not Started';
  if (s.includes('follow up')) return 'Follow-up Done';
  if (s.includes('msg') || s.includes('camp')) return '1st Msg Sent';
  return 'Not Started';
}
function normalizeLinkedinConnection(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return 'Not Sent';
  if (s.includes('already')) return 'Already Connected';
  if (s.includes('accept')) return 'Accepted';
  if (s.includes('sent')) return 'Sent';
  return 'Not Sent';
}

// "Sale's status" free text -> the existing STATUS_VALUES pipeline, so this
// import lands in the same Directory/Pipeline every other lead already
// uses instead of needing a second parallel status system.
const SALE_STATUS_MAP = {
  'didnt pick up the call': 'Did Not Pick',
  "didn't pick up the call": 'Did Not Pick',
  'no response': 'Did Not Pick',
  'need to take follow up': 'Contacted',
  hot: 'Contacted',
  warm: 'Contacted',
  'not the right person': 'Invalid',
  'meeting done': 'Meeting Arranged',
  'not interested': 'Not Interested',
  'referred someone else': 'Contacted',
  'wrong no.': 'Invalid',
  'wrong no': 'Invalid',
  'target strategically': 'Yet to be Called',
  'ongoing process': 'Contacted',
  'blocked us': 'Lost',
  'marketing team need to handle': 'Yet to be Called',
};
function mapSaleStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  return SALE_STATUS_MAP[s] || 'Yet to be Called';
}

// A handful of the sheet's own "priority" values (e.g. "1st priority") mean
// hot, not a literal Hot/Warm/Cold enum value - anything present maps to
// Hot, nothing present defaults to Warm like every other import path here.
function priorityOf(raw) {
  return String(raw || '').trim() ? 'Hot' : 'Warm';
}

function leftOrganisationOf(...texts) {
  return texts.some((t) => /left (the )?organisation|left organization|left company/i.test(String(t || '')));
}

// Keys a Marketing Master Sheet row by contact, not company - unlike
// Frist/Second (one lead per company), this sheet has several real contacts
// at the same company (e.g. 4 different people at "Mfar"), so keying by
// company name alone would silently collapse them into one lead.
function normalizeContactKey(companyName, contactName, email) {
  const e = String(email || '').trim().toLowerCase();
  if (e) return `email:${e}`;
  return `name:${normalizeName(companyName)}::${normalizeName(contactName)}`;
}

function isMarketingMasterSheet(workbook) {
  return workbook.worksheets.some((ws) => {
    const map = headerMap(ws);
    return Boolean(map['Company Name']);
  });
}

function parseMarketingMasterWorkbook(workbook) {
  const leads = new Map(); // contactKey -> lead object

  for (const worksheet of workbook.worksheets) {
    const map = headerMap(worksheet);
    if (!map['Company Name']) continue; // not one of the contact sheets (e.g. a notes/pivot tab)
    const country = /australia/i.test(worksheet.name) ? 'Australia' : 'India';

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const companyName = rowValue(row, map, 'Company Name');
      const contactName = rowValue(row, map, 'Name');
      if (!companyName && !contactName) continue; // real sheets have a dimensioned range far longer than the actual data

      const email = rowValue(row, map, 'Email ') || rowValue(row, map, 'Email');
      const key = normalizeContactKey(companyName, contactName, email);
      if (leads.has(key)) continue; // first occurrence wins across tabs (e.g. Second-style overlap)

      const designation = rowValue(row, map, 'Designation');
      const whatToDo = rowValue(row, map, 'What to do:');
      const actionToBeTaken = rowValue(row, map, 'Action to be taken');
      const saleStatus = rowValue(row, map, "Sale's status") || rowValue(row, map, 'Client status');

      leads.set(key, {
        companyName: companyName || '(Unknown company)',
        contactName,
        designation,
        city: normalizeCity(rowValue(row, map, 'City')),
        phone: rowValue(row, map, 'Contact number'),
        email,
        status: mapSaleStatus(saleStatus),
        comments: rowValue(row, map, 'REMARKS'),
        assignedTo: rowValue(row, map, 'marketing Head'),
        priority: priorityOf(rowValue(row, map, 'Priority ') || rowValue(row, map, 'Priority')),
        dealValue: 0,
        callLog: [],
        source: 'Marketing Master Sheet',
        country,
        designationLevel: designationLevelOf(designation),
        emailVerified: normalizeEmailVerified(rowValue(row, map, 'Email Status ?') || rowValue(row, map, 'Email Status?')),
        phoneVerified: normalizePhoneVerified(rowValue(row, map, 'Is no. correct ?') || rowValue(row, map, 'Is no. correct?')),
        emailCampaignStatus: normalizeEmailCampaign(rowValue(row, map, 'Email Camp ') || rowValue(row, map, 'Email Camp')),
        whatsappCampaignStatus: normalizeWhatsappCampaign(rowValue(row, map, 'Whatsapp Camp')),
        linkedinCampaignStatus: normalizeLinkedinCampaign(rowValue(row, map, 'Linkedin Camp')),
        linkedinConnectionStatus: normalizeLinkedinConnection(rowValue(row, map, 'Linkedin Connection')),
        leftOrganisation: leftOrganisationOf(whatToDo, actionToBeTaken),
        nextAction: [whatToDo, actionToBeTaken].filter(Boolean).join(' / '),
        lastContactedDate: rowValue(row, map, 'Last Contacted'),
      });
    }
  }

  return [...leads.values()];
}

// POST /api/sales-desk/leads/import — multipart, field name "file"
async function importLeads(req, res) {
  if (!req.file) return fail(res, { status: 400, message: 'No file uploaded', code: 'VALIDATION_ERROR' });

  let workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
  } catch (e) {
    return fail(res, { status: 400, message: 'Could not read that file — is it a valid .xlsx workbook?', code: 'VALIDATION_ERROR' });
  }

  // Two source formats share this one endpoint: the original Bangalore-list
  // Frist/Second/Moving-to-sales-team sheets (one lead per company), and the
  // Marketing Master Sheet (one lead per contact, several per company,
  // spread across up to 5 tabs). Detected by header shape, not filename —
  // see isMarketingMasterSheet() and docs/SALES_FILTERS_IMPLEMENTATION_PLAN.md.
  const isMarketingMaster = isMarketingMasterSheet(workbook);
  const parsedLeads = isMarketingMaster ? parseMarketingMasterWorkbook(workbook) : parseWorkbook(workbook);
  if (parsedLeads.length === 0) {
    return fail(res, {
      status: 400,
      message: isMarketingMaster
        ? 'No contact rows found under "Company Name" in any tab.'
        : 'No leads found — expected a "Frist" or "Second" sheet with company names',
      code: 'VALIDATION_ERROR',
    });
  }

  // Dedupe against what's already in Firestore too, so re-running an
  // import (or importing a future city list with overlap) updates existing
  // leads instead of duplicating them. Keyed by company for the Bangarole-
  // list format (one lead per company); by contact for the Marketing Master
  // Sheet format (several real contacts can share one company).
  const existingSnap = await leadsCollection.limit(SALES_LEADS_READ_LIMIT).get();
  const existingByKey = new Map();
  existingSnap.docs.forEach((d) => {
    const data = d.data();
    const key = isMarketingMaster
      ? normalizeContactKey(data.companyName, data.contactName, data.email)
      : normalizeName(data.companyName);
    if (key) existingByKey.set(key, d);
  });

  let created_ = 0;
  let updated = 0;
  const batchSize = 400; // Firestore batch write limit is 500
  for (let i = 0; i < parsedLeads.length; i += batchSize) {
    const batch = db.batch();
    for (const lead of parsedLeads.slice(i, i + batchSize)) {
      const key = isMarketingMaster
        ? normalizeContactKey(lead.companyName, lead.contactName, lead.email)
        : normalizeName(lead.companyName);
      const existingDoc = existingByKey.get(key);
      if (existingDoc) {
        // Re-importing over an existing lead must never clobber fields the
        // sheet doesn't carry and a rep may have already filled in by hand
        // (deal value, priority, call history) — only the sheet-sourced
        // fields get overwritten.
        const { dealValue, priority, callLog, ...sheetFields } = lead;
        batch.update(existingDoc.ref, { ...sheetFields, updated_at: new Date().toISOString(), lastUpdatedBy: req.user.full_name });
        updated++;
      } else {
        const ref = leadsCollection.doc();
        batch.set(ref, { ...lead, created_at: new Date().toISOString(), lastUpdatedBy: req.user.full_name });
        created_++;
      }
    }
    await batch.commit();
  }

  created(res, { imported: parsedLeads.length, created: created_, updated }, `Imported ${parsedLeads.length} leads (${created_} new, ${updated} updated)`);
}

// GET /api/sales-desk/email-campaign/export — CSV of Name/Title/Contact/Email
async function exportEmailCampaign(req, res) {
  const snap = await leadsCollection.limit(SALES_LEADS_READ_LIMIT).get();
  const rows = snap.docs.map((d) => d.data()).filter((r) => r.email);
  // companyName/contactName are user-entered (manually, or from a future
  // untrusted import) — a value starting with =, +, -, or @ is interpreted
  // as a live formula by Excel/Sheets on open (CSV/formula injection), so
  // it's neutralized with a leading apostrophe before quote-escaping.
  const escapeCsv = (v) => {
    let s = String(v || '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = 'Company,Title,Contact Name,Email\n';
  const body = rows.map((r) => [r.companyName, r.contactTitle, r.contactName, r.email].map(escapeCsv).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sales-email-campaign.csv"');
  res.send(header + body);
}

// --- Settings ------------------------------------------------------------
// GET /api/sales-desk/settings
async function getSettings(req, res) {
  const doc = await settingsDoc.get();
  const defaults = { monthlyRevenueTarget: 0, dailyCallTargetPerRep: 0 };
  ok(res, doc.exists ? { ...defaults, ...serializeDoc(doc.data()) } : defaults);
}

// PATCH /api/sales-desk/settings — { monthlyRevenueTarget?, dailyCallTargetPerRep? }
async function updateSettings(req, res) {
  const updates = { updated_at: new Date().toISOString(), lastUpdatedBy: req.user.full_name };
  if (req.body.monthlyRevenueTarget !== undefined) updates.monthlyRevenueTarget = Number(req.body.monthlyRevenueTarget) || 0;
  if (req.body.dailyCallTargetPerRep !== undefined) updates.dailyCallTargetPerRep = Number(req.body.dailyCallTargetPerRep) || 0;
  await settingsDoc.set(updates, { merge: true });
  const doc = await settingsDoc.get();
  ok(res, serializeDoc(doc.data()), { message: 'Settings updated' });
}

// --- Campaigns -------------------------------------------------------------
// Records only — not a mass-mailer (see docs/SALES_DESK_BUILD_PLAN.md §16).
// The actual send stays the existing email-campaign CSV export; this just
// tracks that a campaign happened, so response rate has something to
// measure against.
async function listCampaigns(req, res) {
  const snap = await campaignsCollection.limit(UNPAGINATED_READ_LIMIT).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...serializeDoc(d.data()) }));
  rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  ok(res, rows);
}

async function createCampaign(req, res) {
  const { name, sourceTag, targetCity } = req.body;
  if (!name) return fail(res, { status: 400, message: 'name is required', code: 'VALIDATION_ERROR' });
  const docData = {
    name,
    sourceTag: sourceTag || '',
    targetCity: targetCity || '',
    sentDate: req.body.sentDate || new Date().toISOString().slice(0, 10),
    createdBy: req.user.full_name,
    created_at: new Date().toISOString(),
  };
  const docRef = await campaignsCollection.add(docData);
  created(res, { id: docRef.id, ...serializeDoc(docData) }, 'Campaign created');
}

async function deleteCampaign(req, res) {
  const { id } = req.params;
  const docRef = campaignsCollection.doc(id);
  if (!(await docRef.get()).exists) return fail(res, { status: 404, message: 'Campaign not found', code: 'NOT_FOUND' });
  await docRef.delete();
  ok(res, { id }, { message: 'Campaign deleted' });
}

module.exports = {
  STATUS_VALUES,
  PRIORITY_VALUES,
  LOST_REASON_VALUES,
  COUNTRY_VALUES,
  DESIGNATION_LEVEL_VALUES,
  EMAIL_VERIFIED_VALUES,
  PHONE_VERIFIED_VALUES,
  EMAIL_CAMPAIGN_VALUES,
  WHATSAPP_CAMPAIGN_VALUES,
  LINKEDIN_CAMPAIGN_VALUES,
  LINKEDIN_CONNECTION_VALUES,
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  logCall,
  importLeads,
  exportEmailCampaign,
  getSettings,
  updateSettings,
  listCampaigns,
  createCampaign,
  deleteCampaign,
  // Exported for testing/debugging the import mapping against a real file
  // without going through the HTTP layer — not used by any route.
  parseWorkbook,
  normalizeName,
  parseMarketingMasterWorkbook,
  isMarketingMasterSheet,
  normalizeContactKey,
  normalizeCity,
};
