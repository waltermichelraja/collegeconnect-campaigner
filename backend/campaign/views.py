import csv
import logging

from asgiref.sync import async_to_sync
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services.background import run_async_task
from .services.bulk_sender import send_bulk_messages
from .services.whatsapp_client import build_template_payload
from .services.providers.fast2sms_provider import Fast2SMSProvider
from .utils.csv_validator import load_contacts
from .models import Campaign, Reply, Contact
from .serializers import CampaignSerializer, ReplySerializer


logger=logging.getLogger(__name__)

def normalize_phone(phone):
    return str(phone).replace("whatsapp:+","").replace("+","").strip()

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
        phone=normalize_phone(item["phone_number"])
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


@api_view(["POST"])
def stop_campaign(request):
    campaign_id=request.data.get("campaign_id")
    campaign=get_object_or_404(Campaign,id=campaign_id)
    if campaign.status in ["completed","stopped"]:
        return Response({"message":"campaign already finished"})
    campaign.status="stopped"
    campaign.save()
    return Response({
        "campaign_id":campaign_id,
        "status":"stopped"
    })


@api_view(["GET"])
def list_campaigns(request):
    campaigns=Campaign.objects.all().order_by("-created_at")
    data=[]
    for campaign in campaigns:
        contacts=Contact.objects.filter(campaign=campaign)
        total=contacts.count()
        sent=contacts.filter(status="sent").count()
        delivered=contacts.filter(status="delivered").count()
        failed=contacts.filter(status="failed").count()
        pending=contacts.filter(status__in=["queued","processing"]).count()
        replies=Reply.objects.filter(campaign=campaign)
        response_counts={}
        for r in replies:
            response_counts[r.response]=response_counts.get(r.response,0)+1
        data.append({
            "campaign_id":campaign.id,
            "name":campaign.name,
            "status":campaign.status,
            "created_at":campaign.created_at,
            "total":total,
            "sent":sent,
            "delivered":delivered,
            "failed":failed,
            "pending":pending,
            "responses":response_counts
        })
    return Response(data)


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


@csrf_exempt
@api_view(["POST"])
def whatsapp_webhook(request):
    provider=Fast2SMSProvider()
    try:
        events=async_to_sync(provider.parse_webhook)(request)
    except Exception:
        return Response({"error":"invalid webhook"},status=400)
    for event in events:
        if event["type"]=="message":
            parent_id=event.get("context",{}).get("replied_to_message_id")
            phone=normalize_phone(event.get("phone"))
            text=(event.get("text") or "").lower()
            button_id=event.get("button_id")
            contact=None
            if parent_id:
                contact=Contact.objects.filter(message_id=parent_id).first()
            if not contact and phone:
                contact=Contact.objects.filter(phone_number=phone)\
                    .order_by("-id").first()
            if not contact:
                continue
            campaign=contact.campaign
            if campaign.status=="stopped":
                continue
            matched_response=None
            if button_id:
                for btn in campaign.buttons:
                    if btn["id"]==button_id:
                        matched_response=btn["id"]
                        break
            if not matched_response:
                for idx,btn in enumerate(campaign.buttons,start=1):
                    if text==str(idx) or btn["title"].lower() in text:
                        matched_response=btn["id"]
                        break
            if not matched_response:
                matched_response="unknown"
            Reply.objects.update_or_create(
                phone_number=contact.phone_number,
                campaign=campaign,
                defaults={"response":matched_response}
            )
        elif event["type"]=="status":
            message_id=event.get("message_id")
            phone=normalize_phone(event.get("phone"))
            contact=None
            if message_id:
                contact=Contact.objects.filter(message_id=message_id).first()

            if not contact and phone:
                contact=Contact.objects.filter(phone_number=phone)\
                    .order_by("-id").first()
            if not contact:
                continue
            if contact.campaign.status=="stopped":
                continue
            if message_id:
                Contact.objects.filter(message_id=message_id)\
                    .update(status=event["status"])
            elif phone:
                Contact.objects.filter(phone_number=phone)\
                    .update(status=event["status"])
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