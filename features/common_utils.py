import os

from features.constants import FLAW_ID_FILE


def set_flaw_id_to_file():
    with open(FLAW_ID_FILE, "w") as f:
        f.write(os.getenv("FLAW_ID"))


def get_flaw_id():
    flaw_id = os.getenv("FLAW_ID")
    if flaw_id is not None:
        return flaw_id

    with open(FLAW_ID_FILE) as f:
        return f.read().strip()
