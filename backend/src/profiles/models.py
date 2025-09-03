from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True, null=True)

