import asyncio

from django.conf import settings
from asgiref.sync import sync_to_async
from twilio.rest import Client

from campaign.models import Campaign, Contact

MAX_CONCURRENT=20
MAX_RETRIES=2

sem=asyncio.Semaphore(MAX_CONCURRENT)

client=Client(settings.TWILIO_ACCOUNT_SID,settings.TWILIO_AUTH_TOKEN)


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
def store_twilio_sid(phone,campaign_id,sid):
    Contact.objects.filter(
        phone_number=phone,
        campaign_id=campaign_id
    ).update(twilio_sid=sid)


@sync_to_async
def send_twilio_message(to_number,body,media_url=None,status_callback=None):
    return client.messages.create(
        body=body,
        from_=settings.TWILIO_WHATSAPP_NUMBER,
        to=to_number,
        media_url=media_url if media_url else None,
        status_callback=status_callback
    )


async def send_message(phone,payload,campaign_id):
    retry_delay=1
    for attempt in range(MAX_RETRIES):
        try:
            async with sem:
                to_number="whatsapp:{}".format(payload["to"])

                msg=await send_twilio_message(
                    to_number,
                    payload["body"],
                    payload.get("media_url"),
                    settings.TWILIO_STATUS_CALLBACK
                )

                await store_twilio_sid(phone,campaign_id,msg.sid)
                await update_contact_status(phone,campaign_id,"sent")
                return{"phone":phone,"status":"sent"}
        except Exception as e:
            if attempt<MAX_RETRIES-1:
                await asyncio.sleep(retry_delay)
                retry_delay*=2
                continue
            await update_contact_status(phone,campaign_id,"failed")
            return{"phone":phone,"status":"failed","error":str(e)}
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