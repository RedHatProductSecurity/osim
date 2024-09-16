import os


OSIDB_URL = os.getenv("OSIDB_URL", "")
OSIM_URL = os.getenv("OSIM_URL", "https://localhost:5173/")
SELENIUM_URL = os.getenv("SELENIUM_URL", "http://127.0.0.1:4444")
BUGZILLA_API_KEY = os.getenv("BUGZILLA_API_KEY")
JIRA_API_KEY = os.getenv("JIRA_API_KEY")
AFFECTED_MODULE_BZ = os.getenv("AFFECTED_MODULE_BZ")
AFFECTED_MODULE_JR = os.getenv("AFFECTED_MODULE_JR")
TIMEOUT = "10"
FLAW_ID_FILE = "flaw_id.txt"
CVSS_COMMENT_FLAW_ID = os.getenv("CVSS_COMMENT_FLAW_ID", "CVE-2024-9053")
