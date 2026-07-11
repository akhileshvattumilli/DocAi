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
