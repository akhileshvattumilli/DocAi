class DocumentNotFound(Exception):
    pass

class UserNoPermissionNotAllowed(Exception):
    pass

class FolderNotFound(Exception):
    pass

class FolderAlreadyExists(Exception):
    pass

class CommentNotFound(Exception):
    pass

class AlreadyInTrash(Exception):
    pass

class NotInTrash(Exception):
    pass