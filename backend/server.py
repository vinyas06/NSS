import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

import core
from core import db, new_id, iso, now_utc, hash_password
import services
from api import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nss")

HERO_PHOTOS = [
    "https://customer-assets-cm19k8pv.emergentagent.net/job_nss-member-zone/artifacts/f7396ao6_OLD%20AGE%20HOME%20VISIT%20group%20photos.jpeg",
    "https://customer-assets-cm19k8pv.emergentagent.net/job_nss-member-zone/artifacts/lsipraba_iskcon%20visit%20group%20photos.jpeg",
    "https://customer-assets-cm19k8pv.emergentagent.net/job_nss-member-zone/artifacts/gfs2jkst_Candid%20photo%20of%20old%20age%20home.jpeg",
    "https://customer-assets-cm19k8pv.emergentagent.net/job_nss-member-zone/artifacts/b55ycsdg_Candid%20photos%20of%20old%20age%20home.jpeg",
]

app = FastAPI(title="NSS NMAMIT API")
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def ensure_indexes():
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("usn", sparse=True)
    await db.event_registrations.create_index([("event_id", 1), ("user_id", 1)], unique=True)
    await db.certificates.create_index("certificate_number", unique=True)
    await db.attendance.create_index([("event_id", 1), ("user_id", 1)], unique=True)


async def seed_admin(email, password, name, role):
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(), "name": name, "email": email,
            "password_hash": hash_password(password), "role": role,
            "permissions": core.ALL_MODULES, "membership_status": "active",
            "suspension": None, "social_links": {}, "must_change_password": False,
            "usn": None, "photo_path": None, "created_at": iso(),
        })
        logger.info(f"Seeded {role}: {email}")
    elif not core.verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password), "role": role}})


async def cleanup_and_seed_site():
    existing = await db.site_settings.find_one({"key": "main"})
    if not existing:
        # one-time removal of any previously seeded demo/sample data
        for c in ["events", "galleries", "team", "transactions", "event_registrations", "attendance", "certificates"]:
            await db[c].delete_many({})
        await db.users.delete_many({"role": {"$in": ["member", "user"]}})
        await db.site_settings.insert_one({
            "key": "main",
            "home_carousel": HERO_PHOTOS,
            "events_banner": HERO_PHOTOS[3],
            "gallery_banner": HERO_PHOTOS[1],
            "team_banner": HERO_PHOTOS[0],
            "theme": "light",
            "created_at": iso(),
        })
        logger.info("Demo data cleared and site settings seeded")


@app.on_event("startup")
async def startup():
    try:
        services.init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await ensure_indexes()
    await seed_admin(os.environ["SUPER_ADMIN_EMAIL"], os.environ["SUPER_ADMIN_PASSWORD"], "Pravith (Super Admin)", "super_admin")
    await seed_admin(os.environ["OWNER_EMAIL"], os.environ["OWNER_PASSWORD"], "NSS Owner", "super_admin")
    await cleanup_and_seed_site()
    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown():
    core.client.close()
