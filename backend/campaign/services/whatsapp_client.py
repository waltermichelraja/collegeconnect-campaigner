def build_template_payload(phone, campaign):
    phone=str(phone).strip()
    if not phone.startswith("+"):
        phone="+{}".format(phone)
    message=campaign.message_body
    message+="\n\nReply with:\n1. Yes\n2. No\n3. Maybe"
    return{"to": phone, "body": message}