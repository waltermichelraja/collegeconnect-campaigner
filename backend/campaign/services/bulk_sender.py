import asyncio

from django.conf import settings
from asgiref.sync import sync_to_async

from campaign.models import Campaign, Contact
from .providers.fast2sms_provider import Fast2SMSProvider


MAX_CONCURRENT=20
MAX_RETRIES=2

sem=asyncio.Semaphore(MAX_CONCURRENT)


@sync_to_async
def mark_campaign_complete(campaign_id):
    Campaign.objects.filter(id=campaign_id).update(status="completed")


@sync_to_async
def update_contact_status(phone,campaign_id,status):
    Contact.objects.filter(
        phone_number=phone,
        campaign_id=campaign_id
    ).update(status=status)


@sync_to_async
def store_message_id(phone,campaign_id,message_id):
    Contact.objects.filter(
        phone_number=phone,
        campaign_id=campaign_id
    ).update(message_id=message_id)


async def send_message(phone,payload,campaign_id):
    retry_delay=1
    provider=Fast2SMSProvider()
    for attempt in range(MAX_RETRIES):
        try:
            async with sem:
                campaign=await Campaign.objects.aget(id=campaign_id)
                if campaign.status=="stopped":
                    return {"phone":phone,"status":"stopped"}
                response=await provider.send_template_message(
                    settings.FAST2SMS_PHONE_NUMBER_ID,
                    payload["to"],
                    payload["template_name"],
                    payload["variables"]
                )
                messages=response.get("messages")
                if not messages:
                    raise Exception(f"invalid Fast2SMS response: {response}")
                message_id=messages[0].get("id")
                if message_id:
                    await store_message_id(phone,campaign_id,message_id)
                await update_contact_status(phone,campaign_id,"sent")
                return {"phone":phone,"status":"sent"}
        except Exception as e:
            if attempt<MAX_RETRIES-1:
                await asyncio.sleep(retry_delay)
                retry_delay*=2
                continue
            await update_contact_status(phone,campaign_id,"failed")
            return{"phone":phone,"status":"failed"}


async def send_bulk_messages(phones,payload_builder,campaign_id):
    tasks=[]
    for phone in phones:
        payload=payload_builder(phone)
        task=asyncio.create_task(
            send_message(phone,payload,campaign_id)
        )
        tasks.append(task)
    results=await asyncio.gather(*tasks)
    all_done=all(r.get("status") in ["sent","failed"] for r in results)
    if all_done:
        await mark_campaign_complete(campaign_id)
    return results