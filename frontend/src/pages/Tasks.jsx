import React, { useMemo, useState } from 'react';
import { useData, SHEET_TABS } from '../lib/data.jsx';
import { ChevronDown, ChevronRight, CheckCircle2, Info } from 'lucide-react';

/**
 * Tasks & To-Dos — read-only list view.
 *
 * Visual rules:
 *  - Priority is a colored dot only (not a badge). The dot earns color
 *    because priority is the single most-scanned field on this page.
 *  - Category is a neutral tag.
 *  - Overdue styling is a color change on the due-date text only — no row
 *    backgrounds. Subtle, not alarming.
 */
const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const PRIORITY_COLOR = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#eab308',
  Low:      '#71717a',
};

const CATEGORIES = ['Personal', 'RSC', 'Family Biz', 'Agent Ops'];
const ASSIGNEES  = ['Will', 'Jarvis', 'Scout', 'Billboard', 'EagleEye', 'Scrooge'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const TASKS_TAB = SHEET_TABS[2];

export default function Tasks() {
  const { tabs } = useData();
  const tab = tabs[TASKS_TAB];
  const allTasks = tab?.rows || [];

  const [filters, setFilters] = useState({
    category: 'All',
    priority: 'All',
    assignee: 'All',
  });
  const [showCompleted, setShowCompleted] = useState(false);

  const active = useMemo(() => {
    return allTasks
      .filter((t) => (t.Status || '').toLowerCase() !== 'completed')
      .filter((t) => filters.category === 'All' || t.Category === filters.category)
      .filter((t) => filters.priority === 'All' || t.Priority === filters.priority)
      .filter((t) => filters.assignee === 'All' || t['Assigned To'] === filters.assignee)
      .sort(sortByPriorityThenDue);
  }, [allTasks, filters]);

  const completed = useMemo(
    () => allTasks
      .filter((t) => (t.Status || '').toLowerCase() === 'completed')
      .sort((a, b) => {
        const da = parseDate(a['Completed Date']);
        const db = parseDate(b['Completed Date']);
        if (da && db) return db - da;
        return 0;
      }),
    [allTasks]
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Tasks & To-Dos"
        subtitle="Cross-agent task queue"
      />

      <div className="panel px-4 py-2.5 text-[12px] text-[#a1a1aa] flex items-center gap-2">
        <Info size={12} className="text-[#71717a]" />
        This is a read-only view. Your agents handle task updates.
      </div>

      <div className="panel p-3 flex flex-wrap items-center gap-3">
        <span className="text-[11px] uppercase tracking-wider text-[#71717a] mr-1">Filters</span>
        <Select label="Category" value={filters.category} onChange={(v) => setFilters((f) => ({ ...f, category: v }))} options={['All', ...CATEGORIES]} />
        <Select label="Priority" value={filters.priority} onChange={(v) => setFilters((f) => ({ ...f, priority: v }))} options={['All', ...PRIORITIES]} />
        <Select label="Assigned To" value={filters.assignee} onChange={(v) => setFilters((f) => ({ ...f, assignee: v }))} options={['All', ...ASSIGNEES]} />
      </div>

      <div className="panel">
        <div className="px-4 py-3 border-b border-[#27272a] flex items-center justify-between">
          <div className="text-[13px] font-semibold text-[#fafafa]">
            Active <span className="text-[#71717a] font-normal ml-1">({active.length})</span>
          </div>
        </div>
        {active.length === 0 ? (
          <div className="px-4 py-10 text-center text-[#a1a1aa] text-sm">
            No active tasks match your filters.
          </div>
        ) : (
          <ul className="divide-y divide-[#27272a]">
            {active.map((t) => <TaskRow key={t._rowIndex} task={t} />)}
          </ul>
        )}
      </div>

      <div className="panel">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-[13px] font-semibold hover:bg-[#1f1f23] transition"
        >
          <div className="flex items-center gap-2 text-[#a1a1aa]">
            <CheckCircle2 size={14} className="text-[#22c55e]" />
            <span className="text-[#fafafa]">Completed</span>
            <span className="text-[#71717a] font-normal">({completed.length})</span>
          </div>
          {showCompleted ? <ChevronDown size={14} className="text-[#71717a]" /> : <ChevronRight size={14} className="text-[#71717a]" />}
        </button>
        {showCompleted && (
          completed.length === 0
            ? <div className="border-t border-[#27272a] px-4 py-4 text-[13px] text-[#71717a] italic">Nothing completed yet.</div>
            : (
              <ul className="divide-y divide-[#27272a] border-t border-[#27272a]">
                {completed.map((t) => <TaskRow key={t._rowIndex} task={t} completed />)}
              </ul>
            )
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">{title}</h1>
      {subtitle && <p className="text-[12px] text-[#71717a] mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-[#a1a1aa]">
      <span>{label}</span>
      <select
        className="input text-[12px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function TaskRow({ task, completed }) {
  const due = parseDate(task['Due Date']);
  const overdue = !completed && due && due < startOfToday();
  const priorityColor = PRIORITY_COLOR[task.Priority] || '#52525b';
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        title={task.Priority || 'No priority'}
        className="mt-2 w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: completed ? '#3f3f46' : priorityColor }}
      />
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] ${completed ? 'line-through text-[#71717a]' : 'text-[#fafafa]'} truncate`}>
          {task.Task || '(untitled)'}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-[#a1a1aa]">
          {task.Category && (
            <span className="text-[#71717a] uppercase tracking-wider">{task.Category}</span>
          )}
          {task['Assigned To'] && (
            <span>{task['Assigned To']}</span>
          )}
          {task['Due Date'] && (
            <span style={overdue ? { color: '#ef4444' } : undefined}>
              Due {task['Due Date']}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function sortByPriorityThenDue(a, b) {
  const ra = PRIORITY_RANK[a.Priority] ?? 99;
  const rb = PRIORITY_RANK[b.Priority] ?? 99;
  if (ra !== rb) return ra - rb;
  const da = parseDate(a['Due Date']);
  const db = parseDate(b['Due Date']);
  if (da && db) return da - db;
  if (da) return -1;
  if (db) return 1;
  return 0;
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
