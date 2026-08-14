import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus, Users as UsersIcon } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { SearchInput } from "../components/ui/SearchInput";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { api, extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { Role, User } from "../types";

export function Users() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  });

  const filteredUsers = useMemo(() => {
    if (!users) return users;
    const term = search.trim().toLowerCase();
    return term ? users.filter((u) => u.email.toLowerCase().includes(term)) : users;
  }, [users, search]);

  const createUser = useMutation({
    mutationFn: async () => (await api.post<User>("/users", { email, password, role })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast(`User ${email} created`);
      setEmail("");
      setPassword("");
      setRole("VIEWER");
      setFormError(null);
    },
    onError: (err) => setFormError(extractErrorMessage(err, "Could not create user")),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("User deleted");
      setPendingDelete(null);
    },
    onError: (err) => {
      showToast(extractErrorMessage(err, "Could not delete user"), "error");
      setPendingDelete(null);
    },
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    createUser.mutate();
  }

  return (
    <AppLayout title="Users">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Add User" className="lg:col-span-1">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="VIEWER">Viewer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {formError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                {formError}
              </div>
            )}
            <button
              type="submit"
              disabled={createUser.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {createUser.isPending ? <Spinner size={16} className="text-white" /> : <UserPlus size={16} />}
              Create User
            </button>
          </form>
        </Card>

        <Card
          title="All Users"
          className="lg:col-span-2"
          action={
            users && users.length > 0 ? (
              <SearchInput value={search} onChange={setSearch} placeholder="Search by email…" />
            ) : undefined
          }
        >
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : !users || users.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No users yet" />
          ) : !filteredUsers || filteredUsers.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No users match your search" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-800">
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                    <th className="py-2 pr-4 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                    >
                      <td className="py-2.5 pr-4 text-slate-800 dark:text-slate-200">{u.email}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.role === "ADMIN"
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingDelete(u)}
                          disabled={u.id === currentUser?.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950"
                          title={u.id === currentUser?.id ? "You cannot delete yourself" : "Delete user"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete user"
        description={`Are you sure you want to delete ${pendingDelete?.email}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deleteUser.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </AppLayout>
  );
}
