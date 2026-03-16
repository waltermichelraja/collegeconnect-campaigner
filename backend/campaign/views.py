import asyncio
import csv

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from .models import Campaign, Reply
from .serializers import CampaignSerializer, ReplySerializer
from .utils.csv_validator import load_contacts
from .models import Contact
from .services.bulk_sender import send_bulk_messages
from .services.whatsapp_client import build_interactive_message


@api_view(["POST"])
def create_campaign(request):
    serializer=CampaignSerializer(data=request.data)
    if serializer.is_valid():
        campaign=serializer.save()
        return Response({"campaign_id":campaign.id})
    return Response(serializer.errors, status=400)


@api_view(["POST"])
def upload_contacts(request):
    campaign_id=request.data.get("campaign_id")
    csv_file=request.FILES.get("file")
    if not csv_file:
        return Response({"error": "CSV file not provided"}, status=400)
    valid, invalid=load_contacts(csv_file)
    created=0
    for phone in valid:
        created_flag=Contact.objects.get_or_create(phone_number=phone, campaign_id=campaign_id, defaults={"status": "queued"})
        if created_flag: created+=1
    return Response({"new_contacts": created, "duplicates_skipped": len(valid)-created, "invalid_contacts": invalid})


@api_view(["POST"])
def send_campaign(request):
    campaign_id=request.data.get("campaign_id")
    campaign=get_object_or_404(Campaign, id=campaign_id)
    contacts=Contact.objects.filter(campaign=campaign)
    phones=[c.phone_number for c in contacts]
    def payload_builder(phone):
        return build_interactive_message(phone, campaign.media_id, campaign.message_body)
    asyncio.get_event_loop().run_until_complete(send_bulk_messages(phones, payload_builder))
    return Response({"campaign": campaign_id, "contacts": len(phones), "status": "sending"})


@api_view(["GET"])
def get_replies(request):
    campaign_id=request.GET.get("campaign_id")
    replies=Reply.objects.filter(campaign_id=campaign_id)
    serializer=ReplySerializer(replies,many=True)
    return Response(serializer.data)


@api_view(["GET"])
def campaign_progress(request):
    campaign_id=request.GET.get("campaign_id")
    total=Contact.objects.filter(campaign_id=campaign_id).count()
    sent=Contact.objects.filter(campaign_id=campaign_id, status="sent").count()
    failed=Contact.objects.filter(campaign_id=campaign_id, status="failed").count()
    pending=Contact.objects.filter(campaign_id=campaign_id, status="queued").count()
    return Response({"total": total, "sent": sent, "failed": failed, "pending": pending})


@api_view(["GET"])
def whatsapp_webhook_verify(request):
    verify_token=request.GET.get("hub.verify_token")
    challenge=request.GET.get("hub.challenge")
    if verify_token==settings.WEBHOOK_VERIFY_TOKEN:
        return HttpResponse(challenge)
    return Response({"error": "verification failed"}, status=403)


@api_view(["POST"])
def whatsapp_webhook(request):
    data=request.data
    try:
        entry=data["entry"][0]
        changes=entry["changes"][0]
        value=changes["value"]
        if "messages" not in value:
            return Response({"status":"event received"})
        message=value["messages"][0]
        phone=message["from"]
        button_id=message["interactive"]["button_reply"]["id"]
        campaign=Campaign.objects.last()
        if campaign:
            Reply.objects.create(phone_number=phone, campaign=campaign, response=button_id)
    except Exception as e:
        print("webhook parse error:", e)
    return Response({"status": "received"})


@api_view(["GET"])
def export_replies_csv(request):
    campaign_id=request.GET.get("campaign_id")
    replies=Reply.objects.filter(campaign_id=campaign_id).values_list("phone_number", "response", "timestamp")
    response=HttpResponse(content_type="text/csv")
    response["Content-Disposition"]=f'attachment; filename="campaign_{campaign_id}_replies.csv"'
    writer=csv.writer(response)
    writer.writerow(["phone_number", "response", "timestamp"])
    for row in replies:
        writer.writerow(row)
    return response