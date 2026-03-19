class WhatsAppProvider:
    async def send_message(self,to,body,media_url=None):
        raise NotImplementedError

    async def parse_webhook(self,request):
        raise NotImplementedError