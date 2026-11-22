import os
import hmac
import hashlib
import lemonsqueezy

API_KEY = os.getenv("LEMONSQUEEZY_API_KEY")
LS_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/activate"

def verify_ls(body: bytes, sig: str, event_name: str):
    expected = hmac.new(os.environ["LEMONSQUEEZY_WEBHOOK_SECRET"].encode(), body, hashlib.sha256).hexdigest()
    if event_name == "subscription_cancelled":
        return False
    return hmac.compare_digest(sig, expected)
