from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("userid", "department", "is_root", "is_staff", "is_active")
    ordering = ("userid",)
    search_fields = ("userid",)
    fieldsets = (
        (None, {"fields": ("userid", "password")}),
        ("Permissions", {"fields": ("is_root","is_staff","is_superuser","groups","user_permissions")}),
        ("Info", {"fields": ("department",)}),
    )
    add_fieldsets = ((None, {"fields": ("userid","password1","password2")}),)
