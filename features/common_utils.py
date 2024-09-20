import os
import random

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


def generate_cvss3_vector_string():
    vector = (f"CVSS:3.1/AV:{random.choice(['N', 'A', 'L', 'P'])}/"
              f"AC:{random.choice(['L', 'H'])}/PR:{random.choice(['N', 'L', 'H'])}/"
              f"UI:{random.choice(['N', 'R'])}/S:{random.choice(['C', 'U'])}/"
              f"C:{random.choice(['H', 'L', 'N'])}/I:{random.choice(['H', 'L', 'N'])}/"
              f"A:{random.choice(['H', 'L', 'N'])}")

    return vector
