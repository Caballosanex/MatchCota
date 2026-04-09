import errno
import importlib
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import settings


def test_production_import_does_not_write_local_uploads_on_read_only_filesystem(monkeypatch):
    original_env = settings.environment
    settings.environment = "production"

    def _raise_read_only(_path, *_args, **_kwargs):
        raise OSError(errno.EROFS, "Read-only file system")

    monkeypatch.setattr(os, "makedirs", _raise_read_only)

    try:
        main_module = importlib.import_module("app.main")
        importlib.reload(main_module)
    finally:
        settings.environment = original_env
