# Locators by css selector
FLAW_CHECKBOX = "input[class='form-check-input']"
FLAW_FILTER = "input[placeholder='Filter Issues/Flaws']"
FLAW_LIST = "div[class='osim-incident-list']"
USER_BUTTON = "button[class='btn btn-secondary dropdown-toggle osim-user-profile']"
FLAW_INDEX = "ul[class='navbar-nav me-auto align-items-center'] li:nth-child(1) a"

# Locators by xpath
COMMENT_BUTTON = "//button[contains(text(), 'Comment')]"
FLAW_CHECKALL = "//div[@class='osim-incident-list']/table/thead/tr/th/input[@type='checkbox']"
FLAW_ROW = "//div[@class='osim-incident-list']/table/tbody/tr[@style='border-top: 1px solid black;']"
LOAD_MORE_FLAWS_BUTTON = "//button[contains(text(), 'Load More Flaws')]"
BUGZILLA_API_KEY_TEXT_ELEMENT = "//span[text()='Bugzilla API Key']"
JIRA_API_KEY_TEXT_ELEMENT = "//span[text()='JIRA API Key']"
