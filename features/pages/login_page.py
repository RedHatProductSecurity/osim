from features.pages.base import BasePage


class LoginPage(BasePage):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "loginBtn": ('XPATH', "//button[contains(text(), 'Login')]")
    }

    def login(self):
        self.loginBtn.click_button()
