import pytest

NOTE = {
    "read_on": "2026-10-24",
    "passage": "John 3:1-21",
    "summary": "Nicodemus visits Jesus at night.",
}
URL = "/api/prayer/notes"


def test_notes_require_sign_in(client):
    assert client.get(URL).status_code == 401
    assert client.post(URL, json=NOTE).status_code == 401
    assert client.delete(f"{URL}/1").status_code == 401


def test_add_and_list_newest_first(signed_up):
    r = signed_up.post(URL, json=NOTE)
    assert r.status_code == 201
    assert r.json() == {**NOTE, "id": r.json()["id"]}
    signed_up.post(URL, json={**NOTE, "read_on": "2026-10-20", "passage": "Psalm 23"})
    signed_up.post(URL, json={**NOTE, "read_on": "2026-10-25", "passage": "Romans 8"})
    assert [n["passage"] for n in signed_up.get(URL).json()] == [
        "Romans 8",
        "John 3:1-21",
        "Psalm 23",
    ]


def test_text_is_trimmed(signed_up):
    r = signed_up.post(
        URL, json={**NOTE, "passage": "  Psalm 23  ", "summary": "  The Lord is my shepherd.\n"}
    )
    assert r.json()["passage"] == "Psalm 23"
    assert r.json()["summary"] == "The Lord is my shepherd."


def test_delete_own_note(signed_up):
    note_id = signed_up.post(URL, json=NOTE).json()["id"]
    assert signed_up.delete(f"{URL}/{note_id}").status_code == 204
    assert signed_up.get(URL).json() == []
    assert signed_up.delete(f"{URL}/{note_id}").status_code == 404


def test_notes_are_private(signed_up, client):
    note_id = signed_up.post(URL, json=NOTE).json()["id"]
    signed_up.cookies.clear()
    other = {"username": "other", "first_name": "O", "last_name": "P", "pin": "4826"}
    assert client.post("/api/auth/signup", json=other).status_code == 201
    assert client.get(URL).json() == []
    assert client.delete(f"{URL}/{note_id}").status_code == 404  # cannot delete it either


@pytest.mark.parametrize(
    "override",
    [
        {"passage": "   "},
        {"summary": ""},
        {"passage": "x" * 121},
        {"summary": "x" * 10_001},
        {"read_on": "not-a-date"},
    ],
)
def test_note_validation(signed_up, override):
    assert signed_up.post(URL, json={**NOTE, **override}).status_code == 422
