import { useState } from 'react';
import { Plus, MessageSquare, Paperclip } from 'lucide-react';
import CoordinatorLayout from '../../components/coordinator/CoordinatorLayout';
import { Card, SectionHeader, Badge, Modal, Field, inputClass } from '../../components/ui';
import { tasks as SEED, TASK_STATUSES, TASK_PRIORITIES } from '../../data/coordinatorMockData';
import { employees } from '../../data/hrMockData';

const EMPTY_FORM = { title: '', assignee: employees[0].name, priority: 'Medium', dueDate: '' };

export default function Tasks() {
  const [tasks, setTasks] = useState(SEED);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  function moveTask(id, status) {
    setTasks((rows) => rows.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  function submit(e) {
    e.preventDefault();
    const id = `TK-${900 + tasks.length + 1}`;
    setTasks((rows) => [{ id, status: 'Pending', comments: 0, attachments: 0, ...form }, ...rows]);
    setForm(EMPTY_FORM);
    setShowModal(false);
  }

  return (
    <CoordinatorLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        <SectionHeader
          title="Task Management"
          subtitle={`${tasks.length} tasks`}
          action={
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Assign Task
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TASK_STATUSES.map((status) => (
            <Card key={status} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wide">{status}</h3>
                <span className="text-[10px] text-gray-500">{tasks.filter((t) => t.status === status).length}</span>
              </div>
              <div className="flex flex-col gap-3 min-h-[80px]">
                {tasks.filter((t) => t.status === status).map((t) => (
                  <div key={t.id} className="p-3.5 rounded-2xl bg-[#18181c] border border-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs font-bold text-white pr-2">{t.title}</div>
                      <Badge value={t.priority} />
                    </div>
                    <div className="text-[10px] text-gray-500 mb-2.5">{t.assignee} · due {t.dueDate}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1"><MessageSquare size={11} /> {t.comments}</span>
                        <span className="flex items-center gap-1"><Paperclip size={11} /> {t.attachments}</span>
                      </div>
                      <select
                        value={t.status}
                        onChange={(e) => moveTask(t.id, e.target.value)}
                        className="bg-[#141418] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#e86024] cursor-pointer"
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Assign Task">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Title">
            <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Assignee">
            <select value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))} className={inputClass}>
              {employees.map((e) => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={inputClass}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Due Date">
              <input required type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <button type="submit" className="mt-2 bg-[#e86024] hover:bg-[#d4521a] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer">
            Assign
          </button>
        </form>
      </Modal>
    </CoordinatorLayout>
  );
}
