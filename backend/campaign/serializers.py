from rest_framework import serializers
from .models import Campaign,Contact,Reply


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model=Campaign
        fields="__all__"


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model=Contact
        fields="__all__"


class ReplySerializer(serializers.ModelSerializer):
    class Meta:
        model=Reply
        fields="__all__"