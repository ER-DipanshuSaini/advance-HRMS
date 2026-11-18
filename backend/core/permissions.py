from rest_framework.permissions import BasePermission


def has_capability(user, code):
    return bool(
        user.is_authenticated
        and (user.is_superuser or (
            user.role_id and user.role.permissions.filter(code=code).exists()
        ))
    )


class ActionPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        code = view.action_permissions.get(view.action)
        codes = (code,) if isinstance(code, str) else (code or ())
        return any(has_capability(request.user, capability) for capability in codes)
