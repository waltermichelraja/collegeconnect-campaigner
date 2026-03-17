import threading
import asyncio


def run_async_task(coro):
    def runner():
        asyncio.run(coro)
    
    thread=threading.Thread(target=runner)
    thread.daemon=True
    thread.start()