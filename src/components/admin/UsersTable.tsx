"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Card, inputClass } from "@/components/ui";
import { UserRow, type AdminUser } from "@/components/admin/UserRow";

export function UsersTable({
  users,
  currentAdminId,
}: {
  users: AdminUser[];
  currentAdminId: string;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.username ?? ""].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [users, query]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            User Management
          </h1>
          <p className="mt-1 text-muted">
            {query.trim() ? (
              <>
                <span className="font-medium text-ink tabular-nums">
                  {visible.length}
                </span>{" "}
                of {users.length} {users.length === 1 ? "account" : "accounts"}{" "}
                match
              </>
            ) : (
              <>
                {users.length} {users.length === 1 ? "account" : "accounts"}{" "}
                registered
              </>
            )}
          </p>
        </div>
        <div className="relative sm:w-72">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-[18px]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
            className={`${inputClass} pl-10`}
          />
        </div>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead>
              <tr className="text-xs font-semibold text-faint uppercase tracking-wide bg-surface-low/60">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    {users.length === 0
                      ? "No users found."
                      : `No users match “${query.trim()}”.`}
                  </td>
                </tr>
              )}
              {visible.map((u) => (
                <UserRow key={u.id} user={u} currentAdminId={currentAdminId} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
