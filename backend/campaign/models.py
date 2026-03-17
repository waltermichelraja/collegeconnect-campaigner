from django.db import models


class Campaign(models.Model):
    name=models.CharField(max_length=200)
    message_body=models.TextField()
    image_path=models.CharField(max_length=500,null=True,blank=True)
    media_id=models.CharField(max_length=200,null=True,blank=True)
    buttons=models.JSONField(default=list)
    status=models.CharField(max_length=20,default="draft")
    created_at=models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Contact(models.Model):
    phone_number=models.CharField(max_length=12)
    campaign=models.ForeignKey(Campaign,on_delete=models.CASCADE)
    status=models.CharField(max_length=20,default="queued")
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[
            models.UniqueConstraint(
                fields=["phone_number", "campaign"], 
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


class Media(models.Model):
    campaign=models.ForeignKey(Campaign,on_delete=models.CASCADE)
    media_id=models.CharField(max_length=200)
    file_path=models.CharField(max_length=500)
    uploaded_at=models.DateTimeField(auto_now_add=True)