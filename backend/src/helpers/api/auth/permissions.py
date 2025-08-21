from django.http import HttpRequest
from ninja_jwt.authentication import JWTAuth


def allow_anon(request: HttpRequest) -> bool:
    """Check if user is anonymous (not authenticated)"""
    return not request.user.is_authenticated


def verify_authenticated(request: HttpRequest) -> bool:
    """Check if user is authenticated"""
    return request.user.is_authenticated


def allow_staff(request: HttpRequest) -> bool:
    """Check if user is staff member"""
    return request.user.is_authenticated and request.user.is_staff


def allow_superuser(request: HttpRequest) -> bool:
    """Check if user is superuser"""
    return request.user.is_authenticated and request.user.is_superuser


def allow_any(request: HttpRequest) -> bool:
    """Allow both authenticated and anonymous users"""
    return True


# Common permission combinations
user_required = [JWTAuth(), verify_authenticated]
anon_required = [JWTAuth(), allow_anon]
staff_required = [JWTAuth(), allow_staff]
superuser_required = [JWTAuth(), allow_superuser]
user_or_anon = [JWTAuth(), allow_any]  # Allows both authenticated and anonymous users
