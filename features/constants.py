import os


OSIM_URL = os.getenv("OSIM_URL", "https://localhost:5173/")
TIMEOUT = '5'

# The follows are some elements that will be use in the test case.
LOGIN_BUTTON = "button[type='submit']"
USER_BUTTON = "button[class='btn btn-secondary dropdown-toggle osim-user-profile']"
LOGOUT_BUTTON = '//button[text()="Logout"]'
LOAD_MORE_FLAWS_BUTTON = "button[class='btn btn-primary align-self-end']"
FLAW_ROW = "//table[@class='table']/tbody/tr[@style='border-top: 1px solid black;']"
FLAW_CHECKALL = "//table[@class='table']/thead/tr/th/input[@type='checkbox']"
FLAW_CHECKBOX = "input[class='form-check-input']"
FILTER_FLAWS = "input[placeholder='Filter Issues/Flaws']"