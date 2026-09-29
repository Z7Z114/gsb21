import os
import sys
import tempfile
import pathlib

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# 每次测试会话使用独立的上传目录，避免把音频落盘到工作区里。
_TMP = tempfile.mkdtemp(prefix="biodiversity-tests-")
os.environ["NP_UPLOAD_DIR"] = os.path.join(_TMP, "uploads")
os.makedirs(os.environ["NP_UPLOAD_DIR"], exist_ok=True)
