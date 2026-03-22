import aiohttp
from django.conf import settings

class Fast2SMSProvider:
    BASE_URL="https://www.fast2sms.com/dev/whatsapp"


    async def send_message(self,phone_number_id,to,body):
        url=f"{self.BASE_URL}/v24.0/{phone_number_id}/messages"
        payload={
            "messaging_product":"whatsapp",
            "recipient_type":"individual",
            "to":to,
            "type":"text",
            "text":{"body":body}
        }
        headers={
            "authorization":settings.FAST2SMS_API_KEY,
            "content-type":"application/json"
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url,json=payload,headers=headers) as resp:
                return await resp.json()


    async def send_template_message(self,phone_number_id,to,template_name,variables):
        url=f"{self.BASE_URL}/v24.0/{phone_number_id}/messages"
        payload={
            "messaging_product":"whatsapp",
            "to":to,
            "type":"template",
            "template":{
                "name":template_name,
                "language":{"code":"en"},
                "components":[
                    {
                        "type":"body",
                        "parameters":[
                            {"type":"text","text":var}
                            for var in variables
                        ]
                    }
                ]
            }
        }
        headers={
            "authorization":settings.FAST2SMS_API_KEY,
            "content-type":"application/json"
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url,json=payload,headers=headers) as resp:
                return await resp.json()


    async def parse_webhook(self,request):
        data=request.data
        events=[]
        reports=data.get("whatsapp_reports",[])
        for e in reports:
            event_type=e.get("type")
            if event_type in ["incoming_message","message"]:
                interactive=e.get("interactive",{})
                button_reply=interactive.get("button_reply",{})

                events.append({
                    "type":"message",
                    "phone":e.get("from"),
                    "text":e.get("body"),
                    "button_id":(
                        button_reply.get("id") or
                        (e.get("button") or {}).get("payload")
                    ),
                    "message_id":e.get("message_id"),
                    "context":e.get("context",{})
                })

            elif event_type in ["status_update","status"]:
                events.append({
                    "type":"status",
                    "phone":e.get("recipient_id"),
                    "status":e.get("status"),
                    "message_id":(
                        e.get("message_id") or
                        e.get("request_id")
                    )
                })
        return events