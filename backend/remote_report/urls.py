from django.urls import path
from .views import IssueListView,IssueDetailView, IssueResolveView, IssueStatusUpdateView

urlpatterns = [
    path("issues/", IssueListView.as_view(), name="issue-list"),
    path("issues/<str:tracking_id>/", IssueDetailView.as_view(), name="issue-detail"),
    path("issues/<str:tracking_id>/status/", IssueStatusUpdateView.as_view()),
    path("issues/<str:tracking_id>/resolve/",IssueResolveView.as_view(),
         
    # path("presign-s3/", presign_s3, name="presign-s3"),
    # path("presign-get/<int:id>/", presign_get_for_track, name="presign-get"),
),

]