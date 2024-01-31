from seleniumpagefactory.Pagefactory import PageFactory


class HomePage(PageFactory):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "logoutBtn": ('XPATH', "//button[text()='Logout']"),
        "userBtn": ('CSS', "button[class='btn btn-secondary dropdown-toggle osim-user-profile']"),
    }

    def logout(self):
        self.userBtn.click_button()
        self.logoutBtn.click_button()
