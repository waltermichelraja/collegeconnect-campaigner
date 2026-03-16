from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Campaign, Reply
from .serializers import CampaignSerializer, ReplySerializer
from .utils.csv_validator import load_contacts
from .models import Contact


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
    for phone in valid:
        Contact.objects.create(phone_number=phone, campaign_id=campaign_id)
    return Response({"valid_contacts": len(valid), "invalid_contacts": invalid})


@api_view(["POST"])
def send_campaign(request):
    campaign_id=request.data.get("campaign_id")
    campaign=Campaign.objects.get(id=campaign_id)
    contacts=Contact.objects.filter(campaign=campaign)
    phones=[c.phone_number for c in contacts]
    # async sender will be called here later

    return Response({"campaign":campaign_id, "contacts":len(phones), "status":"queued"})


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
    yes=Reply.objects.filter(campaign_id=campaign_id, response="yes_confirm").count()
    no=Reply.objects.filter(campaign_id=campaign_id,response="no_decline").count()
    return Response({"total_contacts": total, "yes": yes, "no": no})