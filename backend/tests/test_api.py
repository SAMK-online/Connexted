import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import create_app
from app.providers import prospeo
from app.providers.research import enrich_company, enrich_contact
from app.schemas import CaptureRead, Contact


def make_client(monkeypatch) -> TestClient:
    monkeypatch.setenv("PERSISTENCE_BACKEND", "memory")
    monkeypatch.setenv("MOCK_PROVIDERS", "true")
    get_settings.cache_clear()
    return TestClient(create_app())


def test_capture_workflow_generates_review_ready_report(monkeypatch):
    with make_client(monkeypatch) as client:
        response = client.post(
            "/api/captures",
            json={
                "organization_id": "demo-org",
                "rep_id": "demo-rep",
                "source": "web",
                "prospect_name": "Ada Lovelace",
                "company_name": "Analytical Engines Inc.",
                "raw_text": "Ada Lovelace\nada@example.com\n+1 555 123 4567",
                "notes": "Discussed partnership motion and event follow-up.",
            },
        )

        assert response.status_code == 200
        capture = response.json()

        report_response = client.get(f"/api/reports/{capture['id']}")
        assert report_response.status_code == 200
        report = report_response.json()
        assert report["contact"]["name"] == "Ada Lovelace"
        assert report["contact"]["email"] == "ada@example.com"
        assert report["company"]["name"] == "Analytical Engines Inc."
        assert report["signals"][0]["signal_type"] == "partnerships"
        assert len(report["drafts"]) == 4

        agent_response = client.get(f"/api/reports/{capture['id']}/agent-run")
        assert agent_response.status_code == 200
        assert agent_response.json()["status"] == "review_ready"


@pytest.mark.asyncio
async def test_prospeo_enrichment_maps_company_and_contact(monkeypatch):
    monkeypatch.setenv("MOCK_PROVIDERS", "false")
    monkeypatch.setenv("PROSPEO_API_KEY", "test-key")
    get_settings.cache_clear()

    async def fake_company(settings, data):
        assert settings.prospeo_api_key == "test-key"
        assert data["company_name"] == "Intercom"
        return {
            "error": False,
            "company": {
                "name": "Intercom",
                "website": "https://intercom.com",
                "description_ai": "Intercom is an AI-first customer service platform.",
                "industry": "Software Development",
                "employee_range": "1001-2000",
                "location": {"city": "San Francisco", "state": "California", "country": "US"},
                "technology": {"technology_names": ["6sense", "Contentful"]},
                "job_postings": {
                    "active_count": 2,
                    "active_titles": ["Account Executive", "Product Engineer"],
                },
                "funding": {
                    "total_funding_printed": "$125.0M",
                    "latest_funding_stage": "Series D",
                    "latest_funding_date": "2018-04-27T00:00:00",
                },
            },
        }

    async def fake_person(settings, data, *, only_verified_email, enrich_mobile):
        assert only_verified_email is True
        assert enrich_mobile is False
        assert data["full_name"] == "Eoghan McCabe"
        assert data["company_website"] == "intercom.com"
        return {
            "error": False,
            "person": {
                "full_name": "Eoghan McCabe",
                "current_job_title": "CEO and co-founder",
                "linkedin_url": "https://www.linkedin.com/in/eoghanmccabe",
                "email": {"status": "VERIFIED", "email": "eoghan@example.com"},
                "mobile": {"status": "NOT_FOUND"},
                "location": {"city": "San Francisco", "state": "California", "country": "US"},
            },
            "company": {
                "name": "Intercom",
                "website": "https://intercom.com",
                "industry": "Software Development",
            },
        }

    monkeypatch.setattr(prospeo, "enrich_company", fake_company)
    monkeypatch.setattr(prospeo, "enrich_person", fake_person)

    capture = CaptureRead(
        organization_id="demo-org",
        rep_id="demo-rep",
        source="web",
        prospect_name="Eoghan McCabe",
        company_name="Intercom",
        raw_text="Met at SaaS event.",
    )
    company, company_sources = await enrich_company(capture)
    contact, company_update, contact_sources = await enrich_contact(
        capture,
        Contact(name="Eoghan McCabe"),
        company,
    )

    assert company.name == "Intercom"
    assert company.website == "https://intercom.com"
    assert company.industry == "Software Development"
    assert company.confidence == "high"
    assert company_sources[0].source_type == "prospeo_company"
    assert "Active job postings" in company_sources[0].snippet
    assert contact.email == "eoghan@example.com"
    assert contact.title == "CEO and co-founder"
    assert contact.linkedin_url == "https://www.linkedin.com/in/eoghanmccabe"
    assert company_update.name == "Intercom"
    assert contact_sources[0].source_type == "prospeo_person"


def test_capture_dedupe_uses_external_message_context(monkeypatch):
    with make_client(monkeypatch) as client:
        payload = {
            "organization_id": "demo-org",
            "rep_id": "demo-rep",
            "source": "web",
            "raw_text": "Same card",
            "external_message_id": "SM123",
        }

        first = client.post("/api/captures", json=payload)
        second = client.post("/api/captures", json=payload)

        assert first.status_code == 200
        assert second.status_code == 200
        assert second.json()["was_deduplicated"] is True
        assert first.json()["id"] == second.json()["id"]
        assert len(client.get("/api/captures").json()) == 1


def test_crm_sync_requires_explicit_review_approval(monkeypatch):
    with make_client(monkeypatch) as client:
        capture = client.post(
            "/api/captures",
            json={
                "organization_id": "demo-org",
                "rep_id": "demo-rep",
                "source": "web",
                "prospect_name": "Grace Hopper",
                "company_name": "Compiler Labs",
                "raw_text": "grace@example.com",
            },
        ).json()

        rejected = client.post("/api/crm/hubspot/sync", json={"capture_id": capture["id"]})
        assert rejected.status_code == 400

        approval = client.post(
            "/api/reviews",
            json={
                "capture_id": capture["id"],
                "target_type": "capture",
                "target_id": capture["id"],
                "action": "approve_crm_sync",
                "reviewer_id": "demo-rep",
            },
        )
        assert approval.status_code == 200

        synced = client.post("/api/crm/hubspot/sync", json={"capture_id": capture["id"]})
        assert synced.status_code == 200
        assert synced.json()["status"] == "completed"
        assert synced.json()["hubspot_contact_id"] == "mock-contact"

        job = client.get(f"/api/crm/jobs/{synced.json()['id']}")
        assert job.status_code == 200
        assert job.json()["id"] == synced.json()["id"]


def test_event_discovery_persists_recommendations(monkeypatch):
    with make_client(monkeypatch) as client:
        response = client.post(
            "/api/events/discover",
            json={
                "organization_id": "demo-org",
                "rep_id": "demo-rep",
                "industry": "Cybersecurity",
                "region": "New York",
                "personas": ["Partnerships"],
                "verticals": ["B2B SaaS"],
                "keywords": ["channel"],
                "max_events": 2,
            },
        )

        assert response.status_code == 200
        discovery = response.json()
        assert len(discovery["events"]) == 2
        assert len(discovery["events"][0]["attendees"]) == 2
        assert discovery["events"][0]["drafts"][0]["inferred_claims_used"] is True

        events = client.get("/api/events")
        assert events.status_code == 200
        assert len(events.json()) == 2


def test_admin_settings_update_playbook_and_style_profile(monkeypatch):
    with make_client(monkeypatch) as client:
        playbooks = client.get("/api/admin/playbooks")
        assert playbooks.status_code == 200
        playbook_id = playbooks.json()[0]["id"]

        updated_playbook = client.put(
            f"/api/admin/playbooks/{playbook_id}",
            json={
                "name": "Enterprise events",
                "icp_segments": ["B2B SaaS", "enterprise partnerships"],
                "target_personas": ["VP Sales", "Head of Partnerships"],
                "disqualifiers": ["students"],
                "negative_signals": ["No B2B motion"],
                "value_props": ["Turn booth scans into reviewed follow-up"],
                "products_offered": ["Event conversation intelligence", "HubSpot sync"],
                "target_sectors": ["B2B SaaS", "Cybersecurity"],
                "sector_positioning": [
                    "Cybersecurity -> emphasize trusted source review before outreach.",
                    "B2B SaaS -> emphasize speed from event lead to meeting-ready follow-up.",
                ],
                "priority_signals": ["event sponsorship", "partner hiring"],
                "trusted_sources": ["Company website", "Event speaker pages"],
                "research_resources": [
                    "https://example.com/customers",
                    "Company partner directory",
                ],
                "research_instructions": "Prioritize partner pages and public event speaker pages.",
                "competitors": ["Manual CRM workflows"],
                "proof_points": ["Reduced event follow-up time by 50%"],
                "personalization_rules": ["Reference event context first"],
                "research_freshness_days": 120,
            },
        )
        assert updated_playbook.status_code == 200
        assert updated_playbook.json()["name"] == "Enterprise events"
        assert updated_playbook.json()["icp_segments"] == [
            "B2B SaaS",
            "enterprise partnerships",
        ]
        assert updated_playbook.json()["target_personas"] == [
            "VP Sales",
            "Head of Partnerships",
        ]
        assert updated_playbook.json()["products_offered"] == [
            "Event conversation intelligence",
            "HubSpot sync",
        ]
        assert updated_playbook.json()["target_sectors"] == ["B2B SaaS", "Cybersecurity"]
        assert updated_playbook.json()["sector_positioning"] == [
            "Cybersecurity -> emphasize trusted source review before outreach.",
            "B2B SaaS -> emphasize speed from event lead to meeting-ready follow-up.",
        ]
        assert updated_playbook.json()["research_resources"] == [
            "https://example.com/customers",
            "Company partner directory",
        ]
        assert (
            updated_playbook.json()["research_instructions"]
            == "Prioritize partner pages and public event speaker pages."
        )
        assert updated_playbook.json()["priority_signals"] == [
            "event sponsorship",
            "partner hiring",
        ]
        assert updated_playbook.json()["trusted_sources"] == [
            "Company website",
            "Event speaker pages",
        ]
        assert updated_playbook.json()["research_freshness_days"] == 120

        profiles = client.get("/api/admin/style-profiles")
        assert profiles.status_code == 200
        profile_id = profiles.json()[0]["id"]

        updated_profile = client.put(
            f"/api/admin/style-profiles/{profile_id}",
            json={
                "name": "Operator brief",
                "tone": "plainspoken and specific",
                "banned_phrases": ["circling back"],
                "cta_style": "one clear meeting ask",
            },
        )
        assert updated_profile.status_code == 200
        assert updated_profile.json()["tone"] == "plainspoken and specific"
        assert updated_profile.json()["banned_phrases"] == ["circling back"]
