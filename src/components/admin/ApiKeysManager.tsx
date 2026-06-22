"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import {
  Badge,
  Card,
  SectionHeading,
  buttonClass,
  inputClass,
  Label,
} from "@/components/ui";
import { createApiKey, revokeApiKey, deleteApiKey } from "@/lib/actions/api-keys";

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-outline bg-surface-low px-3 py-2 font-mono text-sm text-ink">
        {value}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* ignore */
          }
        }}
        className={buttonClass("primary", "sm")}
      >
        <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function ApiKeysManager({
  keys,
  baseUrl,
}: {
  keys: ApiKeyRow[];
  baseUrl: string;
}) {
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError(null);
    setNewKey(null);
    startTransition(async () => {
      const res = await createApiKey(name);
      if (res.ok) {
        setNewKey(res.rawKey);
        setName("");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Generate */}
      <Card className="p-6">
        <SectionHeading icon="vpn_key" title="Generate an API key" />
        <p className="-mt-2 mb-3 text-sm text-muted">
          Create a key, then paste it into your monitoring platform. The key is
          shown once — store it safely.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="key-name">Label</Label>
            <input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Central monitor"
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={isPending}
            className={buttonClass("primary", "md")}
          >
            <Icon name="add" className="text-[18px]" />
            Generate key
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        {newKey && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <Icon name="check_circle" fill className="text-[16px]" />
              Your new key — copy it now, it won&apos;t be shown again.
            </p>
            <CopyBox value={newKey} />
          </div>
        )}
      </Card>

      {/* Existing keys */}
      <Card className="p-6">
        <SectionHeading icon="key" title="Active keys" />
        {keys.length === 0 ? (
          <p className="text-sm text-muted">No keys yet.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {k.name}
                    {k.revokedAt ? (
                      <Badge color="danger">Revoked</Badge>
                    ) : (
                      <Badge color="success">Active</Badge>
                    )}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-faint">
                    {k.prefix}…••••
                    {k.lastUsedAt
                      ? ` · last used ${new Date(k.lastUsedAt).toLocaleString("en-GB")}`
                      : " · never used"}
                  </p>
                </div>
                <KeyActions id={k.id} revoked={Boolean(k.revokedAt)} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Docs */}
      <Card className="p-6">
        <SectionHeading icon="terminal" title="Endpoints" />
        <p className="-mt-2 mb-3 text-sm text-muted">
          Send the key as <code>Authorization: Bearer &lt;key&gt;</code> (or{" "}
          <code>x-api-key</code>). Poll the events endpoint with{" "}
          <code>?since=</code> to fetch only new activity.
        </p>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-outline bg-surface-low p-3">
            <p className="font-mono text-ink">GET {baseUrl}/api/monitor/health</p>
            <p className="mt-1 text-xs text-muted">
              Site status, integration config and headline counts. Use for
              uptime/health checks.
            </p>
          </div>
          <div className="rounded-lg border border-outline bg-surface-low p-3">
            <p className="font-mono text-ink">
              GET {baseUrl}/api/monitor/events?since=&lt;ISO8601&gt;
            </p>
            <p className="mt-1 text-xs text-muted">
              Orders, sign-ups, Pro upgrades, card activations and security
              events. Filter with <code>&amp;type=</code> or{" "}
              <code>&amp;severity=critical</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function KeyActions({ id, revoked }: { id: string; revoked: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex shrink-0 items-center gap-1">
      {!revoked && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(async () => void (await revokeApiKey(id)))}
          className={buttonClass("outline", "sm")}
        >
          Revoke
        </button>
      )}
      <button
        type="button"
        title="Delete"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Delete this key permanently?")) return;
          startTransition(async () => void (await deleteApiKey(id)));
        }}
        className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"
      >
        <Icon name="delete" className="text-[18px]" />
      </button>
    </div>
  );
}
