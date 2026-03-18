def build_template_payload(phone, campaign):
    phone=str(phone).strip()
    if not phone.startswith("+"):
        phone="+{}".format(phone)
    message=campaign.message_body
    if campaign.buttons:
        message+="\n\nReply with:\n"
        for idx,btn in enumerate(campaign.buttons,start=1):
            message+=f"{idx}. {btn['title']}\n"
    payload={"to":phone,"body":message}
    if getattr(campaign,"image_url",None):
        payload["media_url"]=[campaign.image_url]
    return payload