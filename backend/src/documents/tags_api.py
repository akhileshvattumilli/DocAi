from typing import List
from ninja import Router

from helpers.api.auth.permissions import user_required

from .schemas import TagSchema
from . import services as doc_services

router = Router()


@router.get("/", response=List[TagSchema], auth=user_required)
def tag_list_view(request):
    return doc_services.list_tags(request.user)
