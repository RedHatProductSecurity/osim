from seleniumpagefactory.Pagefactory import PageFactory
from selenium.webdriver.support.relative_locator import locate_with
from selenium.webdriver.common.by import By


class SettingsPage(PageFactory):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "jiraApiKeyText": ("XPATH", "//span[text()='JIRA API Key']"),
        "bugzillaApiKeyText": ("XPATH", "//span[text()='Bugzilla API Key']"),
        "saveBtn": ("XPATH", "//button[text()='Save' and @type='submit']")
    }

    def set_jira_api_key(self, value):
        key_text = self.jiraApiKeyText
        key_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "input").below(key_text))[0]

        key_input.clear()
        key_input.send_keys(value)

    def set_bugzilla_api_key(self, value):
        key_text = self.bugzillaApiKeyText
        key_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "input").below(key_text))[0]

        key_input.clear()
        key_input.send_keys(value)

    def click_save_btn(self):
        self.saveBtn.execute_script("arguments[0].click();")
