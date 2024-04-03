from seleniumpagefactory.Pagefactory import PageFactory
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.relative_locator import locate_with

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
        # "cveId": ("CLASS_NAME", "osim-issue-title"),
        "flawCheckAllCheckBox": ("XPATH", "//div[@class='osim-incident-list']/table/thead/tr/th/input[@type='checkbox']"),
        "flawCheckBox": ("CSS", "input[class='form-check-input']"),
        "loadMoreFlawsBtn": ("XPATH", "//button[contains(text(), 'Load More Flaws')]"),
        "firstFlaw": ("XPATH", '//tbody[@class="table-group-divider"]/tr[1]'),
        "firstFlawLink": ("XPATH", '//tbody[@class="table-group-divider"]/tr[1]/td[2]/a'),
        "settingsBtn": ("LINK_TEXT", "Settings"),
        "flawIndexBtn": ("CSS", "ul[class='navbar-nav me-auto align-items-center'] li:nth-child(1) a"),
        "flawFilterBox": ("CSS", "input[placeholder='Filter Issues/Flaws']"),
        "advancedSearchDropDownBtn": ("XPATH", '//form[@role="search"]/div/button[2]'),
        "advancedSearchBtn": ("XPATH", "//a[contains(text(), 'Advanced Search')]"),
        "cve_idText": ("XPATH", "//tr[3]/td[2]/a"),
        "quickSearchBox": ("XPATH", "//form[@role='search']/div/input"),
        "quickSearchBtn": ("XPATH", "//form[@role='search']/div/button"),
        "myissueCheckBox": ("XPATH", "//input[@class='d-inline-block form-check-input']"),
        "ownerText":  ("XPATH", "//tr[1]/td[8]"),
        "bulkActionBtn": ("XPATH", "//button[contains(text(), 'Bulk Action')]"),
        "assignToMeBtn": ("XPATH", "//a[contains(text(), 'Assign to Me')]"),
        "flawSavedMsg": ("XPATH", "//div[text()='Flaw saved']")
    }

    def click_flaw_index_btn(self):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.flawIndexBtn)
        self.driver.execute_script("arguments[0].click();", self.flawIndexBtn)

    def logout(self):
        self.userBtn.click_button()
        self.logoutBtn.click_button()

    def flaw_list_exist(self):
        self.flawList.visibility_of_element_located()

    def click_flaw_check_all_checkbox(self):
        self.firstFlaw.visibility_of_element_located()
        self.flawCheckAllCheckBox.click_button()

    def check_is_all_flaw_selected(self):
        flaw_rows = find_elements_in_page_factory(self, "flawRow")
        flaw_checkboxes = find_elements_in_page_factory(self, "flawCheckBox")
        assert len(flaw_rows) + 1 == len(flaw_checkboxes), 'Incorrect checkbox count'
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

    def get_field_value(self, field):
        field_value = getattr(self, field + 'Text')
        return  field_value.get_text()

    def set_value(self, field, value):
        field_input = getattr(self, field + 'Box')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_input)
        field_input.set_text(value)

    def click_btn(self, btn_element):
        element = getattr(self, btn_element)
        element.click_button()

    def clear_box(self, field):
        field_input = getattr(self, field + 'Box')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_input)
        field_input.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)

    def wait_msg(self, msg_element):
        element = getattr(self, msg_element)
        element.visibility_of_element_located()

    def select_bulk_flaws(self, length=1):
        self.firstFlaw.visibility_of_element_located()
        flaw_checkboxes = find_elements_in_page_factory(self, "flawCheckBox")
        links = []
        for i in range(1, length+1):
            checkbox = flaw_checkboxes[i]
            checkbox.click()
            flaw_link = self.driver.find_element(
                    By.XPATH, f"(//td[contains(@class, 'osim-issue-title')])[{i}]/a")
            links.append(flaw_link)
        return links

    def bulk_assign(self):
        self.click_btn('bulkActionBtn')
        hide = self.driver.find_elements(
            locate_with(By.XPATH, "//div[@class='osim-incident-list']/table/thead"))[0]
        self.driver.execute_script("arguments[0].style.visibility='hidden'", hide)
        self.click_btn('assignToMeBtn')
        self.driver.execute_script("arguments[0].style.visibility='visible'", hide)

    def check_bulk_assign(self, flaw_link):
        from features.utils import wait_for_visibility_by_locator
        flaw_link.click()
        wait_for_visibility_by_locator(self.driver, By.XPATH, '//button[text()=" Save Changes "]')
        assignee_value_element = self.driver.find_elements(
             locate_with(By.XPATH, ("(//span[@class='osim-editable-text-value form-control'])[6]")))[0]
        login_user = self.userBtn.get_text()
        assert assignee_value_element.get_text() == login_user.strip(), 'Bulk assign failed'