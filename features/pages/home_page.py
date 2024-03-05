from seleniumpagefactory.Pagefactory import PageFactory

from features.page_factory_utils import find_elements_in_page_factory


class HomePage(PageFactory):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "logoutBtn": ('XPATH', "//button[text()='Logout']"),
        "userBtn": ('CSS', "button[class='btn btn-secondary dropdown-toggle osim-user-profile']"),
        "flawList": ("CSS", "div[class='osim-incident-list']"),
        "flawRow": ("CLASS_NAME", "osim-issue-queue-item"),
        "firstFlawLink": ("XPATH", '//tbody[@class="table-group-divider"]/tr[1]/td[2]/a'),
        "flawCheckAllCheckBox": ("XPATH", "//div[@class='osim-incident-list']/table/thead/tr/th/input[@type='checkbox']"),
        "flawCheckBox": ("CSS", "input[class='form-check-input']"),
        "loadMoreFlawsBtn": ("XPATH", "//button[contains(text(), 'Load More Flaws')]"),
        "firstFlaw": ("XPATH", '//tbody[@class="table-group-divider"]/tr[1]'),
        "settingsBtn": ("LINK_TEXT", "Settings"),
        "flawIndexBtn": ("CSS", "ul[class='navbar-nav me-auto align-items-center'] li:nth-child(1) a"),
        "flawFilterBox": ("CSS", "input[placeholder='Filter Issues/Flaws']"),
        "advancedSearchDropDownBtn": ("XPATH", '//form[@role="search"]/div/button[2]'),
        "advancedSearchBtn": ("XPATH", "//a[contains(text(), 'Advanced Search')]")
    }

    def click_advanced_search_drop_down_btn(self):
        self.advancedSearchDropDownBtn.click_button()

    def click_advanced_search_btn(self):
        self.advancedSearchBtn.click_button()

    def click_flaw_index_btn(self):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.flawIndexBtn)
        self.driver.execute_script("arguments[0].click();", self.flawIndexBtn)

    def click_settings_btn(self):
        self.settingsBtn.click_button()

    def click_user_btn(self):
        self.userBtn.click_button()

    def logout(self):
        self.userBtn.click_button()
        self.logoutBtn.click_button()

    def flaw_list_exist(self):
        self.flawList.visibility_of_element_located()

    def click_first_flaw_link(self):
        self.firstFlawLink.click_button()

    def click_flaw_check_all_checkbox(self):
        self.firstFlaw.visibility_of_element_located()
        self.flawCheckAllCheckBox.click_button()

    def check_is_all_flaw_selected(self):
        flaw_rows = find_elements_in_page_factory(self, "flawRow")
        flaw_checkboxes = find_elements_in_page_factory(self, "flawCheckBox")
        assert len(flaw_rows) == len(flaw_checkboxes), 'Incorrect checkbox count'

        flaw_checked = [c for c in flaw_checkboxes if c.get_attribute('checked') == 'true']
        assert len(flaw_checked) == len(flaw_checkboxes), 'Incorrect check-all check result'

    def check_is_all_flaw_unselected(self):
        flaw_checkboxes = find_elements_in_page_factory(self, "flawCheckBox")
        flaw_checked = [c for c in flaw_checkboxes if c.get_attribute('checked') == 'true']
        assert len(flaw_checked) == 0, 'Incorrect check-all uncheck result'

    def check_is_all_flaw_loaded(self):
        self.firstFlaw.visibility_of_element_located()
        self.loadMoreFlawsBtn.visibility_of_element_located()

    def click_load_more_flaws_btn(self):
        old_flaw_count = len(find_elements_in_page_factory(self, "flawRow"))
        self.loadMoreFlawsBtn.execute_script("arguments[0].click();")
        return old_flaw_count

    def is_more_flaw_loaded(self, old_count):
        self.loadMoreFlawsBtn.element_to_be_clickable()
        flaw_count = len(find_elements_in_page_factory(self, "flawRow"))
        assert flaw_count > old_count, \
            "No more flaws loaded after click the 'Load More Flaws' button"

    def input_filter_keyword_and_filter_flaw(self, keywd):
        self.flawFilterBox.visibility_of_element_located()
        self.flawFilterBox.set_text(keywd)

    def get_flaw_list_item_count(self):
        self.flawRow.visibility_of_element_located()
        return len(find_elements_in_page_factory(self, "flawRow"))
