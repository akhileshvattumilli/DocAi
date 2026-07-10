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
