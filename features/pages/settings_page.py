from selenium.webdriver.support.relative_locator import locate_with
from selenium.webdriver.common.by import By

from features.pages.base import BasePage


class SettingsPage(BasePage):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "jiraApiKeyText": ("XPATH", "//span[text()='JIRA API Key']"),
        "bugzillaApiKeyText": ("XPATH", "//span[text()='Bugzilla API Key']"),
    }

    def set_api_key(self, type, value):
        key_text = getattr(self, type + 'ApiKeyText')
        key_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "input").below(key_text))[0]

        key_input.clear()
        key_input.send_keys(value)
