import requests
from django.conf import settings

BASE_URL="https://graph.facebook.com/v19.0"


def headers():
    return{
        "Authorization":f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type":"application/json"
    }

def upload_media(file_path):
    url=f"{BASE_URL}/{settings.PHONE_NUMBER_ID}/media"
    files={
        "file":open(file_path,"rb"),
        "type":"image/jpeg",
        "messaging_product":"whatsapp"
    }
    headers={"Authorization":f"Bearer {settings.WHATSAPP_TOKEN}"}
    r=requests.post(url,headers=headers,files=files)
    return r.json()["id"]

def build_interactive_message(phone, media_id, message, buttons):
    return{
        "messaging_product":"whatsapp",
        "to":phone,
        "type":"interactive",
        "interactive":{
            "type":"button",
            "header":{
                "type":"image",
                "image":{"id":media_id}
            },
            "body":{
                "text":message
            },
            "action":{
                "buttons":[
                    {
                        "type":"reply",
                        "reply":{
                            "id":btn["id"],
                            "title":btn["title"]
                        }
                    }
                    for btn in buttons
                ]
            }
        }
    }
