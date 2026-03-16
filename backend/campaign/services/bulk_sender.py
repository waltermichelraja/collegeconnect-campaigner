import asyncio
import aiohttp

from django.conf import settings

BASE_URL="https://graph.facebook.com/v19.0"
MAX_CONCURRENT=25
MAX_RETRIES=3

sem=asyncio.Semaphore(MAX_CONCURRENT)


async def send_message(session,phone,payload):
    url=f"{BASE_URL}/{settings.WA_PHONE_NUMBER_ID}/messages"
    headers={
        "Authorization": f"Bearer {settings.WA_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    retry_delay=1
    for attempt in range(MAX_RETRIES):
        try:
            async with sem:
                async with session.post(url,json=payload,headers=headers) as resp:
                    result=await resp.json()
                    if resp.status==200:
                        return {"phone": phone, "status": "sent"}
                    if resp.status==429:
                        await asyncio.sleep(retry_delay)
                        retry_delay*=2
                        continue

                    return {"phone": phone,"status": "failed", "error": result}
        except Exception as e:
            if attempt<MAX_RETRIES-1:
                await asyncio.sleep(retry_delay)
                retry_delay*=2
                continue
            return {"phone": phone, "status": "failed", "error":str(e)}
    return {"phone": phone, "status": "failed"}


async def send_bulk_messages(phones,payload_builder):
    async with aiohttp.ClientSession() as session:
        tasks=[]
        for phone in phones:
            payload=payload_builder(phone)
            task=asyncio.create_task(send_message(session, phone, payload))
            tasks.append(task)
        results=await asyncio.gather(*tasks)
        return results