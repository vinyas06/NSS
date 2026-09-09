import os
import io
import csv
import random
import string
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Query, Response, Header
from pydantic import BaseModel, EmailStr, Field

import core
from core import (
    db, new_id, iso, now_utc, hash_password, verify_password, create_access_token,
    public_user, get_current_user, get_optional_user, require_admin, require_perm,
    require_super_admin, is_admin_role, user_can, audit, ALL_MODULES,
)
import services

logger = logging.getLogger("nss.api")
router = APIRouter(prefix="/api")


# ============================================================ AUTH
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    identifier: str  # email or USN
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


class ChangePwIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


async def _issue(user: dict):
    token = create_access_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": public_user(user)}


@router.post("/auth/register")
async def register(data: RegisterIn):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = {
        "id": new_id(), "name": data.name.strip(), "email": email,
        "password_hash": hash_password(data.password), "role": "user",
        "usn": None, "photo_path": None, "joined_year": now_utc().year,
        "social_links": {}, "membership_status": "none", "suspension": None,
        "permissions": [], "must_change_password": False, "created_at": iso(),
    }
    await db.users.insert_one(user)
    return await _issue(user)


@router.post("/auth/login")
async def login(data: LoginIn, request: Request):
    ident = data.identifier.lower().strip()
    ip = request.client.host if request.client else "?"
    key = f"{ip}:{ident}"
    la = await db.login_attempts.find_one({"identifier": key})
    if la and la.get("locked_until") and la["locked_until"] > iso():
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    user = await db.users.find_one({"email": ident})
    if not user:
        user = await db.users.find_one({"usn": data.identifier.upper().strip()})
    if not user or not verify_password(data.password, user["password_hash"]):
        count = (la.get("count", 0) if la else 0) + 1
        upd = {"identifier": key, "count": count}
        if count >= 5:
            from datetime import timedelta
            upd["locked_until"] = (now_utc() + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": key}, {"$set": upd}, upsert=True)
        if count >= 5:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("membership_status") == "suspended_perm":
        raise HTTPException(status_code=403, detail="Account permanently suspended. Contact admin.")
    if user.get("membership_status") == "suspended_temp":
        susp = user.get("suspension") or {}
        if not susp.get("end") or susp.get("end") > iso():
            raise HTTPException(status_code=403, detail=f"Account suspended until {susp.get('end', 'further notice')}")

    await db.login_attempts.delete_one({"identifier": key})
    return await _issue(user)


@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.post("/auth/forgot-password")
async def forgot(data: ForgotIn):
    import secrets
    from datetime import timedelta
    user = await db.users.find_one({"email": data.email.lower().strip()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "id": new_id(), "user_id": user["id"], "token": token,
            "expires_at": (now_utc() + timedelta(hours=1)).isoformat(),
            "used": False, "created_at": iso(),
        })
        link = f"{os.environ.get('FRONTEND_URL', '')}/reset-password?token={token}"
        services.send_email(user["email"], "NSS NMAMIT - Password Reset",
                            f"<p>Hi {user['name']},</p><p>Reset your password: <a href='{link}'>{link}</a></p><p>This link expires in 1 hour.</p>")
        logger.info(f"[RESET LINK] {link}")
    return {"message": "If that email exists, a reset link was sent."}


@router.post("/auth/reset-password")
async def reset(data: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": data.token, "used": False})
    if not rec or rec["expires_at"] < iso():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(data.new_password), "must_change_password": False}})
    await db.password_reset_tokens.update_one({"id": rec["id"]}, {"$set": {"used": True}})
    return {"message": "Password updated"}


@router.post("/auth/change-password")
async def change_pw(data: ChangePwIn, user: dict = Depends(get_current_user)):
    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(data.new_password), "must_change_password": False}})
    return {"message": "Password changed"}


# ============================================================ FILES
@router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), folder: str = Form("misc"), user: dict = Depends(get_current_user)):
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 15MB)")
    path = services.storage_path(folder, file.filename)
    ct = file.content_type or services.mime_for(file.filename)
    result = services.put_object(path, data, ct)
    rec = {
        "id": new_id(), "storage_path": result["path"], "original_filename": file.filename,
        "content_type": ct, "size": result.get("size", len(data)), "folder": folder,
        "uploaded_by": user["id"], "is_deleted": False, "created_at": iso(),
    }
    await db.files.insert_one(rec)
    return {"id": rec["id"], "path": result["path"], "content_type": ct}


@router.get("/files/{path:path}")
async def get_file(path: str, auth: Optional[str] = Query(None)):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
    data, ct = services.get_object(path)
    return Response(content=data, media_type=rec.get("content_type", ct))


# ============================================================ EVENTS (helpers)
def _reg_status(event: dict, count: int):
    st = event.get("status", "upcoming")
    if st in ("cancelled", "postponed"):
        return st, False, st.capitalize()
    now = iso()
    if event.get("compulsory"):
        return "compulsory", False, "Compulsory event - no registration needed"
    if st == "completed":
        return "closed", False, "Event completed"
    rs = event.get("reg_start")
    re = event.get("reg_end")
    if rs and now < rs:
        return "not_started", False, "Registration not started"
    cap = event.get("capacity")
    if cap and cap > 0 and count >= cap:
        return "full", False, "Registration full"
    if re and now > re:
        return "closed", False, "Registration closed"
    return "open", True, "Registration open"


async def _event_public(event: dict, user: Optional[dict] = None):
    count = await db.event_registrations.count_documents({"event_id": event["id"], "status": {"$in": ["registered", "paid"]}})
    status_code, can_register, reason = _reg_status(event, count)
    event = dict(event)
    event.pop("_id", None)
    event["registered_count"] = count
    event["reg_state"] = status_code
    event["can_register"] = can_register
    event["reg_reason"] = reason
    if user:
        reg = await db.event_registrations.find_one({"event_id": event["id"], "user_id": user["id"]}, {"_id": 0})
        event["my_registration"] = reg
    return event


@router.get("/events")
async def list_events(request: Request):
    user = await get_optional_user(request)
    events = await db.events.find({}, {"_id": 0}).sort("event_date", -1).to_list(200)
    return [await _event_public(e, user) for e in events]


@router.get("/events/{event_id}")
async def get_event(event_id: str, request: Request):
    user = await get_optional_user(request)
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    data = await _event_public(event, user)
    gallery = await db.galleries.find_one({"event_id": event_id}, {"_id": 0})
    data["gallery"] = gallery
    if user:
        cert = await db.certificates.find_one({"event_id": event_id, "user_id": user["id"]}, {"_id": 0})
        data["my_certificate"] = cert
    return data


@router.get("/events/{event_id}/registration-status")
async def reg_status_ep(event_id: str, request: Request):
    user = await get_optional_user(request)
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    data = await _event_public(event, user)
    return {"reg_state": data["reg_state"], "can_register": data["can_register"],
            "reason": data["reg_reason"], "registered_count": data["registered_count"],
            "my_registration": data.get("my_registration")}


class RegisterEventIn(BaseModel):
    accepted_terms: bool
    emergency_contact: Optional[str] = None


@router.post("/events/{event_id}/register")
async def register_event(event_id: str, data: RegisterEventIn, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("member", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Only NSS members can register for events")
    if not data.accepted_terms:
        raise HTTPException(status_code=400, detail="You must accept the terms and conditions")
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    existing = await db.event_registrations.find_one({"event_id": event_id, "user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=409, detail="Already registered for this event")
    count = await db.event_registrations.count_documents({"event_id": event_id, "status": {"$in": ["registered", "paid"]}})
    _, can_register, reason = _reg_status(event, count)
    if not can_register:
        raise HTTPException(status_code=400, detail=reason)

    is_paid = event.get("is_paid") and (event.get("fee") or 0) > 0
    reg = {
        "id": new_id(), "event_id": event_id, "event_name": event["name"],
        "user_id": user["id"], "student_name": user["name"], "usn": user.get("usn"),
        "email": user["email"], "accepted_terms": True,
        "emergency_contact": data.emergency_contact,
        "status": "payment_pending" if is_paid else "registered",
        "fee": event.get("fee", 0) if is_paid else 0,
        "created_at": iso(),
    }
    if is_paid:
        # reserve slot as payment_pending; will be counted only when paid via reservation check
        # but to prevent overbooking we count pending+paid
        pending = await db.event_registrations.count_documents({"event_id": event_id, "status": {"$in": ["registered", "paid", "payment_pending"]}})
        cap = event.get("capacity")
        if cap and cap > 0 and pending >= cap:
            raise HTTPException(status_code=400, detail="Registration full")
    await db.event_registrations.insert_one(reg)
    reg.pop("_id", None)
    if not is_paid:
        services.send_email(user["email"], f"Registered: {event['name']}",
                            f"<p>Hi {user['name']}, you are registered for <b>{event['name']}</b> on {(event.get('event_date') or '')[:10]}.</p>")
    return {"registration": reg, "requires_payment": bool(is_paid)}


# ============================================================ PAYMENTS
class CreateOrderIn(BaseModel):
    event_id: str


@router.get("/payments/config")
async def payments_config():
    return {"configured": services.razorpay_configured(), "key_id": services.razorpay_key_id()}


@router.post("/payments/create-order")
async def create_order(data: CreateOrderIn, user: dict = Depends(get_current_user)):
    reg = await db.event_registrations.find_one({"event_id": data.event_id, "user_id": user["id"]}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Register for the event first")
    if reg["status"] == "paid":
        raise HTTPException(status_code=400, detail="Already paid")
    if not services.razorpay_configured():
        raise HTTPException(status_code=503, detail="Payments not configured. Add Razorpay keys in backend .env")
    event = await db.events.find_one({"id": data.event_id}, {"_id": 0})
    order = services.create_razorpay_order(reg["fee"], f"reg_{reg['id'][:20]}")
    payment = {
        "id": new_id(), "registration_id": reg["id"], "user_id": user["id"],
        "event_id": data.event_id, "order_id": order["id"], "payment_id": None,
        "amount": reg["fee"], "currency": "INR", "status": "order_created",
        "verified": False, "created_at": iso(),
    }
    await db.payments.insert_one(payment)
    await db.event_registrations.update_one({"id": reg["id"]}, {"$set": {"status": "payment_pending", "order_id": order["id"]}})
    return {"order_id": order["id"], "amount": order["amount"], "currency": "INR",
            "key_id": services.razorpay_key_id(),
            "prefill": {"name": user["name"], "email": user["email"]},
            "event_name": event["name"]}


class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/payments/verify")
async def verify_payment(data: VerifyPaymentIn, user: dict = Depends(get_current_user)):
    if not services.verify_payment_signature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature):
        await db.payments.update_one({"order_id": data.razorpay_order_id}, {"$set": {"status": "failed", "verified": False}})
        raise HTTPException(status_code=400, detail="Payment verification failed")
    payment = await db.payments.find_one({"order_id": data.razorpay_order_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    await db.payments.update_one({"order_id": data.razorpay_order_id}, {"$set": {
        "payment_id": data.razorpay_payment_id, "signature": data.razorpay_signature,
        "status": "paid", "verified": True, "paid_at": iso()}})
    reg = await db.event_registrations.find_one({"id": payment["registration_id"]}, {"_id": 0})
    await db.event_registrations.update_one({"id": payment["registration_id"]}, {"$set": {"status": "paid", "payment_id": data.razorpay_payment_id}})
    event = await db.events.find_one({"id": payment["event_id"]}, {"_id": 0})

    inv = await _create_invoice(reg, event, payment, user)
    # ledger credit
    await db.transactions.insert_one({
        "id": new_id(), "type": "credit", "amount": payment["amount"],
        "category": "registration_fee", "event_id": event["id"], "event_name": event["name"],
        "reference": data.razorpay_payment_id, "description": f"Registration fee - {user['name']}",
        "created_by": "system", "created_at": iso(),
    })
    services.send_email(user["email"], f"Payment Confirmed: {event['name']}",
                        f"<p>Hi {user['name']}, your payment of INR {payment['amount']} for <b>{event['name']}</b> is confirmed. Invoice {inv['invoice_number']} is available in your profile.</p>")
    return {"status": "paid", "invoice_number": inv["invoice_number"]}


async def _create_invoice(reg, event, payment, user):
    seq = await db.invoices.count_documents({}) + 1
    inv = {
        "id": new_id(), "invoice_number": f"NSS/{now_utc().year}/{seq:05d}",
        "registration_id": reg["id"], "user_id": user["id"], "event_id": event["id"],
        "event_name": event["name"], "student_name": user["name"], "usn": user.get("usn"),
        "email": user["email"], "amount": payment["amount"], "order_id": payment["order_id"],
        "payment_id": payment["payment_id"], "status": "paid", "pdf_path": None, "created_at": iso(),
    }
    try:
        pdf = services.generate_invoice_pdf(inv)
        path = services.storage_path("invoices", f"{inv['invoice_number'].replace('/', '_')}.pdf")
        res = services.put_object(path, pdf, "application/pdf")
        inv["pdf_path"] = res["path"]
        await db.files.insert_one({"id": new_id(), "storage_path": res["path"], "original_filename": f"{inv['invoice_number']}.pdf",
                                   "content_type": "application/pdf", "size": res.get("size", len(pdf)),
                                   "folder": "invoices", "uploaded_by": "system", "is_deleted": False, "created_at": iso()})
    except Exception as e:
        logger.error(f"invoice pdf failed: {e}")
    await db.invoices.insert_one(inv)
    inv.pop("_id", None)
    return inv


@router.post("/payments/webhook")
async def webhook(request: Request, x_razorpay_signature: str = Header(None)):
    body = await request.body()
    if not services.verify_webhook_signature(body, x_razorpay_signature or ""):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    import json
    payload = json.loads(body)
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id")
    if order_id:
        await db.payments.update_one({"order_id": order_id}, {"$set": {"webhook_event": payload.get("event"), "webhook_at": iso()}})
    return {"status": "ok"}


# ============================================================ USER PORTAL
@router.get("/users/me/events")
async def my_events(user: dict = Depends(get_current_user)):
    regs = await db.event_registrations.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return regs


@router.get("/users/me/attendance")
async def my_attendance(user: dict = Depends(get_current_user)):
    if user.get("role") == "user":
        raise HTTPException(status_code=403, detail="This feature is only available to NSS members.")
    recs = await db.attendance.find({"user_id": user["id"], "status": {"$in": ["present"]}}, {"_id": 0}).to_list(500)
    return recs


@router.get("/users/me/certificates")
async def my_certificates(user: dict = Depends(get_current_user)):
    if user.get("role") == "user":
        raise HTTPException(status_code=403, detail="This feature is only available to NSS members.")
    certs = await db.certificates.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return certs


@router.get("/users/me/invoices")
async def my_invoices(user: dict = Depends(get_current_user)):
    invs = await db.invoices.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return invs


class UpdateProfileIn(BaseModel):
    name: Optional[str] = None
    photo_path: Optional[str] = None
    social_links: Optional[dict] = None


@router.patch("/users/me")
async def update_me(data: UpdateProfileIn, user: dict = Depends(get_current_user)):
    upd = {}
    if data.name:
        upd["name"] = data.name
    if data.photo_path is not None:
        upd["photo_path"] = data.photo_path
    if data.social_links is not None:
        upd["social_links"] = data.social_links
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(fresh)


# ============================================================ PUBLIC: GALLERY / TEAM / CERT VERIFY
@router.get("/galleries")
async def list_galleries(year: Optional[str] = None, category: Optional[str] = None):
    q = {}
    if year:
        q["year"] = year
    if category and category != "All":
        q["category"] = category
    gals = await db.galleries.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return gals


@router.get("/galleries/{gid}")
async def get_gallery(gid: str):
    g = await db.galleries.find_one({"id": gid}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Gallery not found")
    return g


@router.get("/team")
async def team():
    members = await db.team.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return members


@router.get("/certificates/{number}")
async def verify_certificate(number: str):
    cert = await db.certificates.find_one({"certificate_number": number}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="No certificate available for this number")
    return {
        "valid": True, "certificate_number": cert["certificate_number"],
        "student_name": cert["student_name"], "usn": cert.get("usn"),
        "event_name": cert["event_name"], "issued_date": cert.get("created_at", "")[:10],
        "document_path": cert.get("document_path"),
    }


@router.get("/home-stats")
async def home_stats():
    return {
        "events": await db.events.count_documents({}),
        "members": await db.users.count_documents({"role": "member"}),
        "certificates": await db.certificates.count_documents({}),
        "upcoming": await db.events.count_documents({"status": "upcoming"}),
    }


# ============================================================ ADMIN: MEMBERS
class MemberIn(BaseModel):
    name: str
    usn: str
    email: EmailStr
    photo_path: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    role_type: Optional[str] = "volunteer"  # volunteer / core


@router.get("/admin/members")
async def admin_members(q: Optional[str] = None, year: Optional[str] = None, branch: Optional[str] = None,
                        user: dict = Depends(require_perm("members"))):
    query = {"role": {"$in": ["member", "user"]}}
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"usn": {"$regex": q, "$options": "i"}}]
    if year:
        query["year"] = year
    if branch:
        query["branch"] = branch
    members = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return members


@router.post("/admin/members")
async def add_member(data: MemberIn, user: dict = Depends(require_perm("members"))):
    email = data.email.lower().strip()
    usn = data.usn.upper().strip()
    if await db.users.find_one({"$or": [{"email": email}, {"usn": usn}]}):
        raise HTTPException(status_code=409, detail="Member with this email or USN exists")
    member = {
        "id": new_id(), "name": data.name.strip(), "email": email, "usn": usn,
        "password_hash": hash_password(usn), "role": "member",
        "photo_path": data.photo_path, "branch": data.branch, "year": data.year,
        "role_type": data.role_type, "joined_year": now_utc().year,
        "social_links": {}, "membership_status": "active", "suspension": None,
        "permissions": [], "must_change_password": True, "created_at": iso(),
    }
    await db.users.insert_one(member)
    await audit(user, "member.add", usn)
    services.send_email(email, "Welcome to NSS NMAMIT",
                        f"<p>Hi {data.name}, you are now an NSS member. Login with USN <b>{usn}</b> and password <b>{usn}</b>. Please change your password after first login.</p>")
    return public_user(member)


@router.get("/admin/members/{mid}")
async def member_detail(mid: str, user: dict = Depends(require_perm("members"))):
    m = await db.users.find_one({"id": mid}, {"_id": 0, "password_hash": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    m["registrations"] = await db.event_registrations.find({"user_id": mid}, {"_id": 0}).to_list(200)
    m["certificates"] = await db.certificates.find({"user_id": mid}, {"_id": 0}).to_list(200)
    m["attendance"] = await db.attendance.find({"user_id": mid, "status": "present"}, {"_id": 0}).to_list(500)
    return m


class SuspendIn(BaseModel):
    mode: str  # temp / perm / active
    end: Optional[str] = None


@router.patch("/admin/members/{mid}/suspend")
async def suspend_member(mid: str, data: SuspendIn, user: dict = Depends(require_perm("members"))):
    if data.mode == "active":
        await db.users.update_one({"id": mid}, {"$set": {"membership_status": "active", "suspension": None}})
    elif data.mode == "temp":
        await db.users.update_one({"id": mid}, {"$set": {"membership_status": "suspended_temp", "suspension": {"start": iso(), "end": data.end}}})
    else:
        await db.users.update_one({"id": mid}, {"$set": {"membership_status": "suspended_perm", "suspension": {"start": iso()}}})
    await audit(user, "member.suspend", mid, {"mode": data.mode})
    return {"message": "Updated"}


@router.delete("/admin/members/{mid}")
async def delete_member(mid: str, user: dict = Depends(require_perm("members"))):
    await db.users.delete_one({"id": mid, "role": {"$in": ["member", "user"]}})
    await audit(user, "member.delete", mid)
    return {"message": "Deleted"}


@router.post("/admin/members/import")
async def import_members(file: UploadFile = File(...), user: dict = Depends(require_perm("members"))):
    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))
    added, skipped = 0, 0
    for row in reader:
        name = (row.get("name") or "").strip()
        usn = (row.get("usn") or "").strip().upper()
        email = (row.get("email") or "").strip().lower()
        if not (name and usn and email):
            skipped += 1
            continue
        if await db.users.find_one({"$or": [{"email": email}, {"usn": usn}]}):
            skipped += 1
            continue
        await db.users.insert_one({
            "id": new_id(), "name": name, "email": email, "usn": usn,
            "password_hash": hash_password(usn), "role": "member",
            "photo_path": None, "branch": (row.get("branch") or "").strip(),
            "year": (row.get("year") or "").strip(), "role_type": "volunteer",
            "joined_year": now_utc().year, "social_links": {}, "membership_status": "active",
            "suspension": None, "permissions": [], "must_change_password": True, "created_at": iso(),
        })
        added += 1
    await audit(user, "member.import", "", {"added": added, "skipped": skipped})
    return {"added": added, "skipped": skipped}


# ============================================================ ADMIN: EVENTS
class EventIn(BaseModel):
    name: str
    description: str = ""
    rules: str = ""
    location: str = ""
    thumbnail: Optional[str] = None
    event_date: Optional[str] = None
    reg_start: Optional[str] = None
    reg_end: Optional[str] = None
    is_paid: bool = False
    fee: float = 0
    capacity: int = 0
    compulsory: bool = False
    terms: str = ""
    status: str = "upcoming"
    service_hours: float = 0


@router.post("/admin/events")
async def create_event(data: EventIn, user: dict = Depends(require_perm("events"))):
    ev = data.model_dump()
    ev["id"] = new_id()
    ev["created_at"] = iso()
    await db.events.insert_one(ev)
    await audit(user, "event.create", ev["id"])
    ev.pop("_id", None)
    return ev


@router.patch("/admin/events/{eid}")
async def update_event(eid: str, data: EventIn, user: dict = Depends(require_perm("events"))):
    await db.events.update_one({"id": eid}, {"$set": data.model_dump()})
    await audit(user, "event.update", eid)
    ev = await db.events.find_one({"id": eid}, {"_id": 0})
    return ev


@router.delete("/admin/events/{eid}")
async def delete_event(eid: str, user: dict = Depends(require_perm("events"))):
    await db.events.delete_one({"id": eid})
    await audit(user, "event.delete", eid)
    return {"message": "Deleted"}


@router.get("/admin/events/{eid}/registrations")
async def event_registrations(eid: str, user: dict = Depends(require_perm("events"))):
    regs = await db.event_registrations.find({"event_id": eid}, {"_id": 0}).to_list(1000)
    for r in regs:
        inv = await db.invoices.find_one({"registration_id": r["id"]}, {"_id": 0})
        r["invoice"] = inv
    return regs


# ============================================================ ADMIN: ATTENDANCE
class AttendanceIn(BaseModel):
    event_id: str
    user_id: str
    status: str  # present / absent


@router.post("/admin/attendance")
async def mark_attendance(data: AttendanceIn, user: dict = Depends(require_perm("attendance"))):
    event = await db.events.find_one({"id": data.event_id}, {"_id": 0})
    member = await db.users.find_one({"id": data.user_id}, {"_id": 0})
    if not event or not member:
        raise HTTPException(status_code=404, detail="Event or member not found")
    rec = {
        "event_id": data.event_id, "event_name": event["name"], "user_id": data.user_id,
        "student_name": member["name"], "usn": member.get("usn"), "status": data.status,
        "service_hours": event.get("service_hours", 0) if data.status == "present" else 0,
        "event_date": event.get("event_date"),
        "marked_by": user["id"], "updated_at": iso(),
    }
    existing = await db.attendance.find_one({"event_id": data.event_id, "user_id": data.user_id})
    if existing:
        await db.attendance.update_one({"_id": existing["_id"]}, {"$set": rec})
    else:
        rec["id"] = new_id()
        rec["created_at"] = iso()
        await db.attendance.insert_one(rec)
    await audit(user, "attendance.mark", f"{data.event_id}/{data.user_id}", {"status": data.status})
    return {"message": "Marked"}


@router.get("/admin/attendance/{eid}")
async def event_attendance(eid: str, user: dict = Depends(require_perm("attendance"))):
    regs = await db.event_registrations.find({"event_id": eid}, {"_id": 0}).to_list(1000)
    result = []
    for r in regs:
        att = await db.attendance.find_one({"event_id": eid, "user_id": r["user_id"]}, {"_id": 0})
        result.append({"user_id": r["user_id"], "student_name": r["student_name"],
                       "usn": r.get("usn"), "status": att["status"] if att else "unmarked"})
    return result


# ============================================================ ADMIN: CERTIFICATES
@router.get("/admin/certificates")
async def admin_certs(event_id: Optional[str] = None, user: dict = Depends(require_perm("certificates"))):
    q = {}
    if event_id:
        q["event_id"] = event_id
    return await db.certificates.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.get("/admin/certificates/participants/{eid}")
async def cert_participants(eid: str, user: dict = Depends(require_perm("certificates"))):
    regs = await db.event_registrations.find({"event_id": eid}, {"_id": 0}).to_list(1000)
    for r in regs:
        r["certificate"] = await db.certificates.find_one({"event_id": eid, "user_id": r["user_id"]}, {"_id": 0})
    return regs


class CertIn(BaseModel):
    event_id: str
    user_id: str
    document_path: str


@router.post("/admin/certificates")
async def issue_cert(data: CertIn, user: dict = Depends(require_perm("certificates"))):
    if not data.document_path:
        raise HTTPException(status_code=400, detail="Certificate document must be uploaded first")
    event = await db.events.find_one({"id": data.event_id}, {"_id": 0})
    member = await db.users.find_one({"id": data.user_id}, {"_id": 0})
    if not event or not member:
        raise HTTPException(status_code=404, detail="Event or member not found")
    number = f"NSS-NMAMIT-{now_utc().year}-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    while await db.certificates.find_one({"certificate_number": number}):
        number = f"NSS-NMAMIT-{now_utc().year}-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    cert = {
        "id": new_id(), "certificate_number": number, "event_id": data.event_id,
        "event_name": event["name"], "user_id": data.user_id, "student_name": member["name"],
        "usn": member.get("usn"), "document_path": data.document_path,
        "verify_url": f"/certificate/{number}", "created_at": iso(),
    }
    await db.certificates.insert_one(cert)
    await audit(user, "certificate.issue", number)
    services.send_email(member["email"], f"Certificate Issued: {event['name']}",
                        f"<p>Hi {member['name']}, your certificate ({number}) for <b>{event['name']}</b> is available in your profile. Verify at /certificate/{number}.</p>")
    cert.pop("_id", None)
    return cert


@router.delete("/admin/certificates/{cid}")
async def delete_cert(cid: str, user: dict = Depends(require_perm("certificates"))):
    cert = await db.certificates.find_one({"id": cid}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Not found")
    await db.certificates.delete_one({"id": cid})
    await audit(user, "certificate.delete", cert.get("certificate_number"))
    return {"message": "Deleted and verification link invalidated"}


# ============================================================ ADMIN: GALLERY
class GalleryIn(BaseModel):
    title: str
    event_id: Optional[str] = None
    banner: Optional[str] = None
    category: str = "Workshops"
    year: str = ""
    event_date: Optional[str] = None
    drive_link: Optional[str] = None
    description: str = ""
    photos: List[str] = []
    featured: List[str] = []


@router.post("/admin/galleries")
async def create_gallery(data: GalleryIn, user: dict = Depends(require_perm("gallery"))):
    g = data.model_dump()
    g["id"] = new_id()
    g["created_at"] = iso()
    await db.galleries.insert_one(g)
    await audit(user, "gallery.create", g["id"])
    g.pop("_id", None)
    return g


@router.patch("/admin/galleries/{gid}")
async def update_gallery(gid: str, data: GalleryIn, user: dict = Depends(require_perm("gallery"))):
    await db.galleries.update_one({"id": gid}, {"$set": data.model_dump()})
    g = await db.galleries.find_one({"id": gid}, {"_id": 0})
    return g


@router.delete("/admin/galleries/{gid}")
async def delete_gallery(gid: str, user: dict = Depends(require_perm("gallery"))):
    await db.galleries.delete_one({"id": gid})
    await audit(user, "gallery.delete", gid)
    return {"message": "Deleted"}


# ============================================================ ADMIN: ACCOUNTS
class TxnIn(BaseModel):
    type: str  # credit / debit / adjustment
    amount: float
    category: str
    event_id: Optional[str] = None
    reference: Optional[str] = None
    description: str = ""


@router.get("/admin/transactions")
async def list_txns(type: Optional[str] = None, event_id: Optional[str] = None, user: dict = Depends(require_perm("accounts"))):
    q = {}
    if type:
        q["type"] = type
    if event_id:
        q["event_id"] = event_id
    return await db.transactions.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.post("/admin/transactions")
async def add_txn(data: TxnIn, user: dict = Depends(require_perm("accounts"))):
    t = data.model_dump()
    t["id"] = new_id()
    t["created_by"] = user["name"]
    t["created_at"] = iso()
    if data.event_id:
        ev = await db.events.find_one({"id": data.event_id}, {"_id": 0})
        t["event_name"] = ev["name"] if ev else None
    await db.transactions.insert_one(t)
    await audit(user, "transaction.add", t["id"], {"type": data.type, "amount": data.amount})
    t.pop("_id", None)
    return t


@router.delete("/admin/transactions/{tid}")
async def del_txn(tid: str, user: dict = Depends(require_perm("accounts"))):
    await db.transactions.delete_one({"id": tid})
    await audit(user, "transaction.delete", tid)
    return {"message": "Deleted"}


@router.get("/admin/accounts/summary")
async def accounts_summary(user: dict = Depends(require_perm("accounts"))):
    txns = await db.transactions.find({}, {"_id": 0}).to_list(5000)
    inflow = sum(t["amount"] for t in txns if t["type"] == "credit")
    outflow = sum(t["amount"] for t in txns if t["type"] == "debit")
    adj = sum(t["amount"] for t in txns if t["type"] == "adjustment")
    reg_fees = sum(t["amount"] for t in txns if t.get("category") == "registration_fee")
    return {"inflow": inflow, "outflow": outflow, "adjustment": adj,
            "balance": inflow - outflow + adj, "registration_fees": reg_fees,
            "transaction_count": len(txns)}


# ============================================================ ADMIN DASHBOARD
@router.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(require_admin())):
    return {
        "total_events": await db.events.count_documents({}),
        "upcoming_events": await db.events.count_documents({"status": "upcoming"}),
        "live_events": await db.events.count_documents({"status": "live"}),
        "total_members": await db.users.count_documents({"role": "member"}),
        "core_members": await db.users.count_documents({"role": "member", "role_type": "core"}),
        "total_certificates": await db.certificates.count_documents({}),
        "total_registrations": await db.event_registrations.count_documents({}),
    }


@router.get("/admin/permissions")
async def my_permissions(user: dict = Depends(require_admin())):
    return {"role": user["role"], "permissions": ALL_MODULES if user["role"] == "super_admin" else (user.get("permissions") or [])}


# ============================================================ SUPER ADMIN
class AdminIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "admin"  # admin / super_admin
    permissions: List[str] = []
    age: Optional[int] = None
    dob: Optional[str] = None
    usn: Optional[str] = None
    phone: Optional[str] = None
    branch: Optional[str] = None
    designation: Optional[str] = None


@router.get("/super-admin/admins")
async def list_admins(user: dict = Depends(require_super_admin())):
    return await db.users.find({"role": {"$in": ["admin", "super_admin"]}}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(200)


@router.post("/super-admin/admins")
async def create_admin(data: AdminIn, user: dict = Depends(require_super_admin())):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already exists")
    if data.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    admin = {
        "id": new_id(), "name": data.name.strip(), "email": email,
        "password_hash": hash_password(data.password), "role": data.role,
        "permissions": ALL_MODULES if data.role == "super_admin" else data.permissions,
        "age": data.age, "dob": data.dob, "usn": data.usn, "phone": data.phone,
        "branch": data.branch, "designation": data.designation, "membership_status": "active", "suspension": None,
        "social_links": {}, "must_change_password": False, "created_at": iso(),
    }
    await db.users.insert_one(admin)
    await audit(user, "admin.create", email, {"role": data.role})
    return public_user(admin)


class AdminUpdateIn(BaseModel):
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    name: Optional[str] = None


@router.patch("/super-admin/admins/{aid}")
async def update_admin(aid: str, data: AdminUpdateIn, user: dict = Depends(require_super_admin())):
    upd = {}
    if data.name:
        upd["name"] = data.name
    if data.role:
        upd["role"] = data.role
        if data.role == "super_admin":
            upd["permissions"] = ALL_MODULES
    if data.permissions is not None and data.role != "super_admin":
        upd["permissions"] = data.permissions
    await db.users.update_one({"id": aid}, {"$set": upd})
    await audit(user, "admin.update", aid, upd)
    return await db.users.find_one({"id": aid}, {"_id": 0, "password_hash": 0})


@router.delete("/super-admin/admins/{aid}")
async def delete_admin(aid: str, user: dict = Depends(require_super_admin())):
    if aid == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    target = await db.users.find_one({"id": aid}, {"_id": 0})
    if not target or target["role"] not in ("admin", "super_admin"):
        raise HTTPException(status_code=404, detail="Admin not found")
    await db.users.delete_one({"id": aid})
    await audit(user, "admin.delete", aid)
    return {"message": "Deleted"}


class RoleIn(BaseModel):
    name: str
    description: str = ""
    permissions: List[str] = []


@router.get("/super-admin/roles")
async def list_roles(user: dict = Depends(require_super_admin())):
    return await db.roles.find({}, {"_id": 0}).to_list(100)


@router.post("/super-admin/roles")
async def create_role(data: RoleIn, user: dict = Depends(require_super_admin())):
    r = data.model_dump()
    r["id"] = new_id()
    r["created_at"] = iso()
    await db.roles.insert_one(r)
    r.pop("_id", None)
    return r


@router.patch("/super-admin/roles/{rid}")
async def update_role(rid: str, data: RoleIn, user: dict = Depends(require_super_admin())):
    await db.roles.update_one({"id": rid}, {"$set": data.model_dump()})
    return await db.roles.find_one({"id": rid}, {"_id": 0})


@router.delete("/super-admin/roles/{rid}")
async def delete_role(rid: str, user: dict = Depends(require_super_admin())):
    await db.roles.delete_one({"id": rid})
    return {"message": "Deleted"}


@router.get("/super-admin/audit-logs")
async def audit_logs(user: dict = Depends(require_super_admin())):
    return await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(300)


@router.get("/modules")
async def modules():
    return ALL_MODULES


# ============================================================ SITE CONTENT
@router.get("/site-content")
async def get_site_content():
    doc = await db.site_settings.find_one({"key": "main"}, {"_id": 0})
    return doc or {"key": "main", "home_carousel": [], "events_banner": None, "gallery_banner": None, "team_banner": None, "theme": "light"}


class SiteContentIn(BaseModel):
    home_carousel: Optional[List[str]] = None
    events_banner: Optional[str] = None
    gallery_banner: Optional[str] = None
    team_banner: Optional[str] = None
    theme: Optional[str] = None


@router.put("/admin/site-content")
async def update_site_content(data: SiteContentIn, user: dict = Depends(require_admin())):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.site_settings.update_one({"key": "main"}, {"$set": upd}, upsert=True)
    await audit(user, "site-content.update", "main")
    return await db.site_settings.find_one({"key": "main"}, {"_id": 0})


# ============================================================ TEAM (admin)
class TeamIn(BaseModel):
    name: str
    role: str
    photo: Optional[str] = None
    order: int = 99
    category: str = "Core Team"  # Programme Officer / Faculty / Core Team / Volunteer


@router.post("/admin/team")
async def add_team(data: TeamIn, user: dict = Depends(require_admin())):
    t = data.model_dump()
    t["id"] = new_id()
    await db.team.insert_one(t)
    await audit(user, "team.add", t["id"])
    t.pop("_id", None)
    return t


@router.patch("/admin/team/{tid}")
async def update_team(tid: str, data: TeamIn, user: dict = Depends(require_admin())):
    await db.team.update_one({"id": tid}, {"$set": data.model_dump()})
    return await db.team.find_one({"id": tid}, {"_id": 0})


@router.delete("/admin/team/{tid}")
async def delete_team(tid: str, user: dict = Depends(require_admin())):
    await db.team.delete_one({"id": tid})
    await audit(user, "team.delete", tid)
    return {"message": "Deleted"}


# ============================================================ ATTENDANCE QR SCAN
class ScanIn(BaseModel):
    code: str
    event_id: Optional[str] = None


@router.post("/admin/attendance/scan")
async def scan_attendance(data: ScanIn, user: dict = Depends(require_perm("attendance"))):
    reg = await db.event_registrations.find_one({"id": data.code.strip()}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Invalid admission pass")
    if data.event_id and reg["event_id"] != data.event_id:
        raise HTTPException(status_code=400, detail="This pass is for a different event")
    event = await db.events.find_one({"id": reg["event_id"]}, {"_id": 0})
    rec = {
        "event_id": reg["event_id"], "event_name": reg["event_name"], "user_id": reg["user_id"],
        "student_name": reg["student_name"], "usn": reg.get("usn"), "status": "present",
        "service_hours": event.get("service_hours", 0) if event else 0,
        "event_date": event.get("event_date") if event else None, "marked_by": user["id"], "updated_at": iso(),
    }
    existing = await db.attendance.find_one({"event_id": reg["event_id"], "user_id": reg["user_id"]})
    if existing:
        await db.attendance.update_one({"_id": existing["_id"]}, {"$set": rec})
        already = existing.get("status") == "present"
    else:
        rec["id"] = new_id()
        rec["created_at"] = iso()
        await db.attendance.insert_one(rec)
        already = False
    await audit(user, "attendance.scan", f"{reg['event_id']}/{reg['user_id']}")
    return {"student_name": reg["student_name"], "usn": reg.get("usn"), "event_name": reg["event_name"], "already_present": already}
