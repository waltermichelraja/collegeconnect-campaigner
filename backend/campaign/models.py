from django.db import models


class Campaign(models.Model):
    name=models.CharField(max_length=200)
    template_name=models.CharField(max_length=100,null=True,blank=True)
    message_body=models.TextField(null=True,blank=True)
    image_url=models.URLField(null=True,blank=True)
    variables=models.JSONField(default=list)
    buttons=models.JSONField(default=list)
    status=models.CharField(max_length=20,default="draft")
    created_at=models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Contact(models.Model):
    phone_number=models.CharField(max_length=12)
    campaign=models.ForeignKey(Campaign,on_delete=models.CASCADE)
    status=models.CharField(max_length=20,default="queued")
    message_id=models.CharField(max_length=255,null=True,blank=True,unique=True)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[
            models.UniqueConstraint(
                fields=["phone_number","campaign"],
                name="unique_contact_per_campaign"
            )
        ]


class Reply(models.Model):
    phone_number=models.CharField(max_length=12)
    campaign=models.ForeignKey(Campaign,on_delete=models.CASCADE)
    response=models.CharField(max_length=20)
    timestamp=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[
            models.UniqueConstraint(
                fields=["phone_number","campaign","response"],
                name="unique_reply_once"
            )
        ]
