import uuid
from django.contrib.auth import get_user_model

User = get_user_model()

def get_or_create_google_user(google_user_info):
    email = google_user_info.get("email")
    if not email:
        raise ValueError("No email provided by Google")

    # Normalize email to ensure consistency
    email = email.lower().strip()
    
    try:
        # Try to find existing user by email (case-insensitive)
        user = User.objects.get(email__iexact=email)
        # If user exists but has a password set, they signed up manually
        # We can still allow Google OAuth login for existing users
        return user
    except User.DoesNotExist:
        # Create new user with Google OAuth
        user = User.objects.create_user(
            email=email,
            is_active=True,
        )
        user.set_unusable_password()  # Google OAuth users don't need password
        user.save()
        return user