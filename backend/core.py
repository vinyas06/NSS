import os
import jwt
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from fastapi import HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
ALL_MODULES = ["members", "events", "gallery", "certificates", "attendance", "accounts"]


def now_utc():
    return datetime.now(timezone.utc)


def iso(dt=None):
    return (dt or now_utc()).isoformat()


def new_id():
    return str(uuid.uuid4())


def get_jwt_secret():
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": now_utc() + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def public_user(u: dict) -> dict:
    if not u:
        return u
    u = dict(u)
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_optional_user(request: Request):
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def is_admin_role(role: str) -> bool:
    return role in ("admin", "super_admin")


def user_can(user: dict, module: str) -> bool:
    role = user.get("role")
    if role == "super_admin":
        return True
    if role == "admin":
        return module in (user.get("permissions") or [])
    return False


def require_roles(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dep


def require_admin():
    async def dep(user: dict = Depends(get_current_user)):
        if not is_admin_role(user.get("role")):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    return dep


def require_perm(module: str):
    async def dep(user: dict = Depends(get_current_user)):
        if not user_can(user, module):
            raise HTTPException(status_code=403, detail=f"No access to {module}")
        return user
    return dep


def require_super_admin():
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Super admin access required")
        return user
    return dep


async def audit(actor: dict, action: str, target: str = "", meta: dict = None):
    await db.audit_logs.insert_one({
        "id": new_id(),
        "actor_id": actor.get("id") if actor else None,
        "actor_name": actor.get("name") if actor else None,
        "action": action,
        "target": target,
        "meta": meta or {},
        "created_at": iso(),
    })
