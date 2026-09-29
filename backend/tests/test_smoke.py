"""冒烟测试：只覆盖顺利路径，用来确认项目可启动、主流程可跑通。

这些用例在带缺陷的初始快照上必须全绿；修复缺陷时不得删除或放宽这里的断言。
"""
import io

import pytest
from fastapi.testclient import TestClient

import main
import email_sender


@pytest.fixture()
def client():
    return TestClient(main.app)


@pytest.fixture()
def offline_smtp(monkeypatch):
    """把 SMTP 换成离线假实现：冒烟测试绝不发起真实网络请求。"""
    sent = {}

    class FakeSMTP:
        def __init__(self, host, port):
            sent["server"] = (host, port)

        def __enter__(self):
            return self

        def __exit__(self, *exc_info):
            return False

        def starttls(self):
            return None

        def login(self, username, password):
            return None

        def sendmail(self, sender, to_email, text):
            sent["to"] = to_email
            sent["text"] = text

    monkeypatch.setattr(email_sender.smtplib, "SMTP", FakeSMTP)
    return sent


def upload_audio(client, filename="meeting.wav"):
    files = {"file": (filename, io.BytesIO(b"RIFF....WAVE"), "audio/wav")}
    resp = client.post("/api/upload-audio", files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["task_id"]
    assert body["status"]
    return body["task_id"]


def test_root_status(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "国家公园" in resp.json()["message"]


def test_cameras(client):
    cameras = client.get("/api/cameras").json()
    assert len(cameras) == 8
    detail = client.get("/api/cameras/cam_001")
    assert detail.status_code == 200
    assert detail.json()["station"] == "主峰保护站"
    assert client.get("/api/cameras/cam_999").status_code == 404


def test_observations(client):
    observations = client.get("/api/observations").json()
    assert len(observations) == 5
    mammals = client.get("/api/observations", params={"category": "哺乳纲"}).json()
    assert len(mammals) == 3


def test_heatmap_and_statistics(client):
    assert len(client.get("/api/heatmap").json()) == 10
    stats = client.get("/api/statistics").json()
    assert stats["total_cameras"] == 8
    assert stats["total_species"] == 5
    assert set(stats["station_statistics"]) == {"主峰保护站", "溪谷保护站", "森林保护站", "高山草甸保护站"}


def test_upload_and_process_audio(client):
    task_id = upload_audio(client)
    processed = client.post(f"/api/process/{task_id}")
    assert processed.status_code == 200
    assert processed.json()["status"] == "completed"

    status = client.get(f"/api/tasks/{task_id}")
    assert status.status_code == 200
    body = status.json()
    assert body["status"] == "completed"
    assert body["progress"] == 100
    assert body["result"]
    assert body["result"]["station_reports"]
    assert body["result"]["full_transcription"]
    assert body["result"]["summary_report"]


def test_unknown_task_is_404(client):
    assert client.get("/api/tasks/not-a-task").status_code == 404
    assert client.post("/api/process/not-a-task").status_code == 404


def test_send_report_happy_path(client, offline_smtp):
    task_id = upload_audio(client)
    client.post(f"/api/process/{task_id}")

    resp = client.post(f"/api/send-report/{task_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
    assert offline_smtp["to"] == main.os.getenv("ADMIN_EMAIL", "admin@park.gov.cn")
