# backend/accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("userid", "is_root", "is_staff", "is_active", "department")
    search_fields = ("userid", "department")
    ordering = ("userid",)
    # don't show the default username field if unused
    fieldsets = (
        (None, {"fields": ("userid","password")}),
        ("Permissions", {"fields": ("is_root","is_staff","is_superuser","is_active")}),
        ("Profile", {"fields": ("department",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("userid","password1","password2","is_root","department"),
        }),
    )
