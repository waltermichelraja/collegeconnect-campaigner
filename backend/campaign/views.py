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
from .services.background import run_async_task


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
    campaign=get_object_or_404(Campaign, id=campaign_id)
    try:
        valid,invalid=load_contacts(csv_file)
    except ValueError as e:
        return Response({"error": str(e)}, status=400)
    existing_numbers=set(
        Contact.objects.filter(campaign=campaign)
        .values_list("phone_number", flat=True)
    )
    new_numbers=[]
    seen=set()
    duplicates=[]
    for item in valid:
        phone=item["phone_number"]
        row=item["row"]
        if phone in existing_numbers or phone in seen:
            duplicates.append({
                "row": row,
                "phone_number": phone
            })
        else:
            new_numbers.append(phone)
            seen.add(phone)
    contacts=[
        Contact(phone_number=phone, campaign=campaign, status="queued")
        for phone in new_numbers
    ]
    created_objs=Contact.objects.bulk_create(contacts, ignore_conflicts=True)
    created_count=len(created_objs)
    db_conflicts=len(new_numbers)-created_count
    return Response({
        "new_contacts": created_count,
        "duplicates_skipped": duplicates,
        "invalid_contacts": invalid,
        "meta":{
            "db_conflicts": db_conflicts
        }
    })


@api_view(["POST"])
def send_campaign(request):
    campaign_id=request.data.get("campaign_id")
    campaign=get_object_or_404(Campaign,id=campaign_id)
    campaign.status="sending"
    campaign.save()
    qs=Contact.objects.filter(campaign=campaign, status="queued")
    phones=list(qs.values_list("phone_number", flat=True))
    qs.update(status="processing")
    def payload_builder(phone):
        return build_interactive_message(
            phone,
            campaign.media_id,
            campaign.message_body,
            campaign.buttons
        )
    run_async_task(send_bulk_messages(phones, payload_builder, campaign.id))
    return Response({
        "campaign": campaign_id,
        "contacts": len(phones),
        "status": "started"
    })


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
    pending=Contact.objects.filter(campaign_id=campaign_id, status__in=["queued", "processing"]).count()
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