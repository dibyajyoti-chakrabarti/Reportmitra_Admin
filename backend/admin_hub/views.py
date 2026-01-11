#This is a test comment to test backend CICD
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok"})
