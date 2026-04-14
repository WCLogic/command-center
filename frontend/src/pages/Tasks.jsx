import React, { useMemo, useState } from 'react';
import { useData, SHEET_TABS } from '../lib/data.jsx';
import { colIndex } from '../lib/parseRows.js';
import { api } from '../lib/api.js';
import {
  Plus, Filter as FilterIcon, ChevronDown, ChevronRight, AlertCircle,
  CheckCircle2, Circle, Loader2,
} from 'lucide-react';

const PRIORITY_RANK = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
const PRIORITY_COLOR = {
  'Critical': '#ef4444',
  'High':     '#f97316',
  'Medium':   '#eab308',
  'Low':      '#6b7280',
};
const CATEGORIES = ['Personal', 'RSC', 'Family Biz', 'Agent Ops'];
const ASSIGNEES = ['Mr. Chase', 'Jarvis', 'EagleEye', 'Scout', 'Billboard', 'Scrooge'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Active', 'In Progress', 'Blocked', 'Completed'];

const TASKS_TAB = SHEET_TABS[2];

export default function Tasks() {
  const { tabs, refresh, patchRow, addRowLocal } = useData();
  const tab = tabs[TASKS_TAB];
  const allTasks = tab?.rows || [];
  const headers = tab?.headers || [];

  const [filters, setFilters] = useState({
    category: 'All',
    priority: 'All',
    assignee: 'All',
    status: 'All',
  });
  const [sort, setSort] = useState('priority'); // priority | due
  const [showCompleted, setShowCompleted] = useState(false);
  const [pending, setPending] = useState({});

  const filteredActive = useMemo(() => {
    return allTasks
      .filter((t) => (t.Status || 'Active') !== 'Completed')
      .filter((t) => filters.category === 'All' || t.Category === filters.category)
      .filter((t) => filters.priority === 'All' || t.Priority === filters.priority)
      .filter((t) => filters.assignee === 'All' || t['Assigned To'] === filters.assignee)
      .filter((t) => filters.status   === 'All' || (t.Status || 'Active') === filters.status)
      .sort((a, b) => {
        if (sort === 'priority') {
          const ra = PRIORITY_RANK[a.Priority] ?? 99;
          const rb = PRIORITY_RANK[b.Priority] ?? 99;
          if (ra !== rb) return ra - rb;
        }
        const da = parseDate(a['Due Date']);
        const db = parseDate(b['Due Date']);
        if (da && db) return da - db;
        if (da) return -1;
        if (db) return 1;
        return 0;
      });
  }, [allTasks, filters, sort]);

  const completed = useMemo(
    () => allTasks.filter((t) => t.Status === 'Completed'),
    [allTasks]
  );

  const completeTask = async (task) => {
    const statusCol = colIndex(headers, 'Status');
    if (statusCol < 0) return alert('Status column not found in sheet');
    setPending((p) => ({ ...p, [task._rowIndex]: true }));
    patchRow(TASKS_TAB, task._rowIndex, 'Status', 'Completed');
    try {
      await api.setCell(TASKS_TAB, task._rowIndex, statusCol, 'Completed');
      // also stamp Completed Date if column exists
      const completedDateCol = colIndex(headers, 'Completed Date');
      if (completedDateCol > 0) {
        await api.setCell(TASKS_TAB, task._rowIndex, completedDateCol, todayIso());
      }
      refresh();
    } catch (e) {
      patchRow(TASKS_TAB, task._rowIndex, 'Status', task.Status || 'Active');
      alert('Failed to update: ' + e.message);
    } finally {
      setPending((p) => { const n = { ...p }; delete n[task._rowIndex]; return n; });
    }
  };

  return (
    <div className="space-y-4">
      <QuickAdd headers={headers} onAdded={async (row) => {
        addRowLocal(TASKS_TAB, row);
        try {
          // Build row in column order
          const orderedValues = headers.map((h) => row[h] ?? '');
          await api.appendRow(TASKS_TAB, orderedValues);
          refresh();
        } catch (e) {
          alert('Failed to save task: ' + e.message);
        }
      }} />

      {/* Filters / sort */}
      <div className="panel p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-[#9ca3af] mr-2">
          <FilterIcon size={14} /> Filters
        </div>
        <Select label="Category" value={filters.category} onChange={(v) => setFilters((f) => ({ ...f, category: v }))} options={['All', ...CATEGORIES]} />
        <Select label="Priority" value={filters.priority} onChange={(v) => setFilters((f) => ({ ...f, priority: v }))} options={['All', ...PRIORITIES]} />
        <Select label="Assignee" value={filters.assignee} onChange={(v) => setFilters((f) => ({ ...f, assignee: v }))} options={['All', ...ASSIGNEES]} />
        <Select label="Status"   value={filters.status}   onChange={(v) => setFilters((f) => ({ ...f, status: v }))}   options={['All', ...STATUSES]} />
        <div className="ml-auto">
          <Select label="Sort" value={sort} onChange={setSort} options={['priority', 'due']} />
        </div>
      </div>

      {/* Active tasks */}
      <div className="panel">
        <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center justify-between">
          <div className="text-sm font-semibold tracking-wide">
            Active <span className="text-[#6b7280] ml-1">({filteredActive.length})</span>
          </div>
        </div>
        {filteredActive.length === 0 ? (
          <div className="p-10 text-center text-[#9ca3af] text-sm">
            No active tasks match your filters.
          </div>
        ) : (
          <ul className="divide-y divide-[#1e1e2e]">
            {filteredActive.map((t) => (
              <TaskRow
                key={t._rowIndex}
                task={t}
                pending={!!pending[t._rowIndex]}
                onComplete={() => completeTask(t)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Completed (collapsed) */}
      <div className="panel">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-sm font-semibold hover:bg-[#1a1a24]/50 transition"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[#22c55e]" />
            Completed <span className="text-[#6b7280]">({completed.length})</span>
          </div>
          {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {showCompleted && (
          <ul className="divide-y divide-[#1e1e2e] border-t border-[#1e1e2e]">
            {completed.length === 0
              ? <li className="p-4 text-sm text-[#6b7280] italic">Nothing completed yet.</li>
              : completed.map((t) => <TaskRow key={t._rowIndex} task={t} completed />)
            }
          </ul>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, completed, pending, onComplete }) {
  const dueDate = parseDate(task['Due Date']);
  const overdue = dueDate && dueDate < startOfToday() && !completed;
  const pColor = PRIORITY_COLOR[task.Priority] || '#6b7280';

  return (
    <li className={`flex items-start gap-3 px-4 py-3 ${overdue ? 'bg-[#ef4444]/5' : ''}`}>
      <button
        onClick={completed ? undefined : onComplete}
        disabled={completed || pending}
        className="mt-0.5 flex-shrink-0"
        title={completed ? 'Completed' : 'Mark complete'}
      >
        {pending
          ? <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
          : completed
            ? <CheckCircle2 size={18} className="text-[#22c55e]" />
            : <Circle size={18} className="text-[#6b7280] hover:text-[#3b82f6]" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${completed ? 'line-through text-[#6b7280]' : 'text-[#e5e7eb]'} truncate`}>
          {task.Task || task.Title || task.Description || '(untitled)'}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-[#9ca3af]">
          {task.Priority && (
            <span
              className="px-1.5 py-0.5 rounded border"
              style={{ color: pColor, borderColor: pColor + '66', background: pColor + '14' }}
            >
              {task.Priority}
            </span>
          )}
          {task.Category && <span className="px-1.5 py-0.5 rounded panel-2">{task.Category}</span>}
          {task['Assigned To'] && <span>→ {task['Assigned To']}</span>}
          {task['Due Date'] && (
            <span className={overdue ? 'text-[#ef4444] font-medium' : ''}>
              {overdue && <AlertCircle size={11} className="inline mr-1 -mt-0.5" />}
              Due {task['Due Date']}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function QuickAdd({ headers, onAdded }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Personal');
  const [priority, setPriority] = useState('Medium');
  const [assignee, setAssignee] = useState('Mr. Chase');

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const row = {
      'Task': text.trim(),
      'Title': text.trim(),
      'Category': category,
      'Priority': priority,
      'Assigned To': assignee,
      'Status': 'Active',
      'Created Date': todayIso(),
    };
    // Generate ID if column exists
    if (headers.includes('ID')) row['ID'] = 'T-' + Date.now().toString(36).toUpperCase();
    setText('');
    onAdded(row);
  };

  return (
    <form onSubmit={submit} className="panel p-3 flex flex-wrap gap-2 items-center">
      <Plus size={16} className="text-[#3b82f6]" />
      <input
        className="input flex-1 min-w-[200px]"
        placeholder="Add a task and press Enter…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
        {PRIORITIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
        {ASSIGNEES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" className="btn btn-primary" disabled={!text.trim()}>Add</button>
    </form>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-xs text-[#9ca3af]">
      <span>{label}:</span>
      <select className="input text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
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
function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
