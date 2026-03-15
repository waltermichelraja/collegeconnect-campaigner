from django.contrib import admin
from .models import Campaign, Contact, Reply, Media

admin.site.register(Campaign)
admin.site.register(Contact)
admin.site.register(Reply)
admin.site.register(Media)