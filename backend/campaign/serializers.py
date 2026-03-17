from rest_framework import serializers
from .models import Campaign,Contact,Reply


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model=Campaign
        fields="__all__"
    def validate_buttons(self,value):
        if not value:
            raise serializers.ValidationError("at least one button is required")
        if len(value)>3:
            raise serializers.ValidationError("maximum 3 buttons allowed")
        for btn in value:
            if "id" not in btn or "title" not in btn:
                raise serializers.ValidationError("each button must have id and title")
            if len(btn["title"])>20:
                raise serializers.ValidationError("button title too long [max 20 chars]")
        return value


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model=Contact
        fields="__all__"


class ReplySerializer(serializers.ModelSerializer):
    class Meta:
        model=Reply
        fields="__all__"