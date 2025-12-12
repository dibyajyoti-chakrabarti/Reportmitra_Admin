from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("userid", "full_name", "is_root", "is_staff", "is_active", "department")  # added full_name
    search_fields = ("userid", "full_name", "department")  # added full_name
    ordering = ("userid",)
    fieldsets = (
        (None, {"fields": ("userid","password")}),
        ("Personal info", {"fields": ("full_name","department")}),  # show full_name here
        ("Permissions", {"fields": ("is_root","is_staff","is_superuser","is_active")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("userid","password1","password2","full_name","is_root","department"),  # added full_name
        }),
    )
