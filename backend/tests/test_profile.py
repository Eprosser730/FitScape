import pytest

from app.profile import bmi, bmi_category

PROFILE = {"gender": "male", "age": 22, "height_ft": 5, "height_in": 11, "weight_lb": 180.5}


@pytest.mark.parametrize(
    ("lb", "inches", "expected"),
    [(180.5, 71, 25.2), (120, 64, 20.6), (250, 70, 35.9)],
)
def test_bmi_formula(lb, inches, expected):
    assert bmi(lb, inches) == expected


@pytest.mark.parametrize(
    ("value", "category"),
    [
        (18.4, "Underweight"),
        (18.5, "Healthy weight"),
        (24.9, "Healthy weight"),
        (25.0, "Overweight"),
        (29.9, "Overweight"),
        (30.0, "Obesity"),
    ],
)
def test_bmi_category_boundaries(value, category):
    assert bmi_category(value) == category


def test_profile_requires_sign_in(client):
    assert client.get("/api/profile").status_code == 401
    assert client.put("/api/profile", json=PROFILE).status_code == 401


def test_no_profile_yet(signed_up):
    r = signed_up.get("/api/profile")
    assert r.status_code == 404
    assert r.json() == {"code": "no_profile"}


def test_save_and_read_back_with_bmi(signed_up):
    r = signed_up.put("/api/profile", json=PROFILE)
    assert r.status_code == 200
    expected = {**PROFILE, "weight_lb": "180.5", "bmi": 25.2, "bmi_category": "Overweight"}
    assert r.json() == expected
    assert signed_up.get("/api/profile").json() == expected


def test_update_replaces_values(signed_up):
    signed_up.put("/api/profile", json=PROFILE)
    r = signed_up.put("/api/profile", json={**PROFILE, "weight_lb": 170, "height_in": 0})
    assert r.json()["height_ft"] == 5 and r.json()["height_in"] == 0
    assert r.json()["bmi"] == bmi(170, 60)


def test_profiles_are_per_user(signed_up, client):
    signed_up.put("/api/profile", json=PROFILE)
    signed_up.cookies.clear()
    other = {"username": "other", "first_name": "O", "last_name": "P", "pin": "4826"}
    assert client.post("/api/auth/signup", json=other).status_code == 201
    assert client.get("/api/profile").status_code == 404  # never sees the first user's data


@pytest.mark.parametrize(
    "override",
    [
        {"gender": "robot"},
        {"age": 12},
        {"age": 121},
        {"height_ft": 9},
        {"height_in": 12},
        {"weight_lb": 49},
        {"weight_lb": 180.25},
    ],
)
def test_profile_validation(signed_up, override):
    assert signed_up.put("/api/profile", json={**PROFILE, **override}).status_code == 422
