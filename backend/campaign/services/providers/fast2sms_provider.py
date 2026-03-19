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
            "text":{
                "body":body
            }
        }
        headers={
            "authorization":settings.FAST2SMS_API_KEY,
            "content-type":"application/json"
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url,json=payload,headers=headers) as resp:
                data=await resp.json()
                return data


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
        events=data.get("whatsapp_reports",[])
        parsed=[]
        for event in events:
            if event.get("type")=="incoming_message":
                text=event.get("body")
                interactive=event.get("interactive",{})
                button_reply=interactive.get("button_reply",{})
                parsed.append({
                    "type":"message",
                    "phone":event.get("from"),
                    "text":text,
                    "button_id":button_reply.get("id"),
                    "message_id":event.get("message_id")
                })
            elif event.get("type")=="status_update":
                parsed.append({
                    "type":"status",
                    "phone":event.get("recipient_id"),
                    "status":event.get("status"),
                    "message_id":event.get("request_id")
                })
        return parsed