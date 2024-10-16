import os
import random
import json

from features.constants import TMP_DATA_FILE_NAME


def write_data_to_tmp_data_file(key, value):
    try:
        with open(TMP_DATA_FILE_NAME, "r") as f:
            content = json.load(f)
    except FileNotFoundError:
        content = {}

    content[key] = value
    with open(TMP_DATA_FILE_NAME, "w") as f:
        json.dump(content, f)


def get_data_from_tmp_data_file(key):
    value = os.getenv(key)
    if value is not None:
        return value

    with open(TMP_DATA_FILE_NAME, "r") as f:
        content = json.load(f)
        return content[key]


def generate_cvss3_vector_string():
    vector = (f"CVSS:3.1/AV:{random.choice(['N', 'A', 'L', 'P'])}/"
              f"AC:{random.choice(['L', 'H'])}/PR:{random.choice(['N', 'L', 'H'])}/"
              f"UI:{random.choice(['N', 'R'])}/S:{random.choice(['C', 'U'])}/"
              f"C:{random.choice(['H', 'L', 'N'])}/I:{random.choice(['H', 'L', 'N'])}/"
              f"A:{random.choice(['H', 'L', 'N'])}")

    return vector
