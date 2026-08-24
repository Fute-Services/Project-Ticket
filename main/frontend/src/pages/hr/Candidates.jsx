import { useMemo, useRef, useState } from 'react';
import {
  Search,
  MapPin,
  Briefcase,
  GraduationCap,
  Wallet,
  Link as LinkIcon,
  FileText,
  Upload,
  Mail,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import HrLayout from '../../components/hr/HrLayout';
import { Card, SectionHeader, Badge, Pill, Drawer, Modal, Field, inputClass, EmptyState } from '../../components/ui';
import { CANDIDATE_STAGES, RESUME_SOURCES } from '../../data/hrMockData';
import { candidatesApi } from '../../utils/api';
import { useHrDesk } from '../../context/HrDeskContext';

const EMPTY_UPLOAD_FORM = { name: '', email: '', phone: '', appliedFor: '', location: '', experience: '' };

export default function Candidates() {
  const { candidates, setCandidates } = useHrDesk();
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD_FORM);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

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
        c.experience.toLowerCase().includes(q)
      );
    });
  }, [candidates, query, stageFilter, sourceFilter]);

  function updateStage(id, stage) {
    setCandidates((rows) => rows.map((c) => (c.id === id ? { ...c, stage } : c)));
    setSelected((s) => (s && s.id === id ? { ...s, stage } : s));
    candidatesApi.update(id, { stage }).catch((e) => console.error('Failed to update candidate stage:', e.message));
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
      skills: [],
      experience: uploadForm.experience || 'Not specified',
      education: 'Not specified',
      expectedSalary: 'Not specified',
      currentCompany: 'Not specified',
      portfolio: '',
      source: 'Manual Upload',
      stage: 'Applied',
      appliedFor: uploadForm.appliedFor || 'Unspecified role',
      appliedOn: new Date().toISOString().slice(0, 10),
      resumeFileName: uploadedFile?.name || '',
    };
    setUploadSubmitting(true);
    try {
      const { data } = await candidatesApi.create(payload);
      setCandidates((rows) => [data, ...rows]);
      setSelected(data);
      // Only clear/close on success — closing unconditionally used to
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
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader
          title="Candidate Management (ATS)"
          subtitle={`${filtered.length} of ${candidates.length} candidates`}
          action={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
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
                className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <select
              aria-label="Filter candidates by source"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-muted border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="All">All sources</option>
              {RESUME_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    <MapPin size={11} /> {c.location} · {c.experience}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                        {s}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Candidate Profile" wide>
        {selected && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-lg font-semibold text-foreground">{selected.name}</div>
              <div className="text-xs text-muted-foreground">{selected.appliedFor}</div>
              <div className="mt-2"><Badge value={selected.stage} /></div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground"><Mail size={13} className="text-primary" /> {selected.email}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone size={13} className="text-primary" /> {selected.phone}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin size={13} className="text-primary" /> {selected.location}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Briefcase size={13} className="text-primary" /> {selected.currentCompany} · {selected.experience}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><GraduationCap size={13} className="text-primary" /> {selected.education}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Wallet size={13} className="text-primary" /> Expected: {selected.expectedSalary}</div>
              {selected.portfolio && (
                <div className="flex items-center gap-2 text-muted-foreground"><LinkIcon size={13} className="text-primary" /> {selected.portfolio}</div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.skills.map((s) => (
                  <span key={s} className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground border border-border">{s}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Resume</div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText size={14} className="text-primary" />
                  {selected.resumeFileName || `${selected.name.replace(' ', '_')}_Resume.pdf`}
                </div>
                <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground border border-border">Source: {selected.source}</span>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Move Stage</div>
              <select
                value={selected.stage}
                onChange={(e) => updateStage(selected.id, e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                {CANDIDATE_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Timeline</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Applied on {selected.appliedOn}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Currently in {selected.stage}
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={!!uploadedFile}
        onClose={() => { setUploadedFile(null); setUploadForm(EMPTY_UPLOAD_FORM); }}
        title="Add Candidate from Resume"
      >
        <form onSubmit={submitUpload} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted border border-border text-xs text-muted-foreground">
            <FileText size={14} className="text-primary" />
            {uploadedFile?.name}
          </div>
          <Field label="Candidate Name">
            <input required value={uploadForm.name} onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input required type="email" value={uploadForm.email} onChange={(e) => setUploadForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Phone">
              <input value={uploadForm.phone} onChange={(e) => setUploadForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <Field label="Applying For">
            <input required value={uploadForm.appliedFor} onChange={(e) => setUploadForm((f) => ({ ...f, appliedFor: e.target.value }))} className={inputClass} placeholder="e.g. Backend Developer" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <input value={uploadForm.location} onChange={(e) => setUploadForm((f) => ({ ...f, location: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Experience">
              <input value={uploadForm.experience} onChange={(e) => setUploadForm((f) => ({ ...f, experience: e.target.value }))} className={inputClass} placeholder="e.g. 3 yrs" />
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
