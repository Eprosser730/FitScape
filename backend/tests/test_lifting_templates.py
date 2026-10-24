import pytest

URL = "/api/lifting/templates"
PUSH = {
    "title": "Push day",
    "weekdays": [4, 0, 2, 2],
    "exercises": [
        {"name": "Bench press", "sets": 4, "mode": "reps", "rep_min": 6, "rep_max": 10},
        {"name": "Plank", "sets": 3, "mode": "seconds", "seconds": 60},
    ],
}


def test_templates_require_sign_in(client):
    assert client.get(URL).status_code == 401
    assert client.post(URL, json=PUSH).status_code == 401


def test_create_normalises_and_lists(signed_up):
    r = signed_up.post(URL, json=PUSH)
    assert r.status_code == 201
    t = r.json()
    assert t["weekdays"] == [0, 2, 4]  # unique and sorted
    assert t["enabled"] is True
    assert t["exercises"] == [
        {
            "name": "Bench press",
            "sets": 4,
            "mode": "reps",
            "rep_min": 6,
            "rep_max": 10,
            "seconds": None,
        },
        {
            "name": "Plank",
            "sets": 3,
            "mode": "seconds",
            "rep_min": None,
            "rep_max": None,
            "seconds": 60,
        },
    ]
    assert signed_up.get(URL).json() == [t]


def test_mismatched_targets_are_cleared(signed_up):
    body = {
        **PUSH,
        "exercises": [
            {"name": "Squat", "sets": 5, "mode": "reps", "rep_min": 5, "rep_max": 5, "seconds": 30},
            {"name": "Wall sit", "sets": 2, "mode": "seconds", "seconds": 45, "rep_min": 3},
        ],
    }
    ex = signed_up.post(URL, json=body).json()["exercises"]
    assert ex[0]["seconds"] is None
    assert ex[1]["rep_min"] is None


def test_replace_keeps_id_and_swaps_exercises(signed_up):
    tid = signed_up.post(URL, json=PUSH).json()["id"]
    new = {
        **PUSH,
        "title": "Push A",
        "weekdays": [1],
        "enabled": False,
        "exercises": [{"name": "Dips", "sets": 3, "mode": "reps", "rep_min": 8, "rep_max": 12}],
    }
    r = signed_up.put(f"{URL}/{tid}", json=new)
    assert r.status_code == 200
    assert r.json()["id"] == tid
    assert [e["name"] for e in r.json()["exercises"]] == ["Dips"]
    assert signed_up.get(URL).json()[0]["title"] == "Push A"


def test_toggle_enabled(signed_up):
    tid = signed_up.post(URL, json=PUSH).json()["id"]
    assert signed_up.patch(f"{URL}/{tid}", json={"enabled": False}).json()["enabled"] is False
    assert signed_up.get(URL).json()[0]["enabled"] is False


def test_delete_template(signed_up):
    tid = signed_up.post(URL, json=PUSH).json()["id"]
    assert signed_up.delete(f"{URL}/{tid}").status_code == 204
    assert signed_up.get(URL).json() == []
    assert signed_up.delete(f"{URL}/{tid}").status_code == 404


def test_templates_are_private(signed_up, client):
    tid = signed_up.post(URL, json=PUSH).json()["id"]
    signed_up.cookies.clear()
    other = {"username": "other", "first_name": "O", "last_name": "P", "pin": "4826"}
    assert client.post("/api/auth/signup", json=other).status_code == 201
    assert client.get(URL).json() == []
    assert client.put(f"{URL}/{tid}", json=PUSH).status_code == 404
    assert client.patch(f"{URL}/{tid}", json={"enabled": False}).status_code == 404
    assert client.delete(f"{URL}/{tid}").status_code == 404


BAD_EXERCISES = [
    [],
    [{"name": "X", "sets": 3, "mode": "reps", "rep_min": 10, "rep_max": 8}],
    [{"name": "X", "sets": 3, "mode": "reps", "rep_min": 8}],
    [{"name": "X", "sets": 3, "mode": "seconds"}],
    [{"name": "X", "sets": 0, "mode": "seconds", "seconds": 30}],
    [{"name": "X", "sets": 3, "mode": "sprint", "seconds": 30}],
    [{"name": " ", "sets": 3, "mode": "seconds", "seconds": 30}],
]


@pytest.mark.parametrize("exercises", BAD_EXERCISES)
def test_exercise_validation(signed_up, exercises):
    assert signed_up.post(URL, json={**PUSH, "exercises": exercises}).status_code == 422


@pytest.mark.parametrize("override", [{"weekdays": []}, {"weekdays": [7]}, {"title": ""}])
def test_template_validation(signed_up, override):
    assert signed_up.post(URL, json={**PUSH, **override}).status_code == 422
