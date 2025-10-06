from django.contrib.auth import get_user_model
from helpers.api.auth.permissions import user_required
from ninja import Router 

User = get_user_model()

# users are required
router = Router(auth=user_required)