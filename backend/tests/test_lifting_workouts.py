import pytest

TEMPLATES = "/api/lifting/templates"
URL = "/api/lifting/workouts"
PUSH = {
    "title": "Push day",
    "weekdays": [0],
    "exercises": [{"name": "Bench press", "sets": 2, "mode": "reps", "rep_min": 6, "rep_max": 10}],
}
WORKOUT = {
    "title": "Push day",
    "performed_on": "2026-10-24",
    "notes": "  Felt strong.  ",
    "exercises": [
        {
            "name": "Bench press",
            "mode": "reps",
            "rep_min": 6,
            "rep_max": 10,
            "sets": [{"reps": 10, "weight_lb": 135}, {"reps": 8, "weight_lb": 145.5}],
        },
        {
            "name": "Plank",
            "mode": "seconds",
            "target_seconds": 60,
            "sets": [{"seconds": 62}, {"seconds": 55, "weight_lb": 25}],
        },
    ],
}


def test_workouts_require_sign_in(client):
    assert client.get(URL).status_code == 401
    assert client.post(URL, json=WORKOUT).status_code == 401


def test_log_and_read_back(signed_up):
    tid = signed_up.post(TEMPLATES, json=PUSH).json()["id"]
    r = signed_up.post(URL, json={**WORKOUT, "template_id": tid})
    assert r.status_code == 201
    w = r.json()
    assert w["template_id"] == tid
    assert w["notes"] == "Felt strong."
    bench, plank = w["exercises"]
    assert [(s["reps"], s["weight_lb"]) for s in bench["sets"]] == [(10, "135.0"), (8, "145.5")]
    assert [(s["seconds"], s["weight_lb"]) for s in plank["sets"]] == [(62, None), (55, "25.0")]
    assert signed_up.get(URL).json() == [w]


def test_archive_is_newest_first(signed_up):
    for day, title in [("2026-10-20", "A"), ("2026-10-24", "C"), ("2026-10-22", "B")]:
        signed_up.post(URL, json={**WORKOUT, "performed_on": day, "title": title})
    assert [w["title"] for w in signed_up.get(URL).json()] == ["C", "B", "A"]


def test_history_survives_template_changes(signed_up):
    tid = signed_up.post(TEMPLATES, json=PUSH).json()["id"]
    signed_up.post(URL, json={**WORKOUT, "template_id": tid})
    signed_up.delete(f"{TEMPLATES}/{tid}")
    (w,) = signed_up.get(URL).json()
    assert w["template_id"] is None  # link cleared...
    assert w["exercises"][0]["name"] == "Bench press"  # ...but the workout is untouched


def test_delete_workout(signed_up):
    wid = signed_up.post(URL, json=WORKOUT).json()["id"]
    assert signed_up.delete(f"{URL}/{wid}").status_code == 204
    assert signed_up.get(URL).json() == []
    assert signed_up.delete(f"{URL}/{wid}").status_code == 404


def test_workouts_and_templates_are_private(signed_up, client):
    tid = signed_up.post(TEMPLATES, json=PUSH).json()["id"]
    wid = signed_up.post(URL, json=WORKOUT).json()["id"]
    signed_up.cookies.clear()
    other = {"username": "other", "first_name": "O", "last_name": "P", "pin": "4826"}
    assert client.post("/api/auth/signup", json=other).status_code == 201
    assert client.get(URL).json() == []
    assert client.delete(f"{URL}/{wid}").status_code == 404
    # Cannot attach a workout to someone else's template either.
    assert client.post(URL, json={**WORKOUT, "template_id": tid}).status_code == 404


def _with_sets(mode, sets):
    return {**WORKOUT, "exercises": [{"name": "X", "mode": mode, "sets": sets}]}


@pytest.mark.parametrize(
    "body",
    [
        {**WORKOUT, "exercises": []},
        _with_sets("reps", []),
        _with_sets("reps", [{"weight_lb": 100}]),  # reps missing
        _with_sets("seconds", [{"reps": 5}]),  # seconds missing
        _with_sets("reps", [{"reps": 5, "weight_lb": -5}]),
        _with_sets("reps", [{"reps": 5, "weight_lb": 100.25}]),
        {**WORKOUT, "title": " "},
        {**WORKOUT, "performed_on": "yesterday"},
    ],
)
def test_workout_validation(signed_up, body):
    assert signed_up.post(URL, json=body).status_code == 422
