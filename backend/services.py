import os
import io
import hmac
import hashlib
import logging
import requests
from datetime import datetime, timezone

logger = logging.getLogger("nss.services")

# ---------------- Object Storage ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "nss-nmamit"
_storage_key = None

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "svg": "image/svg+xml", "csv": "text/csv", "txt": "text/plain",
}


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def storage_path(folder: str, filename: str) -> str:
    ext = filename.split(".")[-1].lower() if "." in filename else "bin"
    import uuid as _uuid
    return f"{APP_NAME}/{folder}/{_uuid.uuid4()}.{ext}"


def mime_for(filename: str) -> str:
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    return MIME_TYPES.get(ext, "application/octet-stream")


# ---------------- Brevo Email ----------------
def brevo_configured() -> bool:
    return bool(os.environ.get("BREVO_API_KEY"))


def send_email(to_email: str, subject: str, html: str) -> bool:
    if not brevo_configured():
        logger.info(f"[EMAIL SKIPPED - Brevo not configured] to={to_email} subject={subject}")
        return False
    body = {
        "sender": {
            "email": os.environ.get("BREVO_SENDER_EMAIL", "no-reply@nmamit.in"),
            "name": os.environ.get("BREVO_SENDER_NAME", "NSS NMAMIT"),
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
    }
    try:
        r = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": os.environ["BREVO_API_KEY"], "content-type": "application/json"},
            json=body, timeout=15,
        )
        if r.status_code != 201:
            logger.error(f"Brevo send failed {r.status_code}: {r.text[:200]}")
            return False
        return True
    except Exception as e:
        logger.error(f"Brevo error: {e}")
        return False


# ---------------- Razorpay ----------------
def razorpay_configured() -> bool:
    return bool(os.environ.get("RAZORPAY_KEY_ID") and os.environ.get("RAZORPAY_KEY_SECRET"))


def razorpay_key_id() -> str:
    return os.environ.get("RAZORPAY_KEY_ID", "")


def _rz_client():
    import razorpay
    return razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))


def create_razorpay_order(amount_inr: float, receipt: str) -> dict:
    c = _rz_client()
    return c.order.create({
        "amount": int(round(amount_inr * 100)),
        "currency": "INR",
        "receipt": receipt[:40],
        "payment_capture": 1,
    })


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    generated = hmac.new(
        secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(generated, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    if not secret:
        return False
    generated = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated, signature)


# ---------------- PDF Invoice ----------------
NSS_LOGO_URL = "https://customer-assets-cm19k8pv.emergentagent.net/job_5085535f-5dce-4e3f-bd8e-237307d9e564/artifacts/ootad4l1_National_Service_Scheme_logo.svg.webp"
NMAMIT_LOGO_URL = "https://customer-assets-cm19k8pv.emergentagent.net/job_5085535f-5dce-4e3f-bd8e-237307d9e564/artifacts/hdtmqb2l_nitte-nmamit-logo.png"
_logo_cache = {}


def _fetch_logo(url):
    if url in _logo_cache:
        return _logo_cache[url]
    try:
        from PIL import Image
        r = requests.get(url, timeout=15)
        img = Image.open(io.BytesIO(r.content)).convert("RGBA")
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        out = io.BytesIO()
        bg.convert("RGB").save(out, format="PNG")
        out.seek(0)
        _logo_cache[url] = out
        return out
    except Exception as e:
        logger.error(f"logo fetch failed: {e}")
        return None


def generate_invoice_pdf(invoice: dict) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    navy = colors.HexColor("#1E3A8A")
    crimson = colors.HexColor("#DC2626")

    # Header band
    c.setFillColor(navy)
    c.rect(0, h - 42 * mm, w, 42 * mm, fill=1, stroke=0)

    nss = _fetch_logo(NSS_LOGO_URL)
    if nss:
        try:
            c.drawImage(ImageReader(nss), 15 * mm, h - 38 * mm, width=26 * mm, height=26 * mm,
                        preserveAspectRatio=True, mask="auto")
        except Exception:
            pass
    nmamit = _fetch_logo(NMAMIT_LOGO_URL)
    if nmamit:
        try:
            c.drawImage(ImageReader(nmamit), 44 * mm, h - 30 * mm, width=45 * mm, height=14 * mm,
                        preserveAspectRatio=True, mask="auto")
        except Exception:
            pass

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawRightString(w - 15 * mm, h - 20 * mm, "TAX INVOICE / RECEIPT")
    c.setFont("Helvetica", 9)
    c.drawRightString(w - 15 * mm, h - 27 * mm, "National Service Scheme - NMAMIT Nitte")

    y = h - 55 * mm
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(15 * mm, y, f"Invoice No: {invoice['invoice_number']}")
    c.setFont("Helvetica", 10)
    c.drawString(15 * mm, y - 6 * mm, f"Date: {invoice.get('created_at', '')[:10]}")
    c.drawString(15 * mm, y - 12 * mm, f"Status: {invoice.get('status', 'PAID').upper()}")

    c.setFont("Helvetica-Bold", 11)
    c.drawString(15 * mm, y - 24 * mm, "Billed To")
    c.setFont("Helvetica", 10)
    c.drawString(15 * mm, y - 30 * mm, invoice.get("student_name", ""))
    c.drawString(15 * mm, y - 36 * mm, f"USN: {invoice.get('usn', '')}")
    c.drawString(15 * mm, y - 42 * mm, invoice.get("email", ""))

    # Table
    ty = y - 58 * mm
    c.setFillColor(navy)
    c.rect(15 * mm, ty, w - 30 * mm, 9 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(18 * mm, ty + 2.6 * mm, "Description")
    c.drawRightString(w - 18 * mm, ty + 2.6 * mm, "Amount (INR)")

    c.setFillColor(colors.black)
    c.setFont("Helvetica", 10)
    c.drawString(18 * mm, ty - 8 * mm, f"Event Registration: {invoice.get('event_name', '')}")
    c.drawRightString(w - 18 * mm, ty - 8 * mm, f"{invoice.get('amount', 0):.2f}")

    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.line(15 * mm, ty - 14 * mm, w - 15 * mm, ty - 14 * mm)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(crimson)
    c.drawString(18 * mm, ty - 22 * mm, "Total Paid")
    c.drawRightString(w - 18 * mm, ty - 22 * mm, f"INR {invoice.get('amount', 0):.2f}")

    c.setFillColor(colors.HexColor("#64748b"))
    c.setFont("Helvetica", 8)
    c.drawString(15 * mm, ty - 32 * mm, f"Payment ID: {invoice.get('payment_id', '-')}")
    c.drawString(15 * mm, ty - 37 * mm, f"Order ID: {invoice.get('order_id', '-')}")

    # Footer
    c.setFillColor(navy)
    c.rect(0, 0, w, 20 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 8)
    c.drawCentredString(w / 2, 11 * mm, "NMAM Institute of Technology Nitte, SH1, Karkala, Karnataka 574110")
    c.drawCentredString(w / 2, 6 * mm, "NSS NMAMIT | nss@nmamit.in | This is a computer generated receipt.")

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()
