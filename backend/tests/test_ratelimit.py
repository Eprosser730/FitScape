from app import ratelimit

LOGIN = "/api/auth/login"
GUEST = {"X-Real-IP": "100.64.0.7"}
OTHER = {"username": "other", "first_name": "O", "last_name": "P", "pin": "4826"}


def _guess(client, username, n, headers=GUEST):
    """n wrong PINs against one account (it locks after 5, and locked replies don't count)."""
    for _ in range(n):
        client.post(LOGIN, json={"username": username, "pin": "1357"}, headers=headers)


def _ten_failures(client):
    # Two accounts × 5 wrong PINs: neither lockout alone would stop a guest moving on to a third.
    assert client.post("/api/auth/signup", json=OTHER).status_code == 201
    client.cookies.clear()
    _guess(client, "ethan", 5)
    _guess(client, "other", 5)


def test_too_many_wrong_pins_from_one_client_are_blocked(client, signed_up):
    signed_up.cookies.clear()
    _ten_failures(client)
    r = client.post(LOGIN, json={"username": "third", "pin": "1357"}, headers=GUEST)
    assert r.status_code == 429
    assert r.json()["code"] == "too_many_attempts"
    assert 0 < r.json()["retry_after"] <= ratelimit.WINDOW_SECONDS + 1
    assert r.headers["Retry-After"] == str(r.json()["retry_after"])
    # Another device is judged on its own record: it gets the normal "unknown user" reply.
    r = client.post(LOGIN, json={"username": "third", "pin": "1357"}, headers={"X-Real-IP": "1.2"})
    assert r.status_code == 404


def test_unknown_usernames_and_successes_do_not_count(client, signed_up):
    signed_up.cookies.clear()
    for _ in range(ratelimit.MAX_FAILURES + 2):
        r = client.post(LOGIN, json={"username": "nobody", "pin": "4826"}, headers=GUEST)
        assert r.status_code == 404
        r = client.post(LOGIN, json={"username": "ethan", "pin": "4826"}, headers=GUEST)
        assert r.status_code == 200


def test_falls_back_to_the_connection_address(client, signed_up):
    signed_up.cookies.clear()
    assert client.post("/api/auth/signup", json=OTHER).status_code == 201
    client.cookies.clear()
    _guess(client, "ethan", 5, headers={})
    _guess(client, "other", 5, headers={})
    assert client.post(LOGIN, json={"username": "x_y_z", "pin": "1357"}).status_code == 429


def test_old_failures_expire(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(ratelimit.time, "monotonic", lambda: now[0])
    for _ in range(ratelimit.MAX_FAILURES):
        ratelimit.record_failure("100.64.0.7")
    assert ratelimit.retry_after("100.64.0.7") is not None
    now[0] += ratelimit.WINDOW_SECONDS + 1
    assert ratelimit.retry_after("100.64.0.7") is None
    assert "100.64.0.7" not in ratelimit._failures  # forgotten, not kept forever
