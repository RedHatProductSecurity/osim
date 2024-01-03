import os


OSIM_URL = os.getenv("OSIM_URL", "https://localhost:5173/")
TIMEOUT = '5'

# The follows are some elements that will be use in the test case.
LOGIN_BUTTON = "button[type='submit']"
USER_BUTTON = "button[class='btn btn-secondary dropdown-toggle osim-user-profile']"
LOGOUT_BUTTON = '//button[text()="Logout"]'
LOAD_MORE_FLAWS_BUTTON = "button[class='btn btn-primary align-self-end']"
GET_FLAWS_COUNT_XPATH = "//table[@class='table']/tbody/tr[@style='border-top: 1px solid black;']"
