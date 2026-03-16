from django.urls import path
from . import views

urlpatterns=[
    path("campaign/create/",views.create_campaign),
    path("contacts/upload/",views.upload_contacts),
    path("campaign/send/",views.send_campaign),
    path("replies/",views.get_replies),
    path("progress/",views.campaign_progress),
]