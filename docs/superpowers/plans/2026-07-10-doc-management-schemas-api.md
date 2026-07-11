# Doc Management: Schemas + API Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up `documents/schemas.py`, `documents/api.py`, two new sibling
routers (`documents/folders_api.py`, `documents/tags_api.py`), and mount them
in `cfehome/api.py`, so the already-implemented `services.py` layer (trash,
restore, delete-forever, rename, duplicate, move, folder CRUD, tag
add/remove, comments) is reachable over HTTP with the exact URLs, methods,
and status codes the architecture doc specifies.

**Architecture:** Django Ninja `Router` per resource. `documents/api.py` owns
`/documents/...` (doc CRUD + all doc-scoped mutating actions). Two new tiny
sibling routers own `/folders/...` and `/tags/...` (owner-scoped resources,
not doc-scoped, so they don't nest under `{document_id}`). A single shared
exception→HTTP helper (`_call`) lives in `api.py` and is imported by the two
new router files to keep the mapping DRY without touching `exceptions.py`.
**Every mutating endpoint is POST** — the Next.js proxy has no DELETE
handler; this is a hard, verified constraint, not a style choice.

**Tech Stack:** Django, django-ninja (`Schema`, `Router`, `HttpError`), the
existing `documents.services` module (unmodified, already implemented),
Python 3.

## Global Constraints

- Every new mutating endpoint uses `@router.post`, never `@router.delete`.
- Empty-body actions (trash, restore, delete-forever, empty-trash, duplicate,
  tags-remove, folder-delete) take `EmptyPayloadSchema` (a `Schema` with no
  fields) as their body parameter — the frontend will always send `{}`.
- Do not modify `documents/services.py`, `documents/exceptions.py`, or
  `documents/models.py` — they are already implemented and approved.
- `author_email` on comment schemas must be `str | None` (nullable) — a
  commenter's account can be `SET_NULL`'d.
- Comments use two flat, non-recursive schemas (`CommentSchema`,
  `ReplyCommentSchema`) — never a self-referential schema.
- `DocSchema` gains `is_owner`, `deleted_at`, `folder_id`, `tags`,
  `created_at` exactly as specified below.
- Route `/documents/trash/empty/` must be registered before the
  `/documents/{document_id}/...` routes in `api.py`, per the architecture
  doc's ordering note (no real collision risk, but keep the ordering for
  clarity/readability).
- Verification for this plan is `python manage.py check` + a manual
  curl/httpie smoke test of the full lifecycle — this app has no existing
  endpoint test suite (`documents/tests.py` is Django's default empty
  boilerplate), so no new pytest/unittest file is introduced here.

---

## File Structure

- Modify: `backend/src/documents/schemas.py` — add all new schemas, extend
  `DocSchema`.
- Modify: `backend/src/documents/api.py` — extend `document_list_view`,
  `document_detail_view`, `document_update_view`; add the shared `_call`
  exception-mapping helper; add all new doc-scoped POST/GET endpoints.
- Create: `backend/src/documents/folders_api.py` — `/folders/` sibling
  router.
- Create: `backend/src/documents/tags_api.py` — `/tags/` sibling router.
- Modify: `backend/src/cfehome/api.py` — mount the two new routers.

**Interfaces already available (from `documents/services.py`, do not
redefine):**
```python
list_documents(user=None, folder_id=None, trash=False, force=False)
create_document(user=None, title=None)
get_document(user=None, document_id=None)
trash_document(user, document_id)
restore_document(user, document_id)
delete_document_forever(user, document_id)
empty_trash(user)
rename_document(user, document_id, title)
duplicate_document(user, document_id)
move_document(user, document_id, folder_id)
list_folders(user)
create_folder(user, name)
rename_folder(user, folder_id, name)
delete_folder(user, folder_id)
list_tags(user)
add_tag_to_document(user, document_id, name)
remove_tag_from_document(user, document_id, tag_id)
list_comments(user, document_id)
add_comment(user, document_id, body, parent_id=None)
resolve_comment(user, document_id, comment_id, resolved)
delete_comment(user, document_id, comment_id)
```
Exceptions available (`documents/exceptions.py`): `DocumentNotFound`,
`UserNoPermissionNotAllowed`, `FolderNotFound`, `FolderAlreadyExists`,
`CommentNotFound`, `AlreadyInTrash`, `NotInTrash`. Plus plain `ValueError`
for blank-title/blank-name validation (raised directly by services.py).

---

### Task 1: `documents/schemas.py` additions

**Files:**
- Modify: `backend/src/documents/schemas.py`

- [ ] **Step 1: Write the new schemas and extend `DocSchema`**

Replace the full file contents with:

```python
import uuid
from datetime import datetime
from typing import List, Optional
from ninja import Schema, Field

# Schema -> Pydantic BaseModel

class TagSchema(Schema):
    id: int
    name: str


class FolderSchema(Schema):
    id: int
    name: str
    created_at: datetime


class DocSchema(Schema):
    id: uuid.UUID
    title: str
    content: str | None = Field(default="")
    is_owner: bool = False
    deleted_at: datetime | None = None
    folder_id: int | None = Field(default=None, alias="folder_id")
    tags: List[TagSchema] = []
    created_at: datetime


class DocCreateSchema(Schema):
    title: str

class DocUpdateSchema(Schema):
    title: str
    content: str


class RenameSchema(Schema):
    title: str


class MoveSchema(Schema):
    folder_id: int | None


class CreateFolderSchema(Schema):
    name: str


class AddTagSchema(Schema):
    name: str


class ReplyCommentSchema(Schema):
    id: int
    body: str
    created_at: datetime
    updated_at: datetime
    author_email: str | None = Field(default=None, alias="user.email")
    parent_id: int | None


class CommentSchema(Schema):
    id: int
    body: str
    resolved: bool
    created_at: datetime
    updated_at: datetime
    author_email: str | None = Field(default=None, alias="user.email")
    parent_id: int | None
    replies: List[ReplyCommentSchema] = []


class CreateCommentSchema(Schema):
    body: str
    parent_id: int | None = None


class ResolveCommentSchema(Schema):
    resolved: bool


class EmptyPayloadSchema(Schema):
    pass
```

Note: `Optional` import is unused if we stick to `X | None` syntax throughout
(Python 3.10+ union syntax, matching the existing file's style) — drop the
`Optional` import if not used, to avoid an unused-import lint flag.

- [ ] **Step 2: Verify Python syntax**

Run: `cd "backend/src" && python -c "import ast; ast.parse(open('documents/schemas.py').read())"`
Expected: no output (parses cleanly).

- [ ] **Step 3: Commit**

```bash
git add backend/src/documents/schemas.py
git commit -m "feat(documents): add schemas for folders, tags, comments, doc lifecycle actions"
```

---

### Task 2: `documents/api.py` — extend existing views + shared exception helper

**Files:**
- Modify: `backend/src/documents/api.py`

**Produces:** module-level `_call(fn, *args, **kwargs)` helper, importable
as `from .api import _call` by Task 3's router files.

- [ ] **Step 1: Rewrite imports and add the `_call` helper + extend existing views**

Replace the top of the file (through the existing `document_update_view`)
with:

```python
from typing import List
from ninja import Router
from ninja.errors import HttpError

from helpers.api.auth.permissions import user_required

from .models import Doc
from .schemas import (
    DocSchema, DocUpdateSchema, DocCreateSchema,
    RenameSchema, MoveSchema, AddTagSchema,
    CreateCommentSchema, ResolveCommentSchema, CommentSchema,
    EmptyPayloadSchema,
)
from . import exceptions as doc_exceptions
from . import services as doc_services

router = Router()


def _call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except doc_exceptions.DocumentNotFound as e:
        raise HttpError(404, f"{e}")
    except doc_exceptions.FolderNotFound as e:
        raise HttpError(404, f"{e}")
    except doc_exceptions.CommentNotFound as e:
        raise HttpError(404, f"{e}")
    except doc_exceptions.UserNoPermissionNotAllowed as e:
        raise HttpError(403, f"{e}")
    except doc_exceptions.FolderAlreadyExists as e:
        raise HttpError(400, f"{e}")
    except doc_exceptions.AlreadyInTrash as e:
        raise HttpError(400, f"{e}")
    except doc_exceptions.NotInTrash as e:
        raise HttpError(400, f"{e}")
    except ValueError as e:
        raise HttpError(400, f"{e}")


@router.get("/", response=List[DocSchema], auth=user_required)
def document_list_view(request, folder_id: int = None, trash: bool = False):
    qs = doc_services.list_documents(request.user, folder_id=folder_id, trash=trash)
    for obj in qs:
        obj.is_owner = (obj.user_id == request.user.id)
    return qs

@router.post("/", response={201: DocSchema}, auth=user_required)
def document_create_view(request, payload:DocCreateSchema):
    obj = doc_services.create_document(user=request.user, title=payload.title)
    if obj is None:
        raise HttpError(400, "Invalid data, try again.")
    obj.is_owner = True
    return 201, obj

def http_document_detail(request, document_id):
    try:
        obj = doc_services.get_document(user=request.user, document_id=document_id)
    except doc_exceptions.DocumentNotFound as e:
        raise HttpError(404, f"{e}")
    except doc_exceptions.UserNoPermissionNotAllowed as e:
        raise HttpError(403, f"{e}")
    except:
        raise HttpError(500, "Unknown server error")
    if obj is None:
        raise HttpError(404, f"{document_id} is not found")
    return obj

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
    # obj.last_updated_by = request.user
    obj.save()
    obj.is_owner = (obj.user_id == request.user.id)
    return obj
```

Notes:
- `document_create_view` gains `obj.is_owner = True` — the created doc always
  belongs to the creator, and `DocSchema` now requires the field to be
  meaningful (defaulting to `False` here would misrepresent ownership to the
  frontend on the create response).
- The old commented-out `@router.delete(...)` block at the bottom of the
  original file is dropped entirely — it was dead code that could never work
  through the proxy (see Global Constraints); do not resurrect it as POST
  either, its behavior is fully superseded by `trash`/`delete-forever` below.

- [ ] **Step 2: Add the new doc-scoped endpoints**

Append to the end of `backend/src/documents/api.py`:

```python

@router.post("/trash/empty/", response={200: EmptyPayloadSchema}, auth=user_required)
def document_trash_empty_view(request, payload: EmptyPayloadSchema):
    doc_services.empty_trash(request.user)
    return 200, {}


@router.post("/{document_id}/trash/", response={200: DocSchema}, auth=user_required)
def document_trash_view(request, document_id, payload: EmptyPayloadSchema):
    obj = _call(doc_services.trash_document, request.user, document_id)
    obj.is_owner = (obj.user_id == request.user.id)
    return 200, obj


@router.post("/{document_id}/restore/", response={200: DocSchema}, auth=user_required)
def document_restore_view(request, document_id, payload: EmptyPayloadSchema):
    obj = _call(doc_services.restore_document, request.user, document_id)
    obj.is_owner = (obj.user_id == request.user.id)
    return 200, obj


@router.post("/{document_id}/delete-forever/", response={200: EmptyPayloadSchema}, auth=user_required)
def document_delete_forever_view(request, document_id, payload: EmptyPayloadSchema):
    _call(doc_services.delete_document_forever, request.user, document_id)
    return 200, {}


@router.post("/{document_id}/rename/", response={200: DocSchema}, auth=user_required)
def document_rename_view(request, document_id, payload: RenameSchema):
    obj = _call(doc_services.rename_document, request.user, document_id, payload.title)
    obj.is_owner = (obj.user_id == request.user.id)
    return 200, obj


@router.post("/{document_id}/duplicate/", response={201: DocSchema}, auth=user_required)
def document_duplicate_view(request, document_id, payload: EmptyPayloadSchema):
    obj = _call(doc_services.duplicate_document, request.user, document_id)
    obj.is_owner = (obj.user_id == request.user.id)
    return 201, obj


@router.post("/{document_id}/move/", response={200: DocSchema}, auth=user_required)
def document_move_view(request, document_id, payload: MoveSchema):
    obj = _call(doc_services.move_document, request.user, document_id, payload.folder_id)
    obj.is_owner = (obj.user_id == request.user.id)
    return 200, obj


@router.post("/{document_id}/tags/", response={201: DocSchema}, auth=user_required)
def document_tag_add_view(request, document_id, payload: AddTagSchema):
    obj = _call(doc_services.add_tag_to_document, request.user, document_id, payload.name)
    obj.is_owner = (obj.user_id == request.user.id)
    return 201, obj


@router.post("/{document_id}/tags/{tag_id}/remove/", response={200: DocSchema}, auth=user_required)
def document_tag_remove_view(request, document_id, tag_id, payload: EmptyPayloadSchema):
    obj = _call(doc_services.remove_tag_from_document, request.user, document_id, tag_id)
    obj.is_owner = (obj.user_id == request.user.id)
    return 200, obj


@router.get("/{document_id}/comments/", response=List[CommentSchema], auth=user_required)
def document_comments_list_view(request, document_id):
    return _call(doc_services.list_comments, request.user, document_id)


@router.post("/{document_id}/comments/", response={201: CommentSchema}, auth=user_required)
def document_comments_create_view(request, document_id, payload: CreateCommentSchema):
    obj = _call(doc_services.add_comment, request.user, document_id, payload.body, payload.parent_id)
    return 201, obj


@router.post("/{document_id}/comments/{comment_id}/resolve/", response={200: CommentSchema}, auth=user_required)
def document_comments_resolve_view(request, document_id, comment_id, payload: ResolveCommentSchema):
    obj = _call(doc_services.resolve_comment, request.user, document_id, comment_id, payload.resolved)
    return 200, obj


@router.post("/{document_id}/comments/{comment_id}/delete/", response={200: EmptyPayloadSchema}, auth=user_required)
def document_comments_delete_view(request, document_id, comment_id, payload: EmptyPayloadSchema):
    _call(doc_services.delete_comment, request.user, document_id, comment_id)
    return 200, {}
```

- [ ] **Step 3: Verify Python syntax**

Run: `cd "backend/src" && python -c "import ast; ast.parse(open('documents/api.py').read())"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/src/documents/api.py
git commit -m "feat(documents): add trash/restore/rename/duplicate/move/tags/comments endpoints"
```

---

### Task 3: `documents/folders_api.py` + `documents/tags_api.py`

**Files:**
- Create: `backend/src/documents/folders_api.py`
- Create: `backend/src/documents/tags_api.py`

**Consumes:** `_call` from `documents.api` (Task 2), `FolderSchema`/
`TagSchema`/`CreateFolderSchema`/`EmptyPayloadSchema` from `documents.schemas`
(Task 1), `list_folders`/`create_folder`/`rename_folder`/`delete_folder`/
`list_tags` from `documents.services`.

**Produces:** `router` (a `ninja.Router` instance) in each file, for
`cfehome/api.py` (Task 4) to import as `folder_router` / `tag_router`.

- [ ] **Step 1: Create `folders_api.py`**

```python
from typing import List
from ninja import Router

from helpers.api.auth.permissions import user_required

from .schemas import FolderSchema, CreateFolderSchema, EmptyPayloadSchema
from . import services as doc_services
from .api import _call

router = Router()


@router.get("/", response=List[FolderSchema], auth=user_required)
def folder_list_view(request):
    return doc_services.list_folders(request.user)


@router.post("/", response={201: FolderSchema}, auth=user_required)
def folder_create_view(request, payload: CreateFolderSchema):
    obj = _call(doc_services.create_folder, request.user, payload.name)
    return 201, obj


@router.post("/{folder_id}/rename/", response={200: FolderSchema}, auth=user_required)
def folder_rename_view(request, folder_id, payload: CreateFolderSchema):
    obj = _call(doc_services.rename_folder, request.user, folder_id, payload.name)
    return 200, obj


@router.post("/{folder_id}/delete/", response={200: EmptyPayloadSchema}, auth=user_required)
def folder_delete_view(request, folder_id, payload: EmptyPayloadSchema):
    _call(doc_services.delete_folder, request.user, folder_id)
    return 200, {}
```

- [ ] **Step 2: Create `tags_api.py`**

```python
from typing import List
from ninja import Router

from helpers.api.auth.permissions import user_required

from .schemas import TagSchema
from . import services as doc_services

router = Router()


@router.get("/", response=List[TagSchema], auth=user_required)
def tag_list_view(request):
    return doc_services.list_tags(request.user)
```

- [ ] **Step 3: Verify Python syntax**

Run:
```bash
cd "backend/src" && python -c "import ast; ast.parse(open('documents/folders_api.py').read())" && python -c "import ast; ast.parse(open('documents/tags_api.py').read())"
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/src/documents/folders_api.py backend/src/documents/tags_api.py
git commit -m "feat(documents): add folders and tags sibling routers"
```

---

### Task 4: Mount new routers in `cfehome/api.py`

**Files:**
- Modify: `backend/src/cfehome/api.py`

- [ ] **Step 1: Add imports and `add_router` calls**

Change:
```python
from documents.api import router as document_router
```
to:
```python
from documents.api import router as document_router
from documents.folders_api import router as folder_router
from documents.tags_api import router as tag_router
```

Change:
```python
api.add_router('/documents', document_router)
```
to:
```python
api.add_router('/documents', document_router)
api.add_router('/folders', folder_router)
api.add_router('/tags', tag_router)
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/cfehome/api.py
git commit -m "feat(cfehome): mount folders and tags routers"
```

---

### Task 5: Verify — `manage.py check` + full-lifecycle smoke test

**Files:** none (verification only).

- [ ] **Step 1: Run Django system check**

Use the shared venv if this worktree has none of its own:
```bash
cd "backend/src" && \
  PY="/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python"; \
  [ -x "./venv/bin/python" ] && PY="./venv/bin/python"; \
  "$PY" manage.py check
```
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 2: Start the dev server in the background**

```bash
cd "backend/src" && "$PY" manage.py runserver 8010 &
```
Wait for `Starting development server at http://127.0.0.1:8010/`.

- [ ] **Step 3: Smoke test — auth**

Sign up or log in an existing test user via `/api/signup/` or `/api/login/`
to get an `access_token`; export it as `TOKEN` for subsequent curl calls
(`-H "Authorization: Bearer $TOKEN"`).

- [ ] **Step 4: Smoke test — folder + doc + rename/duplicate/move**

```bash
curl -s -X POST http://127.0.0.1:8010/api/folders/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Work"}'
# expect 201, {"id":..,"name":"Work","created_at":...}

curl -s -X POST http://127.0.0.1:8010/api/documents/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"title":"Doc A"}'
# expect 201, DocSchema with is_owner:true, folder_id:null, tags:[], created_at set

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/rename/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"title":"Doc A renamed"}'
# expect 200, title updated

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/duplicate/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# expect 201, new doc with title "Doc A renamed (copy)"

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/move/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"folder_id":<folder_id>}'
# expect 200, folder_id set

curl -s "http://127.0.0.1:8010/api/documents/?folder_id=<folder_id>" -H "Authorization: Bearer $TOKEN"
# expect list containing the moved doc only
```

- [ ] **Step 5: Smoke test — tags**

```bash
curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/tags/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Urgent"}'
# expect 201, tags:[{"id":..,"name":"urgent"}] (lowercased per service normalization)

curl -s http://127.0.0.1:8010/api/tags/ -H "Authorization: Bearer $TOKEN"
# expect [{"id":..,"name":"urgent"}]

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/tags/<tag_id>/remove/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# expect 200, tags:[]
```

- [ ] **Step 6: Smoke test — trash lifecycle**

```bash
curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/trash/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# expect 200, deleted_at set

curl -s "http://127.0.0.1:8010/api/documents/?trash=true" -H "Authorization: Bearer $TOKEN"
# expect list containing the trashed doc

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/trash/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# expect 400 (AlreadyInTrash)

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/restore/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# expect 200, deleted_at:null

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/trash/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/delete-forever/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# expect 200, {}

curl -s -X POST http://127.0.0.1:8010/api/documents/<other_doc_id>/trash/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
curl -s -X POST http://127.0.0.1:8010/api/documents/trash/empty/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# expect 200, {}
```

- [ ] **Step 7: Smoke test — comments incl. nullable author**

```bash
curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/comments/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"body":"First comment"}'
# expect 201, author_email set, parent_id:null, replies:[]

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/comments/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"body":"A reply","parent_id":<comment_id>}'
# expect 201

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/comments/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"body":"reply to reply","parent_id":<reply_id>}'
# expect 404 (CommentNotFound — "Cannot reply to a reply")

curl -s http://127.0.0.1:8010/api/documents/<doc_id>/comments/ -H "Authorization: Bearer $TOKEN"
# expect 200, top-level comment with replies:[{...}]

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/comments/<comment_id>/resolve/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"resolved":true}'
# expect 200, resolved:true

curl -s -X POST http://127.0.0.1:8010/api/documents/<doc_id>/comments/<comment_id>/delete/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
# expect 200, {}
```

For the nullable-author case: in the Django shell, create a comment, then
delete its author user (`SET_NULL` on `Comment.user`), then re-fetch
`GET /documents/<doc_id>/comments/` and confirm the response is 200 (not 500)
with `author_email: null` for that comment. Example:
```bash
"$PY" manage.py shell -c "
from documents.models import Doc, Comment
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.create_user(email='throwaway@example.com', password='x', is_active=True)
doc = Doc.objects.filter(deleted_at__isnull=True).first()
c = Comment.objects.create(doc=doc, user=u, body='will be orphaned')
print('doc_id=', doc.id, 'comment_id=', c.id)
u.delete()
"
```
Then `curl -s http://127.0.0.1:8010/api/documents/<doc_id>/comments/ -H "Authorization: Bearer $TOKEN"`
and confirm 200 with that comment's `author_email: null`.

- [ ] **Step 8: Smoke test — non-owner 403 on owner-only endpoints**

Using a second user's token (or a `DocUser` collaborator on the same doc,
`active=True`, but not the owner): confirm
`POST /documents/<doc_id>/rename/` (and trash/duplicate/move/tags-add)
return 403, while `GET/POST /documents/<doc_id>/comments/` succeed for that
same collaborator (comments are not owner-only per the scope decision).

- [ ] **Step 9: Stop the dev server**

```bash
kill %1  # or: pkill -f "manage.py runserver 8010"
```

- [ ] **Step 10: Record results**

No commit for this task (verification only) — report results to the
orchestrator per the task's done condition.

---

## Self-Review Notes

- Spec coverage: all schemas, all `api.py` endpoints, both sibling routers,
  and the `cfehome/api.py` mount from the architecture doc's "schemas.py
  additions" / "api.py additions" subsections are covered by Tasks 1–4.
- Placeholder scan: no TBD/TODO; every code step has complete, runnable code.
- Type consistency: `_call` defined once in `api.py` (Task 2), imported
  verbatim (`from .api import _call`) by `folders_api.py` (Task 3);
  `EmptyPayloadSchema`/`FolderSchema`/`TagSchema`/etc. names match between
  Task 1 (definition) and Tasks 2–3 (usage) exactly.
