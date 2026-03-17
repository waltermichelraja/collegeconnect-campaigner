import csv
import logging

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from .models import Campaign, Reply, Contact
from .serializers import CampaignSerializer, ReplySerializer
from .utils.csv_validator import load_contacts
from .services.bulk_sender import send_bulk_messages
from .services.background import run_async_task

logger=logging.getLogger(__name__)


@api_view(["POST"])
def create_campaign(request):
    serializer=CampaignSerializer(data=request.data)
    if serializer.is_valid():
        campaign=serializer.save()
        return Response({"campaign_id":campaign.id})
    return Response(serializer.errors,status=400)


@api_view(["POST"])
def upload_contacts(request):
    campaign_id=request.data.get("campaign_id")
    csv_file=request.FILES.get("file")
    if not csv_file:
        return Response({"error":"CSV file not provided"},status=400)
    campaign=get_object_or_404(Campaign,id=campaign_id)
    try:
        valid,invalid=load_contacts(csv_file)
    except ValueError as e:
        return Response({"error":str(e)},status=400)
    existing_numbers=set(
        Contact.objects.filter(campaign=campaign)
        .values_list("phone_number",flat=True)
    )
    new_numbers=[]
    seen=set()
    duplicates=[]
    for item in valid:
        phone=item["phone_number"]
        row=item["row"]
        if phone in existing_numbers or phone in seen:
            duplicates.append({"row":row,"phone_number":phone})
        else:
            new_numbers.append(phone)
            seen.add(phone)
    contacts=[
        Contact(phone_number=phone,campaign=campaign,status="queued")
        for phone in new_numbers
    ]
    created_objs=Contact.objects.bulk_create(contacts,ignore_conflicts=True)
    created_count=len(created_objs)
    db_conflicts=len(new_numbers)-created_count
    return Response({
        "new_contacts":created_count,
        "duplicates_skipped":duplicates,
        "invalid_contacts":invalid,
        "meta":{"db_conflicts":db_conflicts}
    })


def build_template_payload(phone,campaign):
    phone=str(phone).strip()
    if not phone.startswith("+"):
        phone="+{}".format(phone)
    message=campaign.message_body
    message+="\n\nReply with:\n1. Yes\n2. No\n3. Maybe"
    payload={"to":phone,"body":message}
    if campaign.image_url:
        payload["media_url"]=[campaign.image_url]
    return payload


@api_view(["POST"])
def send_campaign(request):
    campaign_id=request.data.get("campaign_id")
    campaign=get_object_or_404(Campaign,id=campaign_id)
    if campaign.status=="sending":
        return Response({"error":"campaign already sending"},status=400)
    campaign.status="sending"
    campaign.save()
    qs=Contact.objects.filter(campaign=campaign,status="queued")
    phones=list(qs.values_list("phone_number",flat=True))
    qs.update(status="processing")
    def payload_builder(phone):
        return build_template_payload(phone,campaign)
    run_async_task(send_bulk_messages(phones,payload_builder,campaign.id))
    return Response({
        "campaign":campaign_id,
        "contacts":len(phones),
        "status":"started"
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
    sent=Contact.objects.filter(campaign_id=campaign_id,status="sent").count()
    delivered=Contact.objects.filter(campaign_id=campaign_id,status="delivered").count()
    failed=Contact.objects.filter(campaign_id=campaign_id,status="failed").count()
    pending=Contact.objects.filter(
        campaign_id=campaign_id,
        status__in=["queued","processing"]
    ).count()
    return Response({
        "total":total,
        "sent":sent,
        "delivered":delivered,
        "failed":failed,
        "pending":pending
    })


@api_view(["POST"])
def whatsapp_webhook(request):
    try:
        phone=request.data.get("From","")
        phone=phone.replace("whatsapp:+","").strip()
        text=request.data.get("Body","").strip().lower()
        if not phone or not text:
            return Response({"status":"ignored"})
        if text in ["1","yes","yes - i'll attend"]:
            response="yes_confirm"
        elif text in ["2","no","no - can't make it"]:
            response="no_decline"
        elif text in ["3","maybe"]:
            response="maybe"
        else:
            return Response({"status":"ignored"})
        contact=Contact.objects.filter(phone_number=phone).order_by("-id").first()
        if not contact:
            return Response({"status":"unknown contact"})
        Reply.objects.get_or_create(
            phone_number=phone,
            campaign=contact.campaign,
            response=response
        )
    except Exception as e:
        logger.error("webhook error: %s",str(e))
    return Response({"status":"received"})


@api_view(["POST"])
def twilio_status_webhook(request):
    try:
        phone=request.data.get("To","")
        phone=phone.replace("whatsapp:+","").strip()
        status=request.data.get("MessageStatus","")
        if not phone or not status:
            return Response({"status":"ignored"})
        if status in ["delivered","read"]:
            Contact.objects.filter(phone_number=phone)\
                .update(status="delivered")
        elif status in ["failed","undelivered"]:
            Contact.objects.filter(phone_number=phone)\
                .update(status="failed")
    except Exception as e:
        logger.error("status webhook error: %s",str(e))
    return Response({"status":"received"})


@api_view(["GET"])
def export_replies_csv(request):
    campaign_id=request.GET.get("campaign_id")
    replies=Reply.objects.filter(campaign_id=campaign_id)\
        .values_list("phone_number","response","timestamp")
    response=HttpResponse(content_type="text/csv")
    response["Content-Disposition"]=f'attachment; filename="campaign_{campaign_id}_replies.csv"'
    writer=csv.writer(response)
    writer.writerow(["phone_number","response","timestamp"])
    for row in replies:
        writer.writerow(row)
    return response