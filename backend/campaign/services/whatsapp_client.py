def build_template_payload(phone, campaign):
    phone=str(phone).strip()
    if not phone.startswith("+"):
        phone="+{}".format(phone)
    payload={
        "to":phone,
        "template_name":campaign.template_name,
        "variables":campaign.variables
    }
    return payload