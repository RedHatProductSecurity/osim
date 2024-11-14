import os
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
