# Backend services.py Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `backend/src/documents/services.py` and extend
`backend/src/documents/exceptions.py` to support document trash/restore/
delete-forever/empty-trash, rename/duplicate/move, folder CRUD, tag
add/remove, and comment CRUD — the service layer for the doc-management
suite. No API/schema/model changes in this plan (those are owned by other
tasks; models + migration 0005 already exist and are applied).

**Architecture:** Keep the existing thin-service-layer pattern already used
by `get_document`/`create_document`: plain functions taking `user` +
primitive args, raising domain exceptions from `exceptions.py`, no class
wrappers. `list_documents` moves from `.values()` dict-rows to real `Doc`
instances (needed for M2M `tags` serialization by another task's schema
work) with a 3-branch filter (default / folder_id / trash) and a
per-(user,folder_id,trash) cache key, invalidated by name at each mutation
site (no pattern-based cache clear).

**Tech Stack:** Django ORM, Django's `django.core.cache` cache framework
(already in use), Django Ninja (consumed by a separate task, not built
here).

## Global Constraints

- Do NOT touch `models.py`, `schemas.py`, `api.py`, or any frontend file —
  out of scope for this plan, owned by concurrent/subsequent tasks.
- Folders, tags, and trash are **owner-only**. Comments are accessible to
  owner + active collaborators; only author or doc owner may delete a
  comment.
- Cache invalidation must enumerate the specific 2-3 keys each mutation
  touches — no generic pattern-based cache clear.
- Single-level comment nesting is enforced by rejecting reply-to-a-reply
  (raise, don't silently reparent).
- `empty_trash` returns nothing meaningful (no count field — response
  schema owned by another task has no fields for it).
- Verification in this plan is via `python manage.py check` and manual
  `manage.py shell` smoke tests (no API layer exists yet to hit over HTTP,
  and the `documents` app has no existing pytest suite worth extending for
  a service layer that will be fully exercised end-to-end once the API
  task lands).
- Python interpreter: `/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python`
  run from `backend/src` in this worktree
  (`/Users/akhileshvattumilli/Desktop/coding archieve/DocAi-doc-management`).

---

## File Structure

- Modify `backend/src/documents/exceptions.py` — add 5 new exception
  classes, all trivial `pass`-bodied subclasses of `Exception`, matching
  the existing two.
- Modify `backend/src/documents/services.py` — rewrite `list_documents`,
  add `_get_owned_document` helper, add 15 new functions grouped by
  concern (trash lifecycle, rename/duplicate/move, folder CRUD, tags,
  comments). `create_document` and `get_document` are untouched.

## Interfaces produced by this plan (for the api.py task that follows)

```python
# exceptions.py
class FolderNotFound(Exception): pass
class FolderAlreadyExists(Exception): pass
class CommentNotFound(Exception): pass
class AlreadyInTrash(Exception): pass
class NotInTrash(Exception): pass

# services.py
def list_documents(user=None, folder_id=None, trash=False, force=False) -> list[Doc]
def _get_owned_document(user, document_id) -> Doc  # raises DocumentNotFound, UserNoPermissionNotAllowed
def trash_document(user, document_id) -> Doc
def restore_document(user, document_id) -> Doc
def delete_document_forever(user, document_id) -> None
def empty_trash(user) -> None
def rename_document(user, document_id, title) -> Doc  # raises ValueError on blank title
def duplicate_document(user, document_id) -> Doc  # returns the new copy
def move_document(user, document_id, folder_id) -> Doc  # folder_id may be None
def list_folders(user) -> QuerySet[Folder]
def create_folder(user, name) -> Folder  # raises FolderAlreadyExists
def rename_folder(user, folder_id, name) -> Folder  # raises FolderNotFound, FolderAlreadyExists
def delete_folder(user, folder_id) -> None  # raises FolderNotFound
def list_tags(user) -> QuerySet[Tag]
def add_tag_to_document(user, document_id, name) -> Doc
def remove_tag_from_document(user, document_id, tag_id) -> Doc
def list_comments(user, document_id) -> QuerySet[Comment]  # top-level only, prefetched replies
def add_comment(user, document_id, body, parent_id=None) -> Comment  # raises CommentNotFound
def resolve_comment(user, document_id, comment_id, resolved) -> Comment  # raises CommentNotFound
def delete_comment(user, document_id, comment_id) -> None  # raises CommentNotFound, UserNoPermissionNotAllowed
```

`_get_owned_document` and `list_documents`/mutations raise
`UserNoPermissionNotAllowed` for non-owners exactly like `get_document`
does today (same exception, same 403 mapping the api.py task will reuse).

---

### Task 1: Exceptions

**Files:**
- Modify: `backend/src/documents/exceptions.py`

**Interfaces:**
- Produces: `FolderNotFound`, `FolderAlreadyExists`, `CommentNotFound`,
  `AlreadyInTrash`, `NotInTrash` — all plain `Exception` subclasses.

- [ ] **Step 1: Add the five exception classes**

```python
class DocumentNotFound(Exception):
    pass

class UserNoPermissionNotAllowed(Exception):
    pass

class FolderNotFound(Exception):
    pass

class FolderAlreadyExists(Exception):
    pass

class CommentNotFound(Exception):
    pass

class AlreadyInTrash(Exception):
    pass

class NotInTrash(Exception):
    pass
```

- [ ] **Step 2: Verify with manage.py check**

Run (from `backend/src`):
```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py check
```
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 3: Commit**

```bash
git add backend/src/documents/exceptions.py
git commit -m "feat(documents): add folder/comment/trash exceptions"
```

---

### Task 2: list_documents rewrite + cache scheme

**Files:**
- Modify: `backend/src/documents/services.py`

**Interfaces:**
- Consumes: `Doc` model (`models.py`, already has `deleted_at`, `folder`,
  `tags` fields per migration 0005).
- Produces: `list_documents(user=None, folder_id=None, trash=False, force=False)`,
  plus the cache-key helper `_doc_list_cache_key(user_id, folder_id, trash)`
  used by every later mutation task to invalidate the right keys.

- [ ] **Step 1: Replace the cache constant and add a key-builder helper**

```python
from django.db.models import Q
from django.core.cache import cache
from django.utils import timezone

from . import exceptions
from .models import Doc, Folder, Tag, Comment

DOC_CACHE_TIMEOUT = 300


def _doc_list_cache_key(user_id, folder_id=None, trash=False):
    return f"documents:list:{user_id}:{folder_id}:{trash}"


def _invalidate_doc_list_cache(user_id, *, folder_ids=()):
    keys = [_doc_list_cache_key(user_id, None, False), _doc_list_cache_key(user_id, None, True)]
    for fid in folder_ids:
        keys.append(_doc_list_cache_key(user_id, fid, False))
    cache.delete_many(keys)
```

- [ ] **Step 2: Rewrite `list_documents`**

```python
def list_documents(user=None, folder_id=None, trash=False, force=False):
    if user is None:
        return []
    cache_key = _doc_list_cache_key(user.id, folder_id, trash)
    cached = cache.get(cache_key)
    if cached is not None and not force:
        return cached

    if trash:
        qs = Doc.objects.filter(user=user, deleted_at__isnull=False)
    elif folder_id is not None:
        qs = Doc.objects.filter(user=user, folder_id=folder_id, deleted_at__isnull=True)
    else:
        qs = Doc.objects.filter(
            Q(user=user) | Q(docuser__user=user, docuser__active=True),
            deleted_at__isnull=True,
        ).distinct()

    qs = qs.prefetch_related("tags")
    results = list(qs)
    cache.set(cache_key, results, timeout=DOC_CACHE_TIMEOUT)
    return results
```

- [ ] **Step 3: Verify with manage.py check**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py check
```
Expected: no issues.

- [ ] **Step 4: Manual smoke test via manage.py shell**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py shell -c "
from django.contrib.auth import get_user_model
from documents.models import Doc
from documents import services
User = get_user_model()
u, _ = User.objects.get_or_create(username='svc_smoke_test', defaults={'email': 'svc@test.com'})
d = Doc.objects.create(user=u, title='Smoke doc')
print('default list count:', len(services.list_documents(u)))
print('trash list count (should be 0):', len(services.list_documents(u, trash=True)))
d.delete()
u.delete()
"
```
Expected: `default list count: 1`, `trash list count (should be 0): 0`, no
traceback.

- [ ] **Step 5: Commit**

```bash
git add backend/src/documents/services.py
git commit -m "feat(documents): rewrite list_documents with folder/trash scoping and keyed cache"
```

---

### Task 3: `_get_owned_document` + trash lifecycle

**Files:**
- Modify: `backend/src/documents/services.py`

**Interfaces:**
- Consumes: `_doc_list_cache_key`, `_invalidate_doc_list_cache` from Task 2;
  `exceptions.DocumentNotFound`, `exceptions.UserNoPermissionNotAllowed`,
  `exceptions.AlreadyInTrash`, `exceptions.NotInTrash`.
- Produces: `_get_owned_document`, `trash_document`, `restore_document`,
  `delete_document_forever`, `empty_trash`.

- [ ] **Step 1: Add `_get_owned_document`**

```python
def _get_owned_document(user, document_id):
    try:
        obj = Doc.objects.get(id=document_id)
    except Doc.DoesNotExist:
        raise exceptions.DocumentNotFound(f"{document_id} not found.")
    if obj.user_id != user.id:
        raise exceptions.UserNoPermissionNotAllowed(f"{user} needs access.")
    return obj
```

- [ ] **Step 2: Add `trash_document` / `restore_document`**

```python
def trash_document(user, document_id):
    obj = _get_owned_document(user, document_id)
    if obj.deleted_at is not None:
        raise exceptions.AlreadyInTrash(f"{document_id} already in trash.")
    obj.deleted_at = timezone.now()
    obj.save()
    _invalidate_doc_list_cache(user.id, folder_ids=(obj.folder_id,))
    return obj


def restore_document(user, document_id):
    obj = _get_owned_document(user, document_id)
    if obj.deleted_at is None:
        raise exceptions.NotInTrash(f"{document_id} is not in trash.")
    obj.deleted_at = None
    obj.save()
    _invalidate_doc_list_cache(user.id, folder_ids=(obj.folder_id,))
    return obj
```

- [ ] **Step 3: Add `delete_document_forever` / `empty_trash`**

```python
def delete_document_forever(user, document_id):
    obj = _get_owned_document(user, document_id)
    if obj.deleted_at is None:
        raise exceptions.NotInTrash(f"{document_id} is not in trash.")
    folder_id = obj.folder_id
    obj.delete()
    _invalidate_doc_list_cache(user.id, folder_ids=(folder_id,))


def empty_trash(user):
    Doc.objects.filter(user=user, deleted_at__isnull=False).delete()
    _invalidate_doc_list_cache(user.id)
```

- [ ] **Step 4: Verify with manage.py check**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py check
```
Expected: no issues.

- [ ] **Step 5: Manual smoke test — trash/restore/delete-forever + cache invalidation + owner check**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py shell -c "
from django.contrib.auth import get_user_model
from documents.models import Doc
from documents import services, exceptions
User = get_user_model()
owner, _ = User.objects.get_or_create(username='svc_smoke_owner', defaults={'email': 'o@test.com'})
other, _ = User.objects.get_or_create(username='svc_smoke_other', defaults={'email': 's@test.com'})
d = Doc.objects.create(user=owner, title='Trash me')

before = len(services.list_documents(owner))
services.trash_document(owner, d.id)
after = len(services.list_documents(owner))
print('cache invalidated on trash:', before == 1 and after == 0)

try:
    services.trash_document(owner, d.id)
    print('FAIL: should have raised AlreadyInTrash')
except exceptions.AlreadyInTrash:
    print('AlreadyInTrash raised correctly')

services.restore_document(owner, d.id)
print('restored, back in default list:', len(services.list_documents(owner)) == 1)

try:
    services.restore_document(owner, d.id)
    print('FAIL: should have raised NotInTrash')
except exceptions.NotInTrash:
    print('NotInTrash raised correctly')

try:
    services.trash_document(other, d.id)
    print('FAIL: should have raised UserNoPermissionNotAllowed')
except exceptions.UserNoPermissionNotAllowed:
    print('UserNoPermissionNotAllowed raised correctly for non-owner')

services.trash_document(owner, d.id)
try:
    services.delete_document_forever(owner, d.id)
    print('deleted forever, gone:', not Doc.objects.filter(id=d.id).exists())
except Exception as e:
    print('FAIL delete_document_forever:', e)

owner.delete()
other.delete()
"
```
Expected: every print line reads as a pass (`True` / '...raised correctly').

- [ ] **Step 6: Commit**

```bash
git add backend/src/documents/services.py
git commit -m "feat(documents): add trash/restore/delete-forever/empty-trash services"
```

---

### Task 4: rename / duplicate / move

**Files:**
- Modify: `backend/src/documents/services.py`

**Interfaces:**
- Consumes: `_get_owned_document`, `_invalidate_doc_list_cache`,
  `exceptions.FolderNotFound`.
- Produces: `rename_document`, `duplicate_document`, `move_document`.

- [ ] **Step 1: Add `rename_document`**

```python
def rename_document(user, document_id, title):
    obj = _get_owned_document(user, document_id)
    if title is None or not title.strip():
        raise ValueError("Title cannot be blank.")
    obj.title = title.strip()
    obj.save()
    _invalidate_doc_list_cache(user.id, folder_ids=(obj.folder_id,))
    return obj
```

- [ ] **Step 2: Add `duplicate_document`**

```python
def duplicate_document(user, document_id):
    obj = _get_owned_document(user, document_id)
    copy = Doc.objects.create(
        user=user,
        title=f"{obj.title} (copy)",
        content=obj.content,
        folder=obj.folder,
    )
    _invalidate_doc_list_cache(user.id, folder_ids=(obj.folder_id,))
    return copy
```

- [ ] **Step 3: Add `move_document`**

```python
def move_document(user, document_id, folder_id):
    obj = _get_owned_document(user, document_id)
    old_folder_id = obj.folder_id
    if folder_id is None:
        obj.folder = None
    else:
        try:
            folder = Folder.objects.get(id=folder_id, user=user)
        except Folder.DoesNotExist:
            raise exceptions.FolderNotFound(f"{folder_id} not found.")
        obj.folder = folder
    obj.save()
    _invalidate_doc_list_cache(user.id, folder_ids=(old_folder_id, obj.folder_id))
    return obj
```

- [ ] **Step 4: Verify with manage.py check**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py check
```
Expected: no issues.

- [ ] **Step 5: Manual smoke test — rename/duplicate/move + cache invalidation**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py shell -c "
from django.contrib.auth import get_user_model
from documents.models import Doc, Folder
from documents import services, exceptions
User = get_user_model()
owner, _ = User.objects.get_or_create(username='svc_smoke_owner2', defaults={'email': 'o2@test.com'})
d = Doc.objects.create(user=owner, title='Original')
f = Folder.objects.create(user=owner, name='Work')

services.rename_document(owner, d.id, '  New Title  ')
print('renamed:', Doc.objects.get(id=d.id).title == 'New Title')

try:
    services.rename_document(owner, d.id, '   ')
    print('FAIL: blank rename should raise ValueError')
except ValueError:
    print('ValueError raised on blank title')

copy = services.duplicate_document(owner, d.id)
print('duplicate title correct:', copy.title == 'New Title (copy)')
print('cache reflects duplicate:', len(services.list_documents(owner)) == 2)

services.move_document(owner, d.id, f.id)
print('moved into folder:', Doc.objects.get(id=d.id).folder_id == f.id)
print('folder-scoped list shows it:', len(services.list_documents(owner, folder_id=f.id)) == 1)

try:
    services.move_document(owner, d.id, 999999)
    print('FAIL: should have raised FolderNotFound')
except exceptions.FolderNotFound:
    print('FolderNotFound raised correctly')

services.move_document(owner, d.id, None)
print('moved back to root:', Doc.objects.get(id=d.id).folder_id is None)

owner.delete()
"
```
Expected: every print line reads as a pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/documents/services.py
git commit -m "feat(documents): add rename/duplicate/move document services"
```

---

### Task 5: Folder CRUD

**Files:**
- Modify: `backend/src/documents/services.py`

**Interfaces:**
- Consumes: `exceptions.FolderNotFound`, `exceptions.FolderAlreadyExists`,
  `_invalidate_doc_list_cache`.
- Produces: `list_folders`, `create_folder`, `rename_folder`,
  `delete_folder`.

- [ ] **Step 1: Add the four folder functions**

```python
from django.db import IntegrityError


def list_folders(user):
    return Folder.objects.filter(user=user).order_by("name")


def create_folder(user, name):
    name = (name or "").strip()
    if not name:
        raise ValueError("Folder name cannot be blank.")
    try:
        return Folder.objects.create(user=user, name=name)
    except IntegrityError:
        raise exceptions.FolderAlreadyExists(f"Folder '{name}' already exists.")


def rename_folder(user, folder_id, name):
    name = (name or "").strip()
    if not name:
        raise ValueError("Folder name cannot be blank.")
    try:
        folder = Folder.objects.get(id=folder_id, user=user)
    except Folder.DoesNotExist:
        raise exceptions.FolderNotFound(f"{folder_id} not found.")
    folder.name = name
    try:
        folder.save()
    except IntegrityError:
        raise exceptions.FolderAlreadyExists(f"Folder '{name}' already exists.")
    return folder


def delete_folder(user, folder_id):
    try:
        folder = Folder.objects.get(id=folder_id, user=user)
    except Folder.DoesNotExist:
        raise exceptions.FolderNotFound(f"{folder_id} not found.")
    folder.delete()
    _invalidate_doc_list_cache(user.id, folder_ids=(folder_id,))
```

Note: `IntegrityError` import goes at the top of the file with the other
imports in the real edit (shown inline here for readability).

- [ ] **Step 2: Move the `from django.db import IntegrityError` line to the top-of-file import block**

Edit the top of `services.py` so imports read:
```python
from django.db import IntegrityError
from django.db.models import Q
from django.core.cache import cache
from django.utils import timezone

from . import exceptions
from .models import Doc, Folder, Tag, Comment
```

- [ ] **Step 3: Verify with manage.py check**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py check
```
Expected: no issues.

- [ ] **Step 4: Manual smoke test — folder CRUD + SET_NULL cascade on delete**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py shell -c "
from django.contrib.auth import get_user_model
from documents.models import Doc, Folder
from documents import services, exceptions
User = get_user_model()
owner, _ = User.objects.get_or_create(username='svc_smoke_folders', defaults={'email': 'f@test.com'})

f = services.create_folder(owner, 'Personal')
print('folder created:', f.name == 'Personal')

try:
    services.create_folder(owner, 'Personal')
    print('FAIL: duplicate name should raise FolderAlreadyExists')
except exceptions.FolderAlreadyExists:
    print('FolderAlreadyExists raised correctly')

services.rename_folder(owner, f.id, 'Renamed')
print('renamed:', Folder.objects.get(id=f.id).name == 'Renamed')

d = Doc.objects.create(user=owner, title='In folder', folder_id=f.id)
services.delete_folder(owner, f.id)
d.refresh_from_db()
print('doc folder set to null on folder delete:', d.folder_id is None)
print('folder gone:', not Folder.objects.filter(id=f.id).exists())

owner.delete()
"
```
Expected: every print line reads as a pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/documents/services.py
git commit -m "feat(documents): add folder CRUD services"
```

---

### Task 6: Tags

**Files:**
- Modify: `backend/src/documents/services.py`

**Interfaces:**
- Consumes: `_get_owned_document`, `_invalidate_doc_list_cache`.
- Produces: `list_tags`, `add_tag_to_document`, `remove_tag_from_document`.

- [ ] **Step 1: Add the three tag functions**

```python
def list_tags(user):
    return Tag.objects.filter(user=user).order_by("name")


def add_tag_to_document(user, document_id, name):
    obj = _get_owned_document(user, document_id)
    name = (name or "").strip().lower()
    if not name:
        raise ValueError("Tag name cannot be blank.")
    tag, _ = Tag.objects.get_or_create(user=user, name=name)
    obj.tags.add(tag)
    _invalidate_doc_list_cache(user.id, folder_ids=(obj.folder_id,))
    return obj


def remove_tag_from_document(user, document_id, tag_id):
    obj = _get_owned_document(user, document_id)
    obj.tags.remove(tag_id)
    _invalidate_doc_list_cache(user.id, folder_ids=(obj.folder_id,))
    return obj
```

- [ ] **Step 2: Verify with manage.py check**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py check
```
Expected: no issues.

- [ ] **Step 3: Manual smoke test — tag add/remove, case normalization, cache invalidation**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py shell -c "
from django.contrib.auth import get_user_model
from documents.models import Doc, Tag
from documents import services
User = get_user_model()
owner, _ = User.objects.get_or_create(username='svc_smoke_tags', defaults={'email': 't@test.com'})
d = Doc.objects.create(user=owner, title='Tag me')

services.list_documents(owner)  # warm the cache
services.add_tag_to_document(owner, d.id, 'Work')
services.add_tag_to_document(owner, d.id, 'work')
print('case-normalized, single tag:', d.tags.count() == 1)

fresh = services.list_documents(owner)[0]
print('cache reflects new tag:', list(fresh.tags.values_list('name', flat=True)) == ['work'])

tag = Tag.objects.get(user=owner, name='work')
services.remove_tag_from_document(owner, d.id, tag.id)
print('tag removed from doc:', d.tags.count() == 0)
print('tag row still exists (no cleanup):', Tag.objects.filter(id=tag.id).exists())

owner.delete()
"
```
Expected: every print line reads as a pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/documents/services.py
git commit -m "feat(documents): add tag list/add/remove services"
```

---

### Task 7: Comments

**Files:**
- Modify: `backend/src/documents/services.py`

**Interfaces:**
- Consumes: `get_document` (existing function — reused for the
  access-check, not owner-only), `exceptions.CommentNotFound`,
  `exceptions.UserNoPermissionNotAllowed`.
- Produces: `list_comments`, `add_comment`, `resolve_comment`,
  `delete_comment`.

- [ ] **Step 1: Add `list_comments`**

```python
def list_comments(user, document_id):
    get_document(user=user, document_id=document_id)
    return (
        Comment.objects.filter(doc_id=document_id, parent__isnull=True)
        .select_related("user")
        .prefetch_related("replies__user")
        .order_by("created_at")
    )
```

- [ ] **Step 2: Add `add_comment`**

```python
def add_comment(user, document_id, body, parent_id=None):
    get_document(user=user, document_id=document_id)
    parent = None
    if parent_id is not None:
        try:
            parent = Comment.objects.get(id=parent_id, doc_id=document_id)
        except Comment.DoesNotExist:
            raise exceptions.CommentNotFound(f"{parent_id} not found.")
        if parent.parent_id is not None:
            raise exceptions.CommentNotFound("Cannot reply to a reply.")
    return Comment.objects.create(doc_id=document_id, user=user, parent=parent, body=body)
```

- [ ] **Step 3: Add `resolve_comment`**

```python
def resolve_comment(user, document_id, comment_id, resolved):
    get_document(user=user, document_id=document_id)
    try:
        comment = Comment.objects.get(id=comment_id, doc_id=document_id)
    except Comment.DoesNotExist:
        raise exceptions.CommentNotFound(f"{comment_id} not found.")
    comment.resolved = resolved
    comment.save()
    return comment
```

- [ ] **Step 4: Add `delete_comment`**

```python
def delete_comment(user, document_id, comment_id):
    doc = get_document(user=user, document_id=document_id)
    try:
        comment = Comment.objects.get(id=comment_id, doc_id=document_id)
    except Comment.DoesNotExist:
        raise exceptions.CommentNotFound(f"{comment_id} not found.")
    is_author = comment.user_id == user.id
    is_doc_owner = doc.user_id == user.id
    if not (is_author or is_doc_owner):
        raise exceptions.UserNoPermissionNotAllowed(f"{user} cannot delete this comment.")
    comment.delete()
```

- [ ] **Step 5: Verify with manage.py check**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py check
```
Expected: no issues.

- [ ] **Step 6: Manual smoke test — thread/reply, single-level nesting rejection, resolve toggle, delete permissions**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py shell -c "
from django.contrib.auth import get_user_model
from documents.models import Doc, DocUser
from documents import services, exceptions
User = get_user_model()
owner, _ = User.objects.get_or_create(username='svc_smoke_owner3', defaults={'email': 'o3@test.com'})
collab, _ = User.objects.get_or_create(username='svc_smoke_collab', defaults={'email': 'c3@test.com'})
stranger, _ = User.objects.get_or_create(username='svc_smoke_stranger', defaults={'email': 's3@test.com'})
d = Doc.objects.create(user=owner, title='Commented doc')
DocUser.objects.create(doc=d, user=collab, active=True)

thread = services.add_comment(collab, d.id, 'Top level comment')
reply = services.add_comment(owner, d.id, 'A reply', parent_id=thread.id)
print('reply linked to parent:', reply.parent_id == thread.id)

try:
    services.add_comment(owner, d.id, 'reply to reply', parent_id=reply.id)
    print('FAIL: should reject reply-to-a-reply')
except exceptions.CommentNotFound:
    print('reply-to-a-reply rejected correctly')

threads = list(services.list_comments(owner, d.id))
print('one top-level thread with one reply:', len(threads) == 1 and threads[0].replies.count() == 1)

services.resolve_comment(collab, d.id, thread.id, True)
print('resolved:', services.list_comments(owner, d.id)[0].resolved is True)

try:
    services.delete_comment(stranger, d.id, thread.id)
    print('FAIL: stranger has no doc access, should have raised earlier')
except (exceptions.UserNoPermissionNotAllowed, exceptions.DocumentNotFound):
    print('stranger blocked correctly')

try:
    services.delete_comment(collab, d.id, thread.id)
    print('author deleted own comment OK')
except exceptions.UserNoPermissionNotAllowed:
    print('FAIL: author should be able to delete own comment')

owner.delete()
collab.delete()
stranger.delete()
"
```
Expected: every print line reads as a pass (note: `stranger` is neither
owner nor active collaborator, so `get_document` itself raises
`UserNoPermissionNotAllowed` before reaching the author/owner check — this
is expected and correct).

- [ ] **Step 7: Commit**

```bash
git add backend/src/documents/services.py
git commit -m "feat(documents): add comment thread/reply/resolve/delete services"
```

---

### Task 8: Final full-file check

**Files:**
- Read-only verification of `backend/src/documents/services.py` and
  `backend/src/documents/exceptions.py`.

- [ ] **Step 1: Run `manage.py check` one final time**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py check
```
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 2: Confirm no leftover smoke-test users**

```bash
"/Users/akhileshvattumilli/Desktop/coding archieve/DocAi/venv/bin/python" manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
print(User.objects.filter(username__startswith='svc_smoke_').count())
"
```
Expected: `0` — every smoke test above cleans up its own users.

- [ ] **Step 3: Report to orchestrator**

No commit for this task — it's verification only. Message the
orchestrator (`main`) with: what changed, this plan's path, and
confirmation that every smoke test in Tasks 2–7 passed, calling out the
cache-invalidation results specifically since those are named as the
easiest thing to get silently wrong.
