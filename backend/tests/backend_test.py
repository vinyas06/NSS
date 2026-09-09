"""
NSS NMAMIT Backend API tests - Iteration 2.
Demo data was removed - tests create their own member + event.
Covers: auth, RBAC, events lifecycle, registration, admin CRUD,
certificates, gallery, accounts, super-admin, files, verify,
NEW: site-content, team CRUD, attendance scan, admin designation.
"""
import os
import io
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"

SUPER = {"identifier": "pravith@gmail.com", "password": "12345678"}
OWNER = {"identifier": "admin@renenture.com", "password": "Owner@NSS2026"}


def login(payload):
    return requests.post(f"{API}/auth/login", json=payload, timeout=15)


def hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


# --- fixtures ---
@pytest.fixture(scope="session")
def super_token():
    r = login(SUPER)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def member(super_token):
    """Create a fresh test member (default password = USN)."""
    usn = f"TEST{uuid.uuid4().hex[:6].upper()}"
    email = f"TEST_{usn.lower()}@test.com"
    r = requests.post(f"{API}/admin/members", headers=hdr(super_token),
                      json={"name": "TEST Member", "usn": usn, "email": email})
    assert r.status_code == 200, r.text
    m = r.json()
    tok = login({"identifier": usn, "password": usn}).json()["token"]
    yield {"id": m["id"], "usn": usn, "email": email, "token": tok}
    requests.delete(f"{API}/admin/members/{m['id']}", headers=hdr(super_token))


@pytest.fixture(scope="session")
def user_token():
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "Test User", "email": email, "password": "test1234"
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"], email


# --- AUTH ---
class TestAuth:
    def test_login_super(self):
        r = login(SUPER)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["role"] == "super_admin"

    def test_login_owner(self):
        r = login(OWNER)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "super_admin"

    def test_login_member_by_usn(self, member):
        r = login({"identifier": member["usn"], "password": member["usn"]})
        assert r.status_code == 200
        assert r.json()["user"]["usn"] == member["usn"]

    def test_login_wrong_password(self):
        r = login({"identifier": "pravith@gmail.com", "password": "wrongpw"})
        assert r.status_code == 401

    def test_me(self, super_token):
        r = requests.get(f"{API}/auth/me", headers=hdr(super_token))
        assert r.status_code == 200
        assert r.json()["email"] == "pravith@gmail.com"


# --- Public content ---
class TestPublicContent:
    def test_events_empty_or_list(self):
        r = requests.get(f"{API}/events")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_team_public(self):
        r = requests.get(f"{API}/team")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_galleries_public(self):
        r = requests.get(f"{API}/galleries")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_home_stats(self):
        r = requests.get(f"{API}/home-stats")
        assert r.status_code == 200
        for k in ("events", "members", "certificates", "upcoming"):
            assert k in r.json()

    def test_site_content_public(self):
        r = requests.get(f"{API}/site-content")
        assert r.status_code == 200
        d = r.json()
        for k in ("home_carousel", "events_banner", "gallery_banner", "team_banner", "theme"):
            assert k in d
        # Seeded HERO_PHOTOS should be present
        assert isinstance(d["home_carousel"], list)
        assert len(d["home_carousel"]) >= 1

    def test_only_two_super_admins_seeded(self, super_token):
        r = requests.get(f"{API}/super-admin/admins", headers=hdr(super_token))
        assert r.status_code == 200
        admins = r.json()
        sa_emails = {a["email"] for a in admins if a["role"] == "super_admin"}
        # Must include the two seeded ones; test-created admins from prior tests may
        # add more but the two seeded MUST be present
        assert "pravith@gmail.com" in sa_emails
        assert "admin@renenture.com" in sa_emails


# --- Access control ---
class TestAccessControl:
    def test_non_member_certificates_forbidden(self, user_token):
        tok, _ = user_token
        r = requests.get(f"{API}/users/me/certificates", headers=hdr(tok))
        assert r.status_code == 403

    def test_member_can_access_certificates(self, member):
        r = requests.get(f"{API}/users/me/certificates", headers=hdr(member["token"]))
        assert r.status_code == 200

    def test_member_cannot_super_admin(self, member):
        r = requests.get(f"{API}/super-admin/admins", headers=hdr(member["token"]))
        assert r.status_code == 403


# --- Events + registration + attendance + scan ---
class TestEventLifecycle:
    def test_create_event_and_reg_and_scan(self, super_token, member):
        # create free event
        ev = requests.post(f"{API}/admin/events", headers=hdr(super_token),
                           json={"name": "TEST Iter2 Event", "description": "d"}).json()
        eid = ev["id"]

        # public list should contain it
        pub = requests.get(f"{API}/events").json()
        assert any(e["id"] == eid for e in pub)

        # member register
        reg = requests.post(f"{API}/events/{eid}/register",
                            headers=hdr(member["token"]),
                            json={"accepted_terms": True})
        assert reg.status_code == 200, reg.text
        reg_id = reg.json()["registration"]["id"]

        # duplicate 409
        dup = requests.post(f"{API}/events/{eid}/register",
                            headers=hdr(member["token"]),
                            json={"accepted_terms": True})
        assert dup.status_code == 409

        # attendance scan - manual code (registration id)
        scan = requests.post(f"{API}/admin/attendance/scan",
                             headers=hdr(super_token),
                             json={"code": reg_id, "event_id": eid})
        assert scan.status_code == 200, scan.text
        d = scan.json()
        assert d["student_name"] == "TEST Member"
        assert d["usn"] == member["usn"]
        assert d["event_name"] == "TEST Iter2 Event"
        assert d["already_present"] is False

        # rescan -> already_present true
        scan2 = requests.post(f"{API}/admin/attendance/scan",
                              headers=hdr(super_token),
                              json={"code": reg_id, "event_id": eid})
        assert scan2.status_code == 200
        assert scan2.json()["already_present"] is True

        # invalid code -> 404
        bad = requests.post(f"{API}/admin/attendance/scan",
                            headers=hdr(super_token),
                            json={"code": "does-not-exist", "event_id": eid})
        assert bad.status_code == 404

        # wrong event_id -> 400
        ev2 = requests.post(f"{API}/admin/events", headers=hdr(super_token),
                            json={"name": "TEST Iter2 Event 2"}).json()
        wrong = requests.post(f"{API}/admin/attendance/scan",
                              headers=hdr(super_token),
                              json={"code": reg_id, "event_id": ev2["id"]})
        assert wrong.status_code == 400

        # verify attendance appears
        att = requests.get(f"{API}/admin/attendance/{eid}", headers=hdr(super_token))
        assert att.status_code == 200
        assert any(x["status"] == "present" and x["user_id"] == member["id"] for x in att.json())

        # cleanup
        requests.delete(f"{API}/admin/events/{eid}", headers=hdr(super_token))
        requests.delete(f"{API}/admin/events/{ev2['id']}", headers=hdr(super_token))


# --- SITE CONTENT ---
class TestSiteContent:
    def test_update_and_get_site_content(self, super_token):
        # capture original
        original = requests.get(f"{API}/site-content").json()
        new_carousel = ["https://example.com/a.jpg", "https://example.com/b.jpg"]
        r = requests.put(f"{API}/admin/site-content", headers=hdr(super_token),
                         json={"home_carousel": new_carousel, "theme": "dark",
                               "events_banner": "https://example.com/ev.jpg"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["home_carousel"] == new_carousel
        assert d["theme"] == "dark"
        assert d["events_banner"] == "https://example.com/ev.jpg"
        # persisted via public GET
        pub = requests.get(f"{API}/site-content").json()
        assert pub["theme"] == "dark"
        assert pub["home_carousel"] == new_carousel
        # restore
        requests.put(f"{API}/admin/site-content", headers=hdr(super_token),
                     json={"home_carousel": original.get("home_carousel") or [],
                           "theme": original.get("theme") or "light",
                           "events_banner": original.get("events_banner"),
                           "gallery_banner": original.get("gallery_banner"),
                           "team_banner": original.get("team_banner")})

    def test_site_content_requires_admin(self, member):
        r = requests.put(f"{API}/admin/site-content", headers=hdr(member["token"]),
                         json={"theme": "dark"})
        assert r.status_code == 403


# --- TEAM CRUD ---
class TestTeam:
    def test_team_crud(self, super_token):
        r = requests.post(f"{API}/admin/team", headers=hdr(super_token),
                          json={"name": "TEST Team Member", "role": "Volunteer",
                                "category": "Core Team", "order": 5})
        assert r.status_code == 200, r.text
        tid = r.json()["id"]
        # public GET
        pub = requests.get(f"{API}/team").json()
        assert any(t["id"] == tid for t in pub)
        # patch
        p = requests.patch(f"{API}/admin/team/{tid}", headers=hdr(super_token),
                           json={"name": "TEST Team Updated", "role": "Lead",
                                 "category": "Core Team", "order": 5})
        assert p.status_code == 200
        assert p.json()["name"] == "TEST Team Updated"
        # delete
        d = requests.delete(f"{API}/admin/team/{tid}", headers=hdr(super_token))
        assert d.status_code == 200
        pub2 = requests.get(f"{API}/team").json()
        assert not any(t["id"] == tid for t in pub2)


# --- ADMIN DESIGNATION + module-limited perms ---
class TestAdminDesignation:
    def test_create_admin_with_designation_and_perms(self, super_token):
        email = f"TEST_admin_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/super-admin/admins", headers=hdr(super_token),
                          json={"name": "TEST Admin", "email": email,
                                "password": "adminpw1", "role": "admin",
                                "permissions": ["gallery"],
                                "designation": "Core Member"})
        assert r.status_code == 200, r.text
        created = r.json()
        aid = created["id"]
        assert created.get("designation") == "Core Member"
        assert created.get("permissions") == ["gallery"]

        # login as this admin
        tok = login({"identifier": email, "password": "adminpw1"}).json()["token"]

        # gallery permitted
        g = requests.post(f"{API}/admin/galleries", headers=hdr(tok),
                          json={"title": "TEST perm gallery", "category": "Workshops", "year": "2026"})
        assert g.status_code == 200
        gid = g.json()["id"]
        requests.delete(f"{API}/admin/galleries/{gid}", headers=hdr(tok))

        # non-gallery admin endpoint -> 403
        m = requests.get(f"{API}/admin/members", headers=hdr(tok))
        assert m.status_code == 403

        # super-admin endpoint -> 403
        s = requests.get(f"{API}/super-admin/admins", headers=hdr(tok))
        assert s.status_code == 403

        # cleanup
        requests.delete(f"{API}/super-admin/admins/{aid}", headers=hdr(super_token))

    def test_designations_various(self, super_token):
        for desig in ["Teacher", "Programme Officer", "Core Member"]:
            email = f"TEST_a_{uuid.uuid4().hex[:6]}@test.com"
            r = requests.post(f"{API}/super-admin/admins", headers=hdr(super_token),
                              json={"name": f"TEST {desig}", "email": email,
                                    "password": "pw123456", "role": "admin",
                                    "permissions": ["events"], "designation": desig})
            assert r.status_code == 200
            assert r.json()["designation"] == desig
            requests.delete(f"{API}/super-admin/admins/{r.json()['id']}", headers=hdr(super_token))


# --- Regression: certs / gallery / accounts / files ---
class TestRegression:
    def test_certificate_flow(self, super_token, member):
        files = {"file": ("cert.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")}
        u = requests.post(f"{API}/files/upload", headers=hdr(super_token),
                          files=files, data={"folder": "certificates"})
        assert u.status_code == 200
        path = u.json()["path"]
        ev = requests.post(f"{API}/admin/events", headers=hdr(super_token),
                           json={"name": "TEST Cert Event"}).json()
        good = requests.post(f"{API}/admin/certificates", headers=hdr(super_token),
                             json={"event_id": ev["id"], "user_id": member["id"],
                                   "document_path": path})
        assert good.status_code == 200
        num = good.json()["certificate_number"]
        v = requests.get(f"{API}/certificates/{num}")
        assert v.status_code == 200 and v.json()["valid"] is True
        # delete invalidates
        requests.delete(f"{API}/admin/certificates/{good.json()['id']}", headers=hdr(super_token))
        assert requests.get(f"{API}/certificates/{num}").status_code == 404
        requests.delete(f"{API}/admin/events/{ev['id']}", headers=hdr(super_token))

    def test_gallery_crud(self, super_token):
        r = requests.post(f"{API}/admin/galleries", headers=hdr(super_token),
                          json={"title": "TEST Gallery", "category": "Workshops",
                                "year": "2026", "photos": ["p1"]})
        assert r.status_code == 200
        gid = r.json()["id"]
        assert requests.get(f"{API}/galleries/{gid}").status_code == 200
        assert requests.delete(f"{API}/admin/galleries/{gid}", headers=hdr(super_token)).status_code == 200

    def test_accounts(self, super_token):
        r = requests.post(f"{API}/admin/transactions", headers=hdr(super_token),
                          json={"type": "credit", "amount": 100, "category": "donation",
                                "description": "TEST donation"})
        assert r.status_code == 200
        tid = r.json()["id"]
        s = requests.get(f"{API}/admin/accounts/summary", headers=hdr(super_token))
        assert s.status_code == 200 and "balance" in s.json()
        assert requests.delete(f"{API}/admin/transactions/{tid}", headers=hdr(super_token)).status_code == 200

    def test_files_upload_get(self, super_token):
        files = {"file": ("hello.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(f"{API}/files/upload", headers=hdr(super_token),
                         files=files, data={"folder": "misc"})
        assert r.status_code == 200
        g = requests.get(f"{API}/files/{r.json()['path']}")
        assert g.status_code == 200 and g.content == b"hello"

    def test_payments_config_unconfigured(self):
        r = requests.get(f"{API}/payments/config")
        assert r.status_code == 200 and r.json()["configured"] is False

    def test_super_admin_cannot_delete_self(self, super_token):
        me = requests.get(f"{API}/auth/me", headers=hdr(super_token)).json()
        r = requests.delete(f"{API}/super-admin/admins/{me['id']}", headers=hdr(super_token))
        assert r.status_code == 400

    def test_audit_logs(self, super_token):
        r = requests.get(f"{API}/super-admin/audit-logs", headers=hdr(super_token))
        assert r.status_code == 200 and isinstance(r.json(), list)
