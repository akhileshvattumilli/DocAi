# Doc Sharing Backend (invite/collaborators) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add owner-only invite/list/revoke API for `DocUser` collaborators on `Doc`, backed by a de-dup migration + unique constraint, without breaking existing document endpoints.

**Architecture:** Extend the existing Django Ninja `documents` app (models/exceptions/services/schemas/api) with new service functions and routes. No new app, no new models — `DocUser` already exists as the join table.

**Tech Stack:** Django 5.1.5, django-ninja 1.3.0, sqlite (this worktree, isolated dev DB — no `.env`, defaults to `db.sqlite3`), `accounts.MyUser` (email is the unique username field).

## Global Constraints
- Do not touch any file outside `backend/src/documents/` (per orchestrator scope).
- Revoke endpoint must return 200 + JSON body (not 204) — Next.js proxy calls `.json()` unconditionally.
- Use `filter(...).order_by("-id").first()` instead of `get_or_create`/`get` for the (doc,user) lookup in invite — dev DB may have pre-existing duplicate rows before the migration runs.
- Migration must de-duplicate existing `(doc,user)` rows (keep highest id) before adding the `UniqueConstraint`.

---

## Task 1: Exceptions

**Files:**
- Modify: `backend/src/documents/exceptions.py`

**Interfaces:**
- Produces: `UserNotFound(Exception)`, `AlreadyCollaborator(Exception)` — consumed by Task 3 (services.py) and Task 5 (api.py).

- [ ] **Step 1: Add the two new exception classes**

```python
class DocumentNotFound(Exception):
    pass

class UserNoPermissionNotAllowed(Exception):
    pass

class UserNotFound(Exception):
    pass

class AlreadyCollaborator(Exception):
    pass
```

- [ ] **Step 2: Sanity check**

Run: `cd backend/src && python -c "from documents import exceptions; exceptions.UserNotFound; exceptions.AlreadyCollaborator; print('ok')"`
Expected: `ok`

---

## Task 2: Migration — de-dup + unique constraint

**Files:**
- Create: `backend/src/documents/migrations/0005_docuser_unique_doc_user.py`
- Modify: `backend/src/documents/models.py`

**Interfaces:**
- Produces: `DocUser.Meta.constraints = [UniqueConstraint(fields=["doc","user"], name="unique_doc_user")]`, relied on implicitly by Task 3's invite logic (not enforced in code, but documents the invariant going forward).

- [ ] **Step 1: Add the Meta constraint to the model**

In `backend/src/documents/models.py`, change the `DocUser` class to add a `Meta`:

```python
class DocUser(models.Model):
    doc = models.ForeignKey(Doc, null=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    active = models.BooleanField(default=True)
    inactive_at = models.DateTimeField(auto_now=False, auto_now_add=False, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["doc", "user"], name="unique_doc_user"),
        ]

    def save(self, *args, **kwargs):
        if not self.active and self.inactive_at is None:
            self.inactive_at = timezone.now()
        super().save(*args, **kwargs)
```

- [ ] **Step 2: Write the migration by hand (data migration + AddConstraint in one file)**

`makemigrations` alone won't write the de-dup `RunPython`, so write this file directly:

```python
from django.db import migrations, models


def dedupe_docuser(apps, schema_editor):
    DocUser = apps.get_model("documents", "DocUser")
    seen = {}
    for row in DocUser.objects.order_by("id"):
        key = (row.doc_id, row.user_id)
        if key in seen:
            # keep the highest id for this (doc,user) pair; delete the earlier one
            DocUser.objects.filter(id=seen[key]).delete()
        seen[key] = row.id


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0004_doc_yjs_state_delete_docinvite"),
    ]

    operations = [
        migrations.RunPython(dedupe_docuser, noop_reverse),
        migrations.AddConstraint(
            model_name="docuser",
            constraint=models.UniqueConstraint(fields=["doc", "user"], name="unique_doc_user"),
        ),
    ]
```

Note: iterating `order_by("id")` ascending and always deleting the previously-seen row while updating `seen[key]` to the current (higher) id means the row that survives for each group is the max id — matches the plan's "keep highest id" rule.

- [ ] **Step 3: Run `makemigrations --check --dry-run` to confirm nothing else is missing**

Run: `cd backend/src && python manage.py makemigrations --check --dry-run`
Expected: exits 0, no "Your models have changes that are not yet reflected in a migration" output (our hand-written migration above must already cover the constraint; if Django detects an additional diff, run `makemigrations documents` instead of hand-writing and merge the generated `AddConstraint` with a prepended `RunPython` data migration).

- [ ] **Step 4: Apply the migration**

Run: `cd backend/src && python manage.py migrate documents`
Expected: `Applying documents.0005_docuser_unique_doc_user... OK`

---

## Task 3: Services

**Files:**
- Modify: `backend/src/documents/services.py`

**Interfaces:**
- Consumes: `exceptions.DocumentNotFound`, `exceptions.UserNoPermissionNotAllowed`, `exceptions.UserNotFound`, `exceptions.AlreadyCollaborator` (Task 1); `models.Doc`, `models.DocUser` (Task 2).
- Produces: `_get_owned_document(user, document_id) -> Doc`, `list_collaborators(user, document_id) -> QuerySet[DocUser]`, `invite_collaborator(user, document_id, email) -> DocUser`, `revoke_collaborator(user, document_id, docuser_id) -> DocUser` — consumed by Task 5 (api.py).

- [ ] **Step 1: Add imports and the owner-fetch helper**

At the top of `backend/src/documents/services.py`, add:

```python
from django.contrib.auth import get_user_model

from .models import Doc, DocUser
```

(keep the existing `from .models import Doc` — replace it with the combined import above so `DocUser` is available too.)

Append after `get_document`:

```python
def _get_owned_document(user, document_id):
    try:
        obj = Doc.objects.get(id=document_id)
    except Doc.DoesNotExist:
        raise exceptions.DocumentNotFound(f"{document_id} not found.")
    if obj.user_id != user.id:
        raise exceptions.UserNoPermissionNotAllowed(f"{user} is not the owner.")
    return obj
```

- [ ] **Step 2: Add `list_collaborators`**

```python
def list_collaborators(user, document_id):
    doc = _get_owned_document(user, document_id)
    return doc.docuser_set.filter(active=True, user__isnull=False).select_related("user")
```

- [ ] **Step 3: Add `invite_collaborator`**

```python
def invite_collaborator(user, document_id, email):
    doc = _get_owned_document(user, document_id)
    User = get_user_model()
    try:
        invited_user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        raise exceptions.UserNotFound(f"No account exists for {email}.")

    doc_user = DocUser.objects.filter(doc=doc, user=invited_user).order_by("-id").first()
    if doc_user is not None:
        if doc_user.active:
            raise exceptions.AlreadyCollaborator(f"{email} already has access.")
        doc_user.active = True
        doc_user.inactive_at = None
        doc_user.save()
        return doc_user
    return DocUser.objects.create(doc=doc, user=invited_user)
```

- [ ] **Step 4: Add `revoke_collaborator`**

```python
def revoke_collaborator(user, document_id, docuser_id):
    doc = _get_owned_document(user, document_id)
    try:
        doc_user = doc.docuser_set.get(id=docuser_id)
    except DocUser.DoesNotExist:
        raise exceptions.DocumentNotFound(f"Collaborator {docuser_id} not found.")
    doc_user.active = False
    doc_user.save()
    return doc_user
```

- [ ] **Step 5: Import check**

Run: `cd backend/src && python -c "from documents import services; print('ok')"`
Expected: `ok` (catches typos/syntax errors before wiring the API layer)

---

## Task 4: Schemas

**Files:**
- Modify: `backend/src/documents/schemas.py`

**Interfaces:**
- Produces: `CollaboratorSchema`, `InviteSchema`, `DocSchema.is_owner: bool` — consumed by Task 5 (api.py).

- [ ] **Step 1: Add `is_owner` to `DocSchema` and the two new schemas**

```python
import uuid
from datetime import datetime
from ninja import Schema, Field

# Schema -> Pydantic BaseModel

class DocSchema(Schema):
    id: uuid.UUID
    title: str
    content: str | None = Field(default="")
    is_owner: bool = False


class DocCreateSchema(Schema):
    title: str

class DocUpdateSchema(Schema):
    title: str
    content: str


class CollaboratorSchema(Schema):
    id: int
    email: str = Field(alias="user.email")
    active: bool
    created_at: datetime


class InviteSchema(Schema):
    email: str
```

Note: `Field(alias="user.email")` lets Ninja/Pydantic resolve `obj.user.email` directly without a custom `resolve_email` method — simpler and equivalent to a resolver for a single dotted attribute lookup.

- [ ] **Step 2: Import check**

Run: `cd backend/src && python -c "from documents import schemas; schemas.CollaboratorSchema; schemas.InviteSchema; print('ok')"`
Expected: `ok`

---

## Task 5: API routes

**Files:**
- Modify: `backend/src/documents/api.py`

**Interfaces:**
- Consumes: `services.list_collaborators`, `services.invite_collaborator`, `services.revoke_collaborator` (Task 3); `schemas.CollaboratorSchema`, `schemas.InviteSchema` (Task 4); `exceptions.UserNotFound`, `exceptions.AlreadyCollaborator` (Task 1).

- [ ] **Step 1: Update imports**

```python
from typing import List
from ninja import Router, Schema
from ninja.errors import HttpError

from helpers.api.auth.permissions import user_required

from .models import Doc
from .schemas import DocSchema, DocUpdateSchema, DocCreateSchema, CollaboratorSchema, InviteSchema
from . import exceptions as doc_exceptions
from . import services as doc_services

router = Router()
```

- [ ] **Step 2: Set `is_owner` in `document_detail_view` and `document_update_view`**

```python
@router.get("/{document_id}/", response=DocSchema, auth=user_required)
def document_detail_view(request, document_id):
    obj = http_document_detail(request, document_id)
    obj.is_owner = (obj.user_id == request.user.id)
    return obj


@router.put("/{document_id}/", response=DocSchema, auth=user_required)
def document_update_view(request, document_id, payload:DocUpdateSchema):
    obj = http_document_detail(request, document_id)
    update_data = payload.model_dump()
    for key, val in update_data.items():
        setattr(obj, key, val)
    obj.save()
    obj.is_owner = (obj.user_id == request.user.id)
    return obj
```

- [ ] **Step 3: Add collaborators list + invite + revoke routes, and a shared exception mapper**

Append to `backend/src/documents/api.py`:

```python
def _map_collaborator_exception(e):
    if isinstance(e, doc_exceptions.DocumentNotFound):
        raise HttpError(404, f"{e}")
    if isinstance(e, doc_exceptions.UserNoPermissionNotAllowed):
        raise HttpError(403, f"{e}")
    if isinstance(e, doc_exceptions.UserNotFound):
        raise HttpError(404, f"{e}")
    if isinstance(e, doc_exceptions.AlreadyCollaborator):
        raise HttpError(400, f"{e}")
    raise HttpError(500, "Unknown server error")


@router.get("/{document_id}/collaborators/", response=List[CollaboratorSchema], auth=user_required)
def collaborators_list_view(request, document_id):
    try:
        return doc_services.list_collaborators(request.user, document_id)
    except (doc_exceptions.DocumentNotFound, doc_exceptions.UserNoPermissionNotAllowed) as e:
        _map_collaborator_exception(e)


@router.post("/{document_id}/invite/", response={201: CollaboratorSchema}, auth=user_required)
def invite_collaborator_view(request, document_id, payload: InviteSchema):
    try:
        obj = doc_services.invite_collaborator(request.user, document_id, payload.email)
    except (
        doc_exceptions.DocumentNotFound,
        doc_exceptions.UserNoPermissionNotAllowed,
        doc_exceptions.UserNotFound,
        doc_exceptions.AlreadyCollaborator,
    ) as e:
        _map_collaborator_exception(e)
    return 201, obj


class RevokeSchema(Schema):
    pass


@router.post("/{document_id}/collaborators/{docuser_id}/revoke/", response={200: CollaboratorSchema}, auth=user_required)
def revoke_collaborator_view(request, document_id, docuser_id, payload: RevokeSchema = None):
    try:
        obj = doc_services.revoke_collaborator(request.user, document_id, docuser_id)
    except (doc_exceptions.DocumentNotFound, doc_exceptions.UserNoPermissionNotAllowed) as e:
        _map_collaborator_exception(e)
    return 200, obj
```

- [ ] **Step 4: Empirically verify the revoke route accepts a bodyless/`{}` POST**

This is the one open question from the plan — Ninja's payload parsing behavior for an optional body schema isn't assumed, it's checked:

Run: `cd backend/src && python manage.py runserver 8001 &` then in another shell, after creating a user/doc/docuser via the Task 6 shell script (do this step after Task 6's Step 1 data exists), hit the endpoint with curl:

```bash
curl -i -X POST http://127.0.0.1:8001/api/documents/<doc_id>/collaborators/<docuser_id>/revoke/ \
  -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" -d '{}'
```

Expected: `HTTP/1.1 200 OK` with a JSON body containing `"active": false`. If Ninja rejects `payload: RevokeSchema = None` (e.g. requires a body even when None-defaulted, or errors on missing `Content-Type`), remove the default (`payload: RevokeSchema`) so `{}` is required, or drop the parameter entirely and confirm ninja tolerates POST routes with zero declared body params — adjust based on what actually happens, note the resolution in the final report.

Kill the dev server (`kill %1` or Ctrl-C) once verified.

- [ ] **Step 5: Import check**

Run: `cd backend/src && python -c "from documents import api; print('ok')"`
Expected: `ok`

---

## Task 6: End-to-end manual verification

**Files:** none (verification only — no code changes)

- [ ] **Step 1: Write and run a throwaway verification script via `manage.py shell`**

Save as `/tmp/verify_sharing.py` (or pipe via `manage.py shell < script`) — do NOT commit this file:

```python
from django.contrib.auth import get_user_model
from documents.models import Doc, DocUser
from documents import services, exceptions

User = get_user_model()

owner = User.objects.create_user(email="owner@example.com", password="pw12345")
collab = User.objects.create_user(email="collab@example.com", password="pw12345")
doc = Doc.objects.create(user=owner, title="Test doc")

# invite
du = services.invite_collaborator(owner, doc.id, "collab@example.com")
assert du.active is True
assert DocUser.objects.filter(doc=doc, user=collab).count() == 1
print("invite OK, docuser id:", du.id)

# re-invite while active -> AlreadyCollaborator
try:
    services.invite_collaborator(owner, doc.id, "collab@example.com")
    print("FAIL: expected AlreadyCollaborator")
except exceptions.AlreadyCollaborator:
    print("AlreadyCollaborator raised correctly")

# revoke
revoked = services.revoke_collaborator(owner, doc.id, du.id)
assert revoked.active is False
assert revoked.inactive_at is not None
print("revoke OK")

# re-invite after revoke -> reactivate, no duplicate row
reactivated = services.invite_collaborator(owner, doc.id, "collab@example.com")
assert reactivated.id == du.id, "should reuse the same row, not create a new one"
assert reactivated.active is True
assert DocUser.objects.filter(doc=doc, user=collab).count() == 1
print("reactivate OK, still one row")

# list_collaborators
collabs = list(services.list_collaborators(owner, doc.id))
assert len(collabs) == 1
print("list_collaborators OK:", [(c.id, c.user.email, c.active) for c in collabs])

print("ALL CHECKS PASSED")
```

Run: `cd backend/src && python manage.py shell < /tmp/verify_sharing.py`
Expected: `ALL CHECKS PASSED` printed with no `AssertionError` or unhandled traceback above it.

- [ ] **Step 2: Clean up test data (this is a throwaway sqlite dev DB local to the worktree, but keep it tidy)**

Run: `cd backend/src && python manage.py shell -c "from django.contrib.auth import get_user_model; get_user_model().objects.filter(email__in=['owner@example.com','collab@example.com']).delete()"`
Expected: no error (cascades delete the Doc via `on_delete=models.SET_NULL`... note: Doc.user is SET_NULL so the Doc row survives with user=None; that's fine, it's throwaway sqlite).

---

## Task 7: Final migration check + report

- [ ] **Step 1: Re-run makemigrations check**

Run: `cd backend/src && python manage.py makemigrations --check --dry-run`
Expected: exit code 0, no output about missing migrations.

- [ ] **Step 2: Confirm migrate is clean from scratch is not required — just confirm current state is migrated**

Run: `cd backend/src && python manage.py showmigrations documents`
Expected: all migrations including `0005_docuser_unique_doc_user` show `[X]`.

- [ ] **Step 3: Report to orchestrator via SendMessage(to="main")**

Summarize: files touched, migration approach (hand-written RunPython + AddConstraint), how each of the 4 done-conditions from the task brief was verified (paste the actual verification output/observations, especially the Task 5 Step 4 curl result for the revoke body question). Mark Task 1 completed in TaskUpdate only after this message is sent and all checks above passed.
