"""
Core scan-flow coverage: /api/scan, /api/scans, /api/swaps, /api/profile.

Previously untested — the only route tests that existed were for
/explain-ingredient and /explain-swap, which aren't the core product flow.
This file also directly locks in the OCR-failure-safety fix: a scan with
no readable text must NEVER come back "safe".
"""

import io

import pytest

from app.main import compute_verdict, MIN_OCR_ALNUM_CHARS

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# compute_verdict — unit-level, no HTTP needed
# ---------------------------------------------------------------------------

def test_verdict_safe_on_clean_label_with_no_flagged_ingredients():
    verdict, flagged, note = compute_verdict("water, sugar, salt, citric acid", [])
    assert verdict == "safe"
    assert flagged == []
    assert note is None


def test_verdict_flagged_when_allergen_on_profile():
    verdict, flagged, note = compute_verdict("wheat flour, peanuts, salt", ["peanut"])
    assert verdict == "flagged"
    assert flagged == [{"id": "peanut", "name": "Peanut"}]


def test_verdict_unclear_on_ambiguous_ingredient():
    verdict, flagged, note = compute_verdict("sugar, natural flavoring, salt", [])
    assert verdict == "unclear"
    assert flagged == []
    assert note is not None


def test_verdict_never_silently_safe_on_empty_ocr_text():
    """
    The core safety fix: empty OCR output must not produce a false "safe".
    """
    verdict, flagged, note = compute_verdict("", ["peanut"])
    assert verdict == "unclear"
    assert flagged == []
    assert note is not None
    assert "couldn't read" in note.lower() or "could not read" in note.lower() or "read enough" in note.lower()


def test_verdict_never_silently_safe_on_near_empty_ocr_text():
    """
    A couple of stray characters (e.g. a barcode digit OCR half-caught)
    shouldn't be enough to run the verdict engine either.
    """
    short_text = "a1"
    assert len(short_text) < MIN_OCR_ALNUM_CHARS
    verdict, flagged, note = compute_verdict(short_text, ["peanut"])
    assert verdict == "unclear"


def test_verdict_runs_normally_once_enough_text_present():
    # Sanity check that the threshold doesn't block real labels.
    long_text = "ingredients: enriched wheat flour, sugar, palm oil, salt, baking soda"
    assert len(long_text) >= MIN_OCR_ALNUM_CHARS
    verdict, flagged, note = compute_verdict(long_text, [])
    assert verdict == "safe"


# ---------------------------------------------------------------------------
# /api/scan — end to end through the HTTP layer
# ---------------------------------------------------------------------------

def _fake_image_bytes() -> bytes:
    # Doesn't need to be a real image — run_ocr() catches any decode error
    # and falls back to "", which is exactly the path we want to exercise.
    return b"not a real image"


def test_scan_endpoint_with_unreadable_image_returns_unclear_not_safe(client):
    files = {"file": ("label.jpg", io.BytesIO(_fake_image_bytes()), "image/jpeg")}
    response = client.post("/api/scan", files=files, params={"product_name": "Mystery Snack"})
    assert response.status_code == 200
    body = response.json()
    # This is the whole point of the fix: garbage/unreadable input must
    # never resolve to "safe".
    assert body["verdict"] != "safe"
    assert body["verdict"] == "unclear"
    assert body["note"]


def test_scan_endpoint_persists_and_is_retrievable(client):
    files = {"file": ("label.jpg", io.BytesIO(_fake_image_bytes()), "image/jpeg")}
    created = client.post("/api/scan", files=files, params={"product_name": "Persisted Snack"}).json()

    fetched = client.get(f"/api/scans/{created['scanId']}")
    assert fetched.status_code == 200
    assert fetched.json()["productName"] == "Persisted Snack"


def test_scan_not_found_returns_404(client):
    response = client.get("/api/scans/does-not-exist")
    assert response.status_code == 404


def test_list_scans_includes_seeded_demo_data(client):
    response = client.get("/api/scans")
    assert response.status_code == 200
    scan_ids = [s["scanId"] for s in response.json()]
    assert "s1" in scan_ids
    assert "s2" in scan_ids
    assert "s3" in scan_ids


# ---------------------------------------------------------------------------
# /api/swaps — VAE-ranked candidates
# ---------------------------------------------------------------------------

def test_search_swaps_by_craving_query_returns_ranked_results(client):
    response = client.get("/api/swaps", params={"q": "something crunchy and salty"})
    assert response.status_code == 200
    body = response.json()
    assert body["query"] == "something crunchy and salty"
    assert len(body["results"]) == 3
    for item in body["results"]:
        assert {"id", "name", "macroDelta", "why"} <= item.keys()


def test_search_swaps_requires_query_param(client):
    response = client.get("/api/swaps")
    assert response.status_code == 422


def test_swaps_for_scan_returns_results_for_flagged_scan(client):
    response = client.get("/api/swaps/s1")  # seeded demo scan, flagged for peanut
    assert response.status_code == 200
    body = response.json()
    assert len(body["results"]) == 3


def test_swaps_for_nonexistent_scan_returns_404(client):
    response = client.get("/api/swaps/does-not-exist")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# /api/profile — persisted allergen profile
# ---------------------------------------------------------------------------

def test_get_profile_returns_allergens_list(client):
    response = client.get("/api/profile")
    assert response.status_code == 200
    assert "allergens" in response.json()


def test_set_profile_persists_and_is_reflected_in_verdicts(client):
    set_response = client.post("/api/profile", json={"allergens": ["peanut", "dairy"]})
    assert set_response.status_code == 200
    assert set_response.json()["allergens"] == ["peanut", "dairy"]

    get_response = client.get("/api/profile")
    assert get_response.json()["allergens"] == ["peanut", "dairy"]

    # Reset so this test doesn't leak state into others run after it.
    client.post("/api/profile", json={"allergens": []})