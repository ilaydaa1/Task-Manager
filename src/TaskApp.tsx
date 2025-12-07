// deno-lint-ignore-file
import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/navbar";
import {
  LayoutDashboard,
  ListTodo,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  Search,
  Plus,
  MoreVertical,
  Filter,
} from "lucide-react";

const API = "http://localhost:8000/api";

/* ===============================
      REFRESH TOKEN MEKANİZMASI
=============================== */
async function apiFetch(url: string, options: any = {}) {
  let token = localStorage.getItem("accessToken");

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  // 401 → refresh dene
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      // ❗ Artık geçersiz token’ları temizliyoruz ki sonsuz loop olmasın
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    // refresh başarılı → isteği tekrar yap
    token = localStorage.getItem("accessToken");
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
  }

  return res;
}

async function tryRefreshToken() {
  const refresh = localStorage.getItem("refreshToken");
  if (!refresh) return false;

  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) return false;

  const data = await res.json();
  localStorage.setItem("accessToken", data.accessToken);
  return true;
}


/* ===============================
        TİPLER
=============================== */
type TaskRow = {
  id: number;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked" | "archived";
  priority: "low" | "medium" | "high";
  created_at?: number;
};

type TaskStatus = TaskRow["status"];
type Priority = TaskRow["priority"];

const STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "done",
  "blocked",
  "archived",
];
const PRIOS: Priority[] = ["low", "medium", "high"];

/* ----- UI Config ----- */
const statusConfig = {
  todo: {
    label: "To Do",
    icon: ListTodo,
    color: "text-slate-600",
    bg: "bg-slate-50",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    color: "text-blue-600",
    bg: "bg-blue-50",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  done: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  blocked: {
    label: "Blocked",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    color: "text-slate-400",
    bg: "bg-slate-50",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

const priorityConfig = {
  low: {
    label: "Low",
    dot: "bg-slate-400",
    text: "text-slate-600",
    badge: "bg-slate-50 text-slate-700 border-slate-200",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-400",
    text: "text-amber-600",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  high: {
    label: "High",
    dot: "bg-red-500",
    text: "text-red-600",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
};

/* ===============================
        ANA TASK COMPONENT
=============================== */
export default function TaskApp() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [q, setQ] = useState("");

  const [draftTitle, setDraftTitle] = useState("");
  const [draftPriority, setDraftPriority] = useState<Priority>("medium");
  const [draftStatus, setDraftStatus] = useState<TaskStatus>("todo");
  const [isNewOpen, setNewOpen] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskMenuOpen, setTaskMenuOpen] = useState<number | null>(null);

  async function reload() {
    const url = q
      ? `${API}/tasks?q=${encodeURIComponent(q)}`
      : `${API}/tasks`;

    const res = await apiFetch(url);

    if (!res.ok) return;

    const data = await res.json();
    setTasks(data);
  }

  useEffect(() => {
    reload();
  }, [q]);

  const visible = useMemo(() => {
    return filter === "all"
      ? tasks
      : tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const editing = tasks.find((t) => t.id === editId) || null;

  /* ---------- CRUD ---------- */

  async function apiAdd() {
    const title = draftTitle.trim();
    if (!title) return;

    await apiFetch(`${API}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        priority: draftPriority,
        status: draftStatus,
      }),
    });

    setDraftTitle("");
    setDraftPriority("medium");
    setDraftStatus("todo");
    setNewOpen(false);

    reload();
  }

  async function apiUpdate(id: number, patch: Partial<TaskRow>) {
    await apiFetch(`${API}/tasks/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });

    reload();
  }

  async function apiDelete(id: number) {
    if (!confirm("Delete this task?")) return;

    await apiFetch(`${API}/tasks/${id}`, {
      method: "DELETE",
    });

    setTaskMenuOpen(null);
    reload();
  }

  async function saveEdit() {
    if (!editing || !editTitle.trim()) return;

    await apiUpdate(editing.id, { title: editTitle.trim() });
    setEditId(null);
  }

  const taskCounts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.length };
    STATUSES.forEach((s) => {
      c[s] = tasks.filter((t) => t.status === s).length;
    });
    return c;
  }, [tasks]);

  /* ===============================
            UI BAŞLIYOR
  =============================== */
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="pt-16 flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200
          transform transition-transform duration-200 lg:transform-none z-40
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          <div className="p-4">
            <button
              onClick={() => setNewOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>

            <div className="px-3 mt-6">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Views
              </div>

              <button
                onClick={() => {
                  setFilter("all");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
                  filter === "all"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Filter className="w-4 h-4" />
                  All Tasks
                </span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                  {taskCounts.all}
                </span>
              </button>
            </div>

            <div className="px-3 mt-6">
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Status
              </div>

              {STATUSES.map((s) => {
                const Icon = statusConfig[s].icon;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setFilter(s);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
                      filter === s
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {statusConfig[s].label}
                    </span>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                      {taskCounts[s]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main */}
        <main className="flex-1">
          <div className="max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold">
                  {filter === "all"
                    ? "All Tasks"
                    : statusConfig[filter].label}
                </h1>
                <p className="text-slate-500 text-sm">
                  Showing {visible.length} of {tasks.length}
                </p>
              </div>

              <button
                className="lg:hidden p-2"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <LayoutDashboard className="w-6 h-6" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            {/* Task List */}
            <div className="space-y-2">
              {visible.length === 0 ? (
                <div className="text-center py-12 bg-white border rounded-lg">
                  <ListTodo className="w-10 h-10 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-500">
                    No tasks found. Create one!
                  </p>
                </div>
              ) : (
                visible.map((t) => {
                  const StatusIcon = statusConfig[t.status].icon;
                  return (
                    <div
                      key={t.id}
                      className="bg-white border rounded-lg p-4 flex items-start gap-4 relative"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusConfig[t.status].bg}`}
                      >
                        <StatusIcon
                          className={`${statusConfig[t.status].color}`}
                        />
                      </div>

                      <div className="flex-1">
                        {editId === t.id ? (
                          <input
                            value={editTitle}
                            onChange={(e) =>
                              setEditTitle(e.target.value)
                            }
                            onBlur={saveEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape")
                                setEditId(null);
                            }}
                            autoFocus
                            className="px-3 py-1.5 border rounded-lg w-full"
                          />
                        ) : (
                          <h3
                            className="font-medium cursor-pointer"
                            onClick={() => {
                              setEditId(t.id);
                              setEditTitle(t.title);
                            }}
                          >
                            {t.title}
                          </h3>
                        )}

                        <div className="flex gap-3 mt-2 text-xs">
                          <span
                            className={`px-2 py-1 border rounded ${statusConfig[t.status].badge}`}
                          >
                            {statusConfig[t.status].label}
                          </span>

                          <span
                            className={`px-2 py-1 border rounded ${priorityConfig[t.priority].badge}`}
                          >
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${priorityConfig[t.priority].dot} mr-1`}
                            />
                            {priorityConfig[t.priority].label}
                          </span>
                        </div>
                      </div>

                      {/* Right Controls */}
                      <div className="flex items-center gap-2">
                        <select
                          value={t.status}
                          onChange={(e) =>
                            apiUpdate(t.id, {
                              status: e.target.value as TaskStatus,
                            })
                          }
                          className="border rounded px-2 py-1 text-xs"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {statusConfig[s].label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={t.priority}
                          onChange={(e) =>
                            apiUpdate(t.id, {
                              priority: e.target.value as Priority,
                            })
                          }
                          className="border rounded px-2 py-1 text-xs"
                        >
                          {PRIOS.map((p) => (
                            <option key={p} value={p}>
                              {priorityConfig[p].label}
                            </option>
                          ))}
                        </select>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setTaskMenuOpen(
                                taskMenuOpen === t.id ? null : t.id
                              )
                            }
                            className="p-2 hover:bg-slate-100 rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </button>

                          {taskMenuOpen === t.id && (
                            <>
                              <div
                                className="fixed inset-0"
                                onClick={() => setTaskMenuOpen(null)}
                              />
                              <div className="absolute right-0 mt-1 bg-white shadow-lg border rounded-lg w-32 py-1">
                                <button
                                  onClick={() => apiDelete(t.id)}
                                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* New Task Modal */}
      {isNewOpen && (
        <div
          className="fixed inset-0 bg-slate-900 bg-opacity-40 flex items-center justify-center p-4"
          onClick={() => setNewOpen(false)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Create New Task</h3>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Task Title
                </label>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <select
                    value={draftStatus}
                    onChange={(e) =>
                      setDraftStatus(e.target.value as TaskStatus)
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusConfig[s].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Priority
                  </label>
                  <select
                    value={draftPriority}
                    onChange={(e) =>
                      setDraftPriority(e.target.value as Priority)
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {PRIOS.map((p) => (
                      <option key={p} value={p}>
                        {priorityConfig[p].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setNewOpen(false)}
                className="px-4 py-2 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={apiAdd}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
