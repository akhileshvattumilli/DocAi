# ShareSheet Frontend UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a document owner share/revoke access via a Share button + slide-over Sheet on the doc detail page, and replace the dead 401 "Invite required" branch with a proper private-document empty state.

**Architecture:** Two files change. `frontend/src/app/docs/[docId]/page.js` gets a thin page-level action row (Share button, gated on `doc.is_owner`) and a fixed 403 branch. A new `frontend/src/components/editor/ShareSheet.jsx` owns the Sheet's contents (invite form + collaborator list) and is the only file that talks to `/collaborators/`, `/invite/`, `/revoke/`.

**Tech Stack:** Next.js (App Router, client components), SWR, existing shadcn/radix `Sheet`/`Card`/`Button`/`Input`/`Label` primitives, lucide-react icons (already a dependency).

## Global Constraints

- No new dependencies — lucide-react (`UserPlus`, `Loader2`) is already in `frontend/package.json`.
- Backend error shape confirmed via Django test-client probe: `{"detail": "<message>"}`, NOT `{"message": ...}`. Proxy (already fixed in prior commit) forwards this body verbatim with the real status on failure.
- Confirmed exact backend strings: 404 invite → `"No account exists for {email}."`; 400 invite → `"{email} already has access."`; 403 not-owner → `"{email} is not the owner."`. Per design spec D3, display the **specified UX copy**, chosen by status code, not the raw backend string verbatim (raw string is a fallback for unmapped statuses only).
- Revoke POST body MUST be `JSON.stringify({})` with `Content-Type: application/json` — proxy's POST handler calls `request.json()` unconditionally and throws on an empty body.
- Revoke and invite responses are both JSON (200 and 201 respectively), never 204 — always `await res.json()`.
- No toasts, no confirm dialog on revoke, no owner row in the collaborator list, no role/permission levels. Do not touch `DocEditor.jsx`'s own toolbar or `docs/page.js`.
- SWR key for collaborators must be `null` while the Sheet is closed (conditional fetching).

---

### Task 1: ShareSheet.jsx component

**Files:**
- Create: `frontend/src/components/editor/ShareSheet.jsx`

**Interfaces:**
- Consumes: `Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription` from `frontend/src/components/ui/sheet.jsx`; `Button` from `ui/button`; `Input` from `ui/input`; `Label` from `ui/label`; `useSWR` from `swr`; `fetcher` from `@/lib/fetcher`.
- Produces: default export `ShareSheet({ docId })` — a self-contained trigger button + Sheet. Rendered by `page.js` as `<ShareSheet docId={docId} />`.

- [ ] **Step 1: Write the component shell — open state, trigger button, Sheet skeleton**

```jsx
"use client"

import { useState } from "react"
import useSWR from "swr"
import { UserPlus, Loader2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import fetcher from "@/lib/fetcher"

const ERROR_COPY = {
  404: "No account exists for that email.",
  400: "That person already has access.",
  403: "Only the owner can share this document.",
}

export default function ShareSheet({ docId }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [revokingId, setRevokingId] = useState(null)

  const collaboratorsKey = open ? `/api/documents/${docId}/collaborators/` : null
  const { data: collaborators, isLoading, mutate } = useSWR(collaboratorsKey, fetcher)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Share
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Share document</SheetTitle>
          <SheetDescription>
            Invite people to collaborate on this document.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify it renders — manual check**

Not unit-tested (no JS test harness in this repo). Deferred to Task 3's browser verification. For now just confirm no syntax errors: `node --check` won't work on JSX, so rely on the dev server (Task 3) to catch import/syntax errors.

- [ ] **Step 3: Add the invite form with autofocus, error block, and disabled-while-inflight state**

Insert into `SheetContent`, after `SheetHeader`:

```jsx
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setInviting(true)
            setInviteError("")
            const res = await fetch(`/api/documents/${docId}/invite/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            })
            const data = await res.json()
            if (res.ok) {
              setEmail("")
              mutate()
            } else {
              setInviteError(ERROR_COPY[res.status] || data.detail || "Something went wrong.")
            }
            setInviting(false)
          }}
          className="space-y-2 mt-4"
        >
          <Label htmlFor="invite-email">Invite by email</Label>
          <Input
            id="invite-email"
            type="email"
            required
            autoFocus
            aria-invalid={!!inviteError}
            disabled={inviting}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
          />
          <p className="text-sm text-muted-foreground">They&apos;ll need an existing account.</p>
          {inviteError && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {inviteError}
            </div>
          )}
          <Button type="submit" size="sm" disabled={inviting || !email}>
            {inviting ? "Inviting…" : "Invite"}
          </Button>
        </form>
```

- [ ] **Step 4: Add the collaborator list — loading skeletons, empty state, rows with Remove**

Append after the form, still inside `SheetContent`:

```jsx
        <div className="mt-6 space-y-2">
          {isLoading ? (
            [0, 1].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))
          ) : collaborators && collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one else has access yet. Invite someone above.
            </p>
          ) : (
            collaborators?.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-2 rounded-md border p-2 ${
                  revokingId === c.id ? "opacity-50" : ""
                }`}
              >
                <span className="truncate text-sm">{c.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${c.email}`}
                  disabled={revokingId === c.id}
                  onClick={async () => {
                    setRevokingId(c.id)
                    await fetch(
                      `/api/documents/${docId}/collaborators/${c.id}/revoke/`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({}),
                      }
                    )
                    setRevokingId(null)
                    mutate()
                  }}
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
```

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/components/editor/ShareSheet.jsx"
git commit -m "Add ShareSheet component for document collaborator invite/revoke"
```

---

### Task 2: Wire ShareSheet into the doc detail page + fix the 403 branch

**Files:**
- Modify: `frontend/src/app/docs/[docId]/page.js`

**Interfaces:**
- Consumes: `ShareSheet` default export from Task 1 (`@/components/editor/ShareSheet`), `doc.is_owner` field (already present on the backend `DocSchema`, confirmed via probe: `owner doc detail` → `{"is_owner": true, ...}`).
- Produces: nothing consumed by later tasks — this is the last task.

- [ ] **Step 1: Import ShareSheet and Card/Button pieces**

At the top of `page.js`, alongside existing imports:

```jsx
import ShareSheet from "@/components/editor/ShareSheet";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
```

- [ ] **Step 2: Replace the dead 401 branch (lines ~37-39) with a 403 check + Card**

Current code (`page.js:33-44`):

```jsx
  if (error) {
    if (!isAuthenticated && error.status === 401) {
      window.location.href='/login'
    }
    if (isAuthenticated && error.status === 401) {
      return <div>Invite required</div>
    }
    if (error.status === 404) {
      return <div>Doc not found</div>
    }
    return <div>{error.message} {error.status}</div>
  }
```

Replace with:

```jsx
  if (error) {
    if (!isAuthenticated && error.status === 401) {
      window.location.href='/login'
    }
    if (isAuthenticated && error.status === 403) {
      return (
        <div className="max-w-md mx-auto mt-flowmind-xl text-center">
          <Card>
            <CardHeader>
              <CardTitle>This is a private document</CardTitle>
              <CardDescription>
                You don&apos;t have access. Ask the document&apos;s owner to invite you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/docs">Back to documents</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    if (error.status === 404) {
      return <div>Doc not found</div>
    }
    return <div>{error.message} {error.status}</div>
  }
```

(`Link` and `Button` are already imported in this file.)

- [ ] **Step 3: Add the page-level action row with the Share button, gated on `doc.is_owner`**

Current top of the returned JSX (`page.js:85-87`):

```jsx
  return <>
    <div className="px-4">
      <form id="doc-edit-form" onSubmit={handleSubmit} className='space-y-2'>
```

Replace with:

```jsx
  return <>
    <div className="px-4">
      {doc.is_owner && (
        <div className="flex justify-end mb-2">
          <ShareSheet docId={docId} />
        </div>
      )}
      <form id="doc-edit-form" onSubmit={handleSubmit} className='space-y-2'>
```

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/docs/[docId]/page.js"
git commit -m "Wire Share button + private-document empty state into doc detail page"
```

---

### Task 3: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start backend + frontend** (via `run` skill or manually: `python manage.py runserver` in `backend/src`, `npm run dev` in `frontend`)
- [ ] **Step 2: Log in as `probe-owner@example.com` / `testpass123`** (test account created during API probing; already the owner of a doc titled "Probe Doc"), open that doc, confirm the Share button appears top-right and opens the Sheet.
- [ ] **Step 3: Invite `probe-other@example.com`** (existing test account) — confirm the row appears in the list, input clears.
- [ ] **Step 4: Invite a nonexistent email** (e.g. `nobody-xyz@example.com`) — confirm inline error "No account exists for that email." appears and the Sheet stays open.
- [ ] **Step 5: Click Remove on the collaborator row** — confirm it disappears from the list and empty-state copy appears if it was the only one.
- [ ] **Step 6: Log in as `probe-other@example.com` (or a fresh second account) with no collaborator access, visit the owner's doc URL directly** — confirm the "This is a private document" Card renders, not raw error text.
- [ ] **Step 7: Report results** — state exactly what was verified live in-browser vs by code inspection only, per the task's done-condition.

---

## Self-Review

**Spec coverage:** D1 (Share button, is_owner-gated, page-level) — Task 2 Step 3. D2 (ShareSheet component, invite form, SWR list, revoke w/ JSON body) — Task 1. D3 (inline errors, exact destructive classes, status-mapped copy) — Task 1 Step 3. D4 (403 branch fix + Card) — Task 2 Step 2. A11y/empty/loading (Label htmlFor, aria-invalid, autofocus, aria-label on Remove, empty-state copy, skeleton rows, disabled-while-inflight) — Task 1 Steps 3-4. Out-of-scope items (no owner row, no toasts, no confirm dialog, no DocEditor/docs-page changes) — respected by construction (not implemented).

**Placeholder scan:** No TBD/TODO; all steps contain complete, pasteable code.

**Type consistency:** `ShareSheet({ docId })` prop name matches the call site `<ShareSheet docId={docId} />` in Task 2. `collaborators` shape (`{id, email, active, created_at}`) matches the confirmed `CollaboratorSchema` from the probe output.
