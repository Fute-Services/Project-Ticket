import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  MapPin,
  FileText,
  Upload,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, Pill, Modal, Field, inputClass, EmptyState } from '../../components/ui';
import { CANDIDATE_STAGES, RESUME_SOURCES, REJECTION_REASONS } from '../../data/hrMockData';
import { candidatesApi } from '../../utils/api';
import { useHrDesk } from '../../context/HrDeskContext';
import { useAuth } from '../../context/AuthContext';
import { ColorSelect } from '../../components/TicketsQueueView';

const REJECTABLE_STAGES = ['Rejected', 'Offer Declined'];

function Detail({ label, value, wrap }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{label}</div>
      <div className={`text-sm text-foreground font-medium ${wrap ? 'break-words' : 'truncate'}`}>{value || value === 0 ? value : '-'}</div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">{title}</div>
      <div className="grid grid-cols-4 gap-x-4 gap-y-3">{children}</div>
    </div>
  );
}

// Compact edit-mode field - same footprint as Detail (not the roomier
// shared `Field`/`inputClass`, whose gap-1.5 + h-9 input roughly doubles
// each row's height) so toggling a candidate into edit mode doesn't blow
// the popup past no-scroll height.
const compactInputClass =
  'w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
function EF({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mb-0.5">{label}</div>
      {children}
    </div>
  );
}

// Older/seeded candidate rows may already carry the unit in the raw value
// ("6 yrs", "24 LPA") - strip it before re-appending so the read view never
// doubles up into "6 yrs yrs" / "₹24 LPA LPA".
const yrs = (v) => (v || v === 0 ? `${String(v).replace(/\s*yrs?\.?$/i, '')} yrs` : null);
const lpa = (v) => (v || v === 0 ? `₹${String(v).replace(/^₹\s*/, '').replace(/\s*lpa$/i, '')} LPA` : null);

const EMPTY_UPLOAD_FORM = {
  name: '', email: '', phone: '', appliedFor: '', location: '',
  experience: '', currentCTC: '', expectedSalary: '', noticePeriod: '',
  skills: '', education: '', currentCompany: '', portfolio: '',
};

const WORK_MODE_OPTIONS = ['Work From Home', 'Office', 'Hybrid'];
const SHORTLISTED_OPTIONS = ['Pending', 'Yes', 'No'];
const HR_SCREENING_OPTIONS = ['Pending', 'Shortlisted', 'On Hold', 'Rejected'];
const TECHNICAL_ROUND_STATUS_OPTIONS = ['Pending', 'Pass', 'Fail', 'No Show'];
const FINAL_DECISION_OPTIONS = ['Pending', 'Selected', 'Rejected', 'On Hold'];

// Full tracking-sheet field set (Resume Date, Relevant Exp., Primary/
// Secondary Skills, Resume link, HR Screening Status, interviewer feedback,
// Shortlisted?, Technical Round date/status, Final Decision, Work Mode,
// Remarks, Last Follow-up Date, Output Path) - matches the columns HR
// already tracks in their spreadsheet, so the candidate popup can fully
// replace it instead of just showing a read-only subset.
const EMPTY_CANDIDATE_FORM = {
  name: '', email: '', phone: '', location: '', skills: '', secondarySkills: '',
  experience: '', relevantExperience: '', education: '', currentCompany: '',
  currentCTC: '', expectedSalary: '', noticePeriod: '', portfolio: '',
  resumeDate: '', resumeLink: '',
  hrScreeningStatus: 'Pending', payelFeedback: '', shortlisted: 'Pending',
  technicalRoundDate: '', technicalRoundStatus: 'Pending', finalDecision: 'Pending',
  workMode: 'Office', remarks: '', lastFollowUpDate: '', outputPath: '',
};

export default function Candidates() {
  const { user } = useAuth();
  const { candidates, setCandidates } = useHrDesk();
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD_FORM);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [candidateForm, setCandidateForm] = useState(EMPTY_CANDIDATE_FORM);
  const [candidateSaving, setCandidateSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function syncCandidateForm(c) {
    setCandidateForm({
      ...EMPTY_CANDIDATE_FORM,
      ...Object.fromEntries(
        Object.keys(EMPTY_CANDIDATE_FORM).map((key) => [
          key,
          key === 'skills' ? (c.skills || []).join(', ')
            : key === 'secondarySkills' && Array.isArray(c.secondarySkills) ? c.secondarySkills.join(', ')
            : c[key] ?? EMPTY_CANDIDATE_FORM[key],
        ])
      ),
    });
  }

  // Re-sync the editable form whenever a different candidate is opened, so
  // it doesn't keep showing the previous candidate's values.
  useEffect(() => {
    if (!selected) return;
    syncCandidateForm(selected);
    setEditOpen(false);
  }, [selected?.id]);

  function cancelEdit() {
    if (selected) syncCandidateForm(selected);
    setEditOpen(false);
  }

  async function saveCandidateDetails() {
    if (!selected) return;
    setCandidateSaving(true);
    const payload = {
      ...candidateForm,
      skills: candidateForm.skills ? candidateForm.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      secondarySkills: candidateForm.secondarySkills ? candidateForm.secondarySkills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      experience: candidateForm.experience ? Number(candidateForm.experience) : 0,
      relevantExperience: candidateForm.relevantExperience ? Number(candidateForm.relevantExperience) : 0,
      currentCTC: candidateForm.currentCTC ? Number(candidateForm.currentCTC) : null,
      expectedSalary: candidateForm.expectedSalary ? Number(candidateForm.expectedSalary) : null,
    };
    try {
      const { data } = await candidatesApi.update(selected.id, payload);
      setCandidates((rows) => rows.map((c) => (c.id === selected.id ? { ...c, ...data } : c)));
      setSelected((cur) => (cur && cur.id === selected.id ? { ...cur, ...data } : cur));
      toast.success('Candidate details updated');
      setEditOpen(false);
    } catch (e) {
      toast.error('Could not update candidate', { description: e.response?.data?.error || e.message });
    } finally {
      setCandidateSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (stageFilter !== 'All' && c.stage !== stageFilter) return false;
      if (sourceFilter !== 'All' && c.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q)) ||
        c.location.toLowerCase().includes(q) ||
        String(c.experience).toLowerCase().includes(q)
      );
    });
  }, [candidates, query, stageFilter, sourceFilter]);

  function updateStage(id, stage) {
    // Clear a stale rejectionReason from an earlier rejection when a
    // candidate moves back into an active stage - a "Rejected" reason
    // shouldn't linger and display once someone is back in the pipeline.
    const patch = REJECTABLE_STAGES.includes(stage) ? { stage } : { stage, rejectionReason: '' };
    setCandidates((rows) => rows.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s));
    candidatesApi.update(id, patch).catch((e) => console.error('Failed to update candidate stage:', e.message));
  }

  function updateRejectionReason(id, rejectionReason) {
    setCandidates((rows) => rows.map((c) => (c.id === id ? { ...c, rejectionReason } : c)));
    setSelected((s) => (s && s.id === id ? { ...s, rejectionReason } : s));
    candidatesApi
      .update(id, { rejectionReason })
      .catch((e) => console.error('Failed to update rejection reason:', e.message));
  }

  function handleFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadedFile(file);
    setUploadForm({ ...EMPTY_UPLOAD_FORM, name: file.name.replace(/\.(pdf|docx?|txt)$/i, '').replace(/[_-]/g, ' ') });
  }

  async function submitUpload(e) {
    e.preventDefault();
    const payload = {
      name: uploadForm.name,
      email: uploadForm.email,
      phone: uploadForm.phone,
      location: uploadForm.location || 'Not specified',
      skills: uploadForm.skills
        ? uploadForm.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      experience: uploadForm.experience ? Number(uploadForm.experience) : 0,
      education: uploadForm.education || 'Not specified',
      currentCTC: uploadForm.currentCTC ? Number(uploadForm.currentCTC) : null,
      expectedSalary: uploadForm.expectedSalary ? Number(uploadForm.expectedSalary) : null,
      noticePeriod: uploadForm.noticePeriod || 'Not specified',
      currentCompany: uploadForm.currentCompany || 'Not specified',
      portfolio: uploadForm.portfolio || '',
      source: 'Manual Upload',
      stage: 'Applied',
      assignedRecruiter: user?.full_name || 'Unassigned',
      appliedFor: uploadForm.appliedFor || 'Unspecified role',
      appliedOn: new Date().toISOString().slice(0, 10),
      resumeFileName: uploadedFile?.name || '',
    };
    setUploadSubmitting(true);
    try {
      const { data } = await candidatesApi.create(payload);
      setCandidates((rows) => [data, ...rows]);
      setSelected(data);
      // Only clear/close on success - closing unconditionally used to
      // discard the typed-in form (and the user's chosen resume) on any
      // failure, with just a console.error as the only trace.
      setUploadedFile(null);
      setUploadForm(EMPTY_UPLOAD_FORM);
    } catch (err) {
      toast.error('Could not add candidate', { description: err.response?.data?.error || err.message });
    } finally {
      setUploadSubmitting(false);
    }
  }

  return (
    <HrLayout>
      <div className="flex flex-col gap-6 w-full">
        <SectionHeader
          title="Candidate Management (ATS)"
          subtitle={`${filtered.length} of ${candidates.length} candidates`}
          action={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChosen}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <Upload size={14} />
                Upload Resume
              </button>
            </>
          }
        />

        <Card>
          <div className="flex flex-col md:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, skills, experience, location..."
                className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="w-44">
              <ColorSelect
                ariaLabel="Filter candidates by source"
                value={sourceFilter}
                onChange={setSourceFilter}
                options={[{ value: 'All', label: 'All sources' }, ...RESUME_SOURCES.map((s) => ({ value: s, label: s }))]}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            <Pill active={stageFilter === 'All'} onClick={() => setStageFilter('All')}>All Stages</Pill>
            {CANDIDATE_STAGES.map((s) => (
              <Pill key={s} active={stageFilter === s} onClick={() => setStageFilter(s)}>{s}</Pill>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState text="No candidates match these filters." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="text-left p-4 rounded-lg bg-muted border border-border hover:border-muted-foreground/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.appliedFor}</div>
                    </div>
                    <Badge value={c.stage} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <MapPin size={11} /> {c.location} · {c.experience} yrs
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {c.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                        {s}
                      </span>
                    ))}
                  </div>
                  {c.nextInterview && (
                    <div className="text-xs text-primary">
                      Next: {c.nextInterview.type} on {c.nextInterview.date}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setEditOpen(false); }}
        title="Candidate Profile"
        className="max-w-6xl max-h-[88vh] overflow-y-auto"
      >
        {selected && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
              <div className="min-w-0">
                <div className="text-xl font-semibold text-foreground truncate">{selected.name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {selected.appliedFor} · Applied {String(selected.appliedOn || '').slice(0, 10) || 'date not specified'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge value={selected.stage} />
                {editOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveCandidateDetails}
                      disabled={candidateSaving}
                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {candidateSaving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    title="Edit candidate"
                    aria-label="Edit candidate"
                    className="p-1.5 rounded-lg bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xl">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Move Stage</div>
                <ColorSelect
                  value={selected.stage}
                  onChange={(v) => updateStage(selected.id, v)}
                  options={CANDIDATE_STAGES}
                />
              </div>
              {REJECTABLE_STAGES.includes(selected.stage) ? (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Reason</div>
                  <select
                    value={selected.rejectionReason || ''}
                    onChange={(e) => updateRejectionReason(selected.id, e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="">Select a reason</option>
                    {REJECTION_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <Detail label="Assigned Recruiter" value={selected.assignedRecruiter || 'Unassigned'} />
              )}
            </div>

            {selected.nextInterview && (
              <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                Next interview: {selected.nextInterview.type} on {selected.nextInterview.date} with {selected.nextInterview.interviewer}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SectionCard title="Contact">
                {editOpen ? (
                  <>
                    <EF label="Email"><input value={candidateForm.email} onChange={(e) => setCandidateForm((f) => ({ ...f, email: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Contact No."><input value={candidateForm.phone} onChange={(e) => setCandidateForm((f) => ({ ...f, phone: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Location"><input value={candidateForm.location} onChange={(e) => setCandidateForm((f) => ({ ...f, location: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Company"><input value={candidateForm.currentCompany} onChange={(e) => setCandidateForm((f) => ({ ...f, currentCompany: e.target.value }))} className={compactInputClass} /></EF>
                  </>
                ) : (
                  <>
                    <Detail label="Email" value={selected.email} />
                    <Detail label="Contact No." value={selected.phone} />
                    <Detail label="Location" value={selected.location} />
                    <Detail label="Company" value={selected.currentCompany} />
                  </>
                )}
              </SectionCard>

              <SectionCard title="Experience & Skills">
                {editOpen ? (
                  <>
                    <EF label="Total Exp. (yrs)"><input type="number" min="0" step="0.5" value={candidateForm.experience} onChange={(e) => setCandidateForm((f) => ({ ...f, experience: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Relevant Exp. (yrs)"><input type="number" min="0" step="0.5" value={candidateForm.relevantExperience} onChange={(e) => setCandidateForm((f) => ({ ...f, relevantExperience: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Education"><input value={candidateForm.education} onChange={(e) => setCandidateForm((f) => ({ ...f, education: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Work Mode">
                      <select value={candidateForm.workMode} onChange={(e) => setCandidateForm((f) => ({ ...f, workMode: e.target.value }))} className={compactInputClass}>
                        {WORK_MODE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </EF>
                    <div className="col-span-2">
                      <EF label="Primary Skill(s)"><input value={candidateForm.skills} onChange={(e) => setCandidateForm((f) => ({ ...f, skills: e.target.value }))} className={compactInputClass} placeholder="Comma separated" /></EF>
                    </div>
                    <div className="col-span-2">
                      <EF label="Secondary Skills"><input value={candidateForm.secondarySkills} onChange={(e) => setCandidateForm((f) => ({ ...f, secondarySkills: e.target.value }))} className={compactInputClass} placeholder="Comma separated" /></EF>
                    </div>
                  </>
                ) : (
                  <>
                    <Detail label="Total Exp." value={yrs(selected.experience)} />
                    <Detail label="Relevant Exp." value={yrs(selected.relevantExperience)} />
                    <Detail label="Education" value={selected.education} />
                    <Detail label="Work Mode" value={selected.workMode} />
                    <div className="col-span-2">
                      <Detail label="Primary Skill(s)" value={(selected.skills || []).join(', ')} />
                    </div>
                    <div className="col-span-2">
                      <Detail label="Secondary Skills" value={(selected.secondarySkills || []).join(', ')} />
                    </div>
                  </>
                )}
              </SectionCard>

              <SectionCard title="Resume & Compensation">
                {editOpen ? (
                  <>
                    <EF label="Resume Date"><input type="date" value={candidateForm.resumeDate} onChange={(e) => setCandidateForm((f) => ({ ...f, resumeDate: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Current CTC (LPA)"><input type="number" min="0" step="0.5" value={candidateForm.currentCTC} onChange={(e) => setCandidateForm((f) => ({ ...f, currentCTC: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Expected CTC (LPA)"><input type="number" min="0" step="0.5" value={candidateForm.expectedSalary} onChange={(e) => setCandidateForm((f) => ({ ...f, expectedSalary: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Notice Period"><input value={candidateForm.noticePeriod} onChange={(e) => setCandidateForm((f) => ({ ...f, noticePeriod: e.target.value }))} className={compactInputClass} /></EF>
                    <div className="col-span-2">
                      <EF label="Resume (Google Drive link)"><input type="url" value={candidateForm.resumeLink} onChange={(e) => setCandidateForm((f) => ({ ...f, resumeLink: e.target.value }))} className={compactInputClass} placeholder="https://drive.google.com/..." /></EF>
                    </div>
                    <div className="col-span-2">
                      <EF label="Portfolio Link"><input value={candidateForm.portfolio} onChange={(e) => setCandidateForm((f) => ({ ...f, portfolio: e.target.value }))} className={compactInputClass} /></EF>
                    </div>
                  </>
                ) : (
                  <>
                    <Detail label="Source" value={selected.source} />
                    <Detail label="Resume Date" value={selected.resumeDate} />
                    <Detail label="Current CTC" value={lpa(selected.currentCTC)} />
                    <Detail label="Expected CTC" value={lpa(selected.expectedSalary)} />
                    <Detail label="Notice Period" value={selected.noticePeriod} />
                    <div className="col-span-3">
                      <Detail label="Resume (Drive link)" value={selected.resumeLink} wrap />
                    </div>
                    <div className="col-span-4">
                      <Detail label="Portfolio Link" value={selected.portfolio} wrap />
                    </div>
                  </>
                )}
                {selected.resumeFileName && (
                  <div className="col-span-4 flex items-center gap-2 mt-1 p-2 rounded-lg bg-background border border-border text-xs text-muted-foreground">
                    <FileText size={13} className="text-primary shrink-0" />
                    <span className="truncate">{selected.resumeFileName}</span>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Screening & Interview">
                {editOpen ? (
                  <>
                    <EF label="HR Screening Status">
                      <select value={candidateForm.hrScreeningStatus} onChange={(e) => setCandidateForm((f) => ({ ...f, hrScreeningStatus: e.target.value }))} className={compactInputClass}>
                        {HR_SCREENING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </EF>
                    <EF label="Shortlisted?">
                      <select value={candidateForm.shortlisted} onChange={(e) => setCandidateForm((f) => ({ ...f, shortlisted: e.target.value }))} className={compactInputClass}>
                        {SHORTLISTED_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </EF>
                    <EF label="Tech. Round Date"><input type="date" value={candidateForm.technicalRoundDate} onChange={(e) => setCandidateForm((f) => ({ ...f, technicalRoundDate: e.target.value }))} className={compactInputClass} /></EF>
                    <EF label="Tech. Round Status">
                      <select value={candidateForm.technicalRoundStatus} onChange={(e) => setCandidateForm((f) => ({ ...f, technicalRoundStatus: e.target.value }))} className={compactInputClass}>
                        {TECHNICAL_ROUND_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </EF>
                    <EF label="Final Decision">
                      <select value={candidateForm.finalDecision} onChange={(e) => setCandidateForm((f) => ({ ...f, finalDecision: e.target.value }))} className={compactInputClass}>
                        {FINAL_DECISION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </EF>
                    <EF label="Last Follow-up Date"><input type="date" value={candidateForm.lastFollowUpDate} onChange={(e) => setCandidateForm((f) => ({ ...f, lastFollowUpDate: e.target.value }))} className={compactInputClass} /></EF>
                    <div className="col-span-2">
                      <EF label="Output Path"><input value={candidateForm.outputPath} onChange={(e) => setCandidateForm((f) => ({ ...f, outputPath: e.target.value }))} className={compactInputClass} placeholder="e.g. server path or folder" /></EF>
                    </div>
                    <div className="col-span-4">
                      <EF label="Payel Feedback"><input value={candidateForm.payelFeedback} onChange={(e) => setCandidateForm((f) => ({ ...f, payelFeedback: e.target.value }))} className={compactInputClass} /></EF>
                    </div>
                  </>
                ) : (
                  <>
                    <Detail label="HR Screening" value={selected.hrScreeningStatus} />
                    <Detail label="Shortlisted?" value={selected.shortlisted} />
                    <Detail label="Tech. Round Date" value={selected.technicalRoundDate} />
                    <Detail label="Tech. Round Status" value={selected.technicalRoundStatus} />
                    <Detail label="Final Decision" value={selected.finalDecision} />
                    <Detail label="Last Follow-up" value={selected.lastFollowUpDate} />
                    <div className="col-span-2">
                      <Detail label="Output Path" value={selected.outputPath} wrap />
                    </div>
                    <div className="col-span-4">
                      <Detail label="Payel Feedback" value={selected.payelFeedback} wrap />
                    </div>
                  </>
                )}
              </SectionCard>
            </div>

            {editOpen ? (
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <EF label="Remarks">
                  <textarea rows={2} value={candidateForm.remarks} onChange={(e) => setCandidateForm((f) => ({ ...f, remarks: e.target.value }))} className={compactInputClass} />
                </EF>
              </div>
            ) : (
              selected.remarks && (
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <Detail label="Remarks" value={selected.remarks} wrap />
                </div>
              )
            )}

            {selected.lastUpdatedBy && (
              <div className="text-[10px] text-muted-foreground">Last updated by {selected.lastUpdatedBy}</div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!uploadedFile}
        onClose={() => { setUploadedFile(null); setUploadForm(EMPTY_UPLOAD_FORM); }}
        title="Add Candidate from Resume"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={submitUpload} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted border border-border text-xs text-muted-foreground">
            <FileText size={14} className="text-primary" />
            {uploadedFile?.name}
          </div>
          <Field label="Candidate Name">
            <input required value={uploadForm.name} onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
          </Field>
          <div className="columns-2 gap-4 [&>div]:break-inside-avoid [&>div]:mb-3">
            <Field label="Email">
              <input required type="email" value={uploadForm.email} onChange={(e) => setUploadForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Phone">
              <input value={uploadForm.phone} onChange={(e) => setUploadForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Applying For">
              <input required value={uploadForm.appliedFor} onChange={(e) => setUploadForm((f) => ({ ...f, appliedFor: e.target.value }))} className={inputClass} placeholder="e.g. Backend Developer" />
            </Field>
            <Field label="Location">
              <input value={uploadForm.location} onChange={(e) => setUploadForm((f) => ({ ...f, location: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Experience (years)">
              <input type="number" min="0" step="0.5" value={uploadForm.experience} onChange={(e) => setUploadForm((f) => ({ ...f, experience: e.target.value }))} className={inputClass} placeholder="e.g. 3" />
            </Field>
            <Field label="Skills">
              <input value={uploadForm.skills} onChange={(e) => setUploadForm((f) => ({ ...f, skills: e.target.value }))} className={inputClass} placeholder="e.g. React, Node.js, TypeScript" />
            </Field>
            <Field label="Education">
              <input value={uploadForm.education} onChange={(e) => setUploadForm((f) => ({ ...f, education: e.target.value }))} className={inputClass} placeholder="e.g. B.Tech CSE" />
            </Field>
            <Field label="Current Company">
              <input value={uploadForm.currentCompany} onChange={(e) => setUploadForm((f) => ({ ...f, currentCompany: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Current CTC (LPA)">
              <input type="number" min="0" step="0.5" value={uploadForm.currentCTC} onChange={(e) => setUploadForm((f) => ({ ...f, currentCTC: e.target.value }))} className={inputClass} placeholder="e.g. 12" />
            </Field>
            <Field label="Expected Salary (LPA)">
              <input type="number" min="0" step="0.5" value={uploadForm.expectedSalary} onChange={(e) => setUploadForm((f) => ({ ...f, expectedSalary: e.target.value }))} className={inputClass} placeholder="e.g. 18" />
            </Field>
            <Field label="Notice Period">
              <input value={uploadForm.noticePeriod} onChange={(e) => setUploadForm((f) => ({ ...f, noticePeriod: e.target.value }))} className={inputClass} placeholder="e.g. 30 days" />
            </Field>
            <Field label="Portfolio">
              <input value={uploadForm.portfolio} onChange={(e) => setUploadForm((f) => ({ ...f, portfolio: e.target.value }))} className={inputClass} placeholder="e.g. github.com/handle" />
            </Field>
          </div>
          <button
            type="submit"
            disabled={uploadSubmitting}
            className="mt-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploadSubmitting ? 'Adding…' : 'Add Candidate'}
          </button>
        </form>
      </Modal>
    </HrLayout>
  );
}
