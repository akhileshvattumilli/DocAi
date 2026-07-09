"use client"

import { useState } from "react"
import useSWR from "swr"
import { UserPlus } from "lucide-react"
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
  const [revokeError, setRevokeError] = useState(null)

  const collaboratorsKey = open ? `/api/documents/${docId}/collaborators/` : null
  const { data: collaborators, isLoading, mutate } = useSWR(collaboratorsKey, fetcher)

  async function handleInvite(event) {
    event.preventDefault()
    setInviting(true)
    setInviteError("")
    try {
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
        setInviteError(data.detail || ERROR_COPY[res.status] || "Something went wrong.")
      }
    } catch (e) {
      setInviteError("Something went wrong. Please try again.")
    } finally {
      setInviting(false)
    }
  }

  async function handleRevoke(collaboratorId) {
    setRevokingId(collaboratorId)
    setRevokeError(null)
    try {
      const res = await fetch(`/api/documents/${docId}/collaborators/${collaboratorId}/revoke/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        mutate()
      } else {
        setRevokeError({
          id: collaboratorId,
          message: data.detail || ERROR_COPY[res.status] || "Could not remove this person.",
        })
      }
    } catch (e) {
      setRevokeError({ id: collaboratorId, message: "Could not remove this person. Please try again." })
    } finally {
      setRevokingId(null)
    }
  }

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

        <form onSubmit={handleInvite} className="space-y-2 mt-4">
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
            <div className="bg-destructive/15 text-destructive-strong border border-destructive/25 text-sm p-3 rounded-md">
              {inviteError}
            </div>
          )}
          <Button type="submit" size="sm" disabled={inviting || !email}>
            {inviting ? "Inviting…" : "Invite"}
          </Button>
        </form>

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
              <div key={c.id}>
                <div
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
                    onClick={() => handleRevoke(c.id)}
                  >
                    Remove
                  </Button>
                </div>
                {revokeError?.id === c.id && (
                  <div className="bg-destructive/15 text-destructive-strong border border-destructive/25 text-sm p-3 rounded-md mt-1">
                    {revokeError.message}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
