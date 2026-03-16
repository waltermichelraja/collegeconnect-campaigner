import asyncio
import aiohttp

from django.conf import settings
from campaign.models import Contact

BASE_URL="https://graph.facebook.com/v19.0"
MAX_CONCURRENT=25

sem=asyncio.Semaphore(MAX_CONCURRENT)

async def send_message(session,phone,payload):
    url=f"{BASE_URL}/{settings.WA_PHONE_NUMBER_ID}/messages"
    headers={
        "Authorization": f"Bearer {settings.WA_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    async with sem:
        async with session.post(url,json=payload,headers=headers) as resp:
            result=await resp.json()
            return result


async def send_bulk_messages(phones,payload_builder):
    async with aiohttp.ClientSession() as session:
        tasks=[]
        for phone in phones:
            payload=payload_builder(phone)
            task=asyncio.create_task(send_message(session, phone, payload))
            tasks.append(task)
        results=await asyncio.gather(*tasks)
        return results