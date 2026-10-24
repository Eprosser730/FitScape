import pytest

RUN = {
    "ran_on": "2026-10-24",
    "distance_mi": "3.10",
    "notes": "Easy intervals.",
    "segments": [
        {"kind": "run", "seconds": 120},
        {"kind": "walk", "seconds": 120},
        {"kind": "run", "seconds": 120},
    ],
}
URL = "/api/running/runs"


def test_runs_require_sign_in(client):
    assert client.get(URL).status_code == 401
    assert client.post(URL, json=RUN).status_code == 401
    assert client.delete(f"{URL}/1").status_code == 401


def test_log_and_list_newest_first(signed_up):
    r = signed_up.post(URL, json=RUN)
    assert r.status_code == 201
    assert r.json() == {**RUN, "id": r.json()["id"]}  # segments come back in order
    signed_up.post(URL, json={**RUN, "ran_on": "2026-10-20", "distance_mi": 5})
    signed_up.post(URL, json={**RUN, "ran_on": "2026-10-25", "distance_mi": 1.5})
    runs = signed_up.get(URL).json()
    assert [(x["ran_on"], x["distance_mi"]) for x in runs] == [
        ("2026-10-25", "1.50"),
        ("2026-10-24", "3.10"),
        ("2026-10-20", "5.00"),
    ]


def test_segments_and_notes_are_optional(signed_up):
    r = signed_up.post(URL, json={"ran_on": "2026-10-24", "distance_mi": 2, "notes": "  "})
    assert r.status_code == 201
    assert r.json()["segments"] == []
    assert r.json()["notes"] is None


def test_delete_own_run(signed_up):
    run_id = signed_up.post(URL, json=RUN).json()["id"]
    assert signed_up.delete(f"{URL}/{run_id}").status_code == 204
    assert signed_up.get(URL).json() == []
    assert signed_up.delete(f"{URL}/{run_id}").status_code == 404


def test_runs_are_private(signed_up, client):
    run_id = signed_up.post(URL, json=RUN).json()["id"]
    signed_up.cookies.clear()
    other = {"username": "other", "first_name": "O", "last_name": "P", "pin": "4826"}
    assert client.post("/api/auth/signup", json=other).status_code == 201
    assert client.get(URL).json() == []
    assert client.delete(f"{URL}/{run_id}").status_code == 404  # cannot delete it either


@pytest.mark.parametrize(
    "override",
    [
        {"distance_mi": 0},
        {"distance_mi": 201},
        {"distance_mi": "3.105"},
        {"segments": [{"kind": "swim", "seconds": 60}]},
        {"segments": [{"kind": "run", "seconds": 0}]},
        {"segments": [{"kind": "run", "seconds": 60}] * 51},
        {"notes": "x" * 2001},
    ],
)
def test_rejects_bad_runs(signed_up, override):
    assert signed_up.post(URL, json={**RUN, **override}).status_code == 422
