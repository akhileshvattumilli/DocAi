from ninja import Schema


class UserSchema(Schema):
    username: str
    email: str | None
    is_authenticated: bool
    access_token: str | None
    refresh_token: str | None
