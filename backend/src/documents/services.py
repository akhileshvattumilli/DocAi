from django.db.models import Q
from django.core.cache import cache
from django.contrib.auth import get_user_model

from . import exceptions
from .models import Doc, DocUser

DOC_CACHE_KEY = "documents:list:{user_id}"
DOC_CACHE_TIMEOUT = 300


def create_document(user=None, title=None):
    if user is None or title is None:
        return None
    return Doc.objects.create(user=user, title=title)


def list_documents(user=None, force=False):
    if user is None:
        return []
    cache_key = DOC_CACHE_KEY.format(user_id=user.id)
    cached_qs = cache.get(cache_key)
    if cached_qs and not force:
        return cached_qs
    qs = Doc.objects.filter(
        Q(user=user) |
        Q(docuser__user=user)
    ).values('id', 'content', 'title')
    cache.set(cache_key, qs, timeout=DOC_CACHE_TIMEOUT)
    return qs

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
        raise exceptions.UserNoPermissionNotAllowed(f"{user} is not the owner.")
    return obj


def list_collaborators(user, document_id):
    doc = _get_owned_document(user, document_id)
    return doc.docuser_set.filter(active=True, user__isnull=False).select_related("user")


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


def revoke_collaborator(user, document_id, docuser_id):
    doc = _get_owned_document(user, document_id)
    try:
        doc_user = doc.docuser_set.get(id=docuser_id)
    except DocUser.DoesNotExist:
        raise exceptions.DocumentNotFound(f"Collaborator {docuser_id} not found.")
    doc_user.active = False
    doc_user.save()
    return doc_user