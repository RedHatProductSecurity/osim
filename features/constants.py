import os


OSIDB_URL = os.getenv("OSIDB_URL", "")
OSIM_URL = os.getenv("OSIM_URL", "https://localhost:5173/")
SELENIUM_URL = os.getenv("SELENIUM_URL", "http://127.0.0.1:4444")
BUGZILLA_API_KEY = os.getenv("BUGZILLA_API_KEY")
JIRA_API_KEY = os.getenv("JIRA_API_KEY")
TIMEOUT = '10'
