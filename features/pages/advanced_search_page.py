from seleniumpagefactory.Pagefactory import PageFactory


class AdvancedSearchPage(PageFactory):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "searchBtn": ('XPATH', '//button[contains(text(), "Search")]'),
        "firstFlaw": ("XPATH", "//div[@class='osim-incident-list']/table/tbody/tr[1]")
    }

    def click_search_btn(self):
        self.searchBtn.click_button()

    def first_flaw_exist(self):
        self.firstFlaw.visibility_of_element_located()
