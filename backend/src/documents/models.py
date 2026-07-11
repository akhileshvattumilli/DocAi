import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone

# Create your models here.

User = settings.AUTH_USER_MODEL

class Folder(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "name"], name="unique_user_folder_name")]


class Tag(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "name"], name="unique_user_tag_name")]


class Doc(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, db_index=True, editable=False)
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=120, blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    yjs_state = models.TextField(blank=True, null=True)  # Store YJS document state
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    folder = models.ForeignKey(Folder, null=True, blank=True, on_delete=models.SET_NULL)
    tags = models.ManyToManyField(Tag, blank=True, related_name="docs")


class Comment(models.Model):
    doc = models.ForeignKey(Doc, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
    body = models.TextField()
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class DocUser(models.Model):
    doc = models.ForeignKey(Doc, null=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    active = models.BooleanField(default=True)
    inactive_at = models.DateTimeField(auto_now=False, auto_now_add=False, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.active and self.inactive_at is None:
            self.inactive_at = timezone.now()
        super().save(*args, **kwargs)