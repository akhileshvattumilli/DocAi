from django.db import IntegrityError
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


def create_document(user=None, title=None):
    if user is None or title is None:
        return None
    return Doc.objects.create(user=user, title=title)


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


def get_document(user=None, document_id=None):
    if user is None or document_id is None:
        return None
    try:
        obj = Doc.objects.get(id=document_id)
    except Doc.DoesNotExist:
        raise exceptions.DocumentNotFound(f"{document_id} not found.")
    except:
        raise exceptions.DocumentNotFound(f"{document_id} not found.")
    is_owner = obj.user == user
    is_doc_user = obj.docuser_set.filter(user=user, active=True).exists()
    has_permission = is_owner or is_doc_user
    if not has_permission:
        raise exceptions.UserNoPermissionNotAllowed(f"{user} needs access.")
    return obj


def _get_owned_document(user, document_id):
    try:
        obj = Doc.objects.get(id=document_id)
    except Doc.DoesNotExist:
        raise exceptions.DocumentNotFound(f"{document_id} not found.")
    if obj.user_id != user.id:
        raise exceptions.UserNoPermissionNotAllowed(f"{user} needs access.")
    return obj


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


def rename_document(user, document_id, title):
    obj = _get_owned_document(user, document_id)
    if title is None or not title.strip():
        raise ValueError("Title cannot be blank.")
    obj.title = title.strip()
    obj.save()
    _invalidate_doc_list_cache(user.id, folder_ids=(obj.folder_id,))
    return obj


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


def list_comments(user, document_id):
    get_document(user=user, document_id=document_id)
    return (
        Comment.objects.filter(doc_id=document_id, parent__isnull=True)
        .select_related("user")
        .prefetch_related("replies__user")
        .order_by("created_at")
    )


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


def resolve_comment(user, document_id, comment_id, resolved):
    get_document(user=user, document_id=document_id)
    try:
        comment = Comment.objects.get(id=comment_id, doc_id=document_id)
    except Comment.DoesNotExist:
        raise exceptions.CommentNotFound(f"{comment_id} not found.")
    comment.resolved = resolved
    comment.save()
    return comment


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
