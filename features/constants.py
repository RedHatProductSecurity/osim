import os


OSIDB_URL = os.getenv("OSIDB_URL", "")
OSIM_URL = os.getenv("OSIM_URL", "https://localhost:5173/")
BUGZILLA_API_KEY = os.getenv("BUGZILLA_API_KEY")
JIRA_API_KEY = os.getenv("JIRA_API_KEY")
TIMEOUT = '10'
PUBLIC_FLAW_CVE_ID = os.getenv("PUBLIC_FLAW_CVE_ID")
EMBARGOED_FLAW_CVE_ID = os.getenv("EMBARGOED_FLAW_CVE_ID")
