import random
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.relative_locator import locate_with

from features.page_factory_utils import find_elements_in_page_factory
from features.pages.base import BasePage


class HomePage(BasePage):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "logoutBtn": ('XPATH', "//button[contains(text(), 'Logout')]"),
        "userBtn": ('CSS', "button[class='btn btn-secondary dropdown-toggle osim-user-profile']"),
        "flawList": ("CSS", "div[class='osim-incident-list']"),
        "flawRow": ("CLASS_NAME", "osim-issue-queue-item"),
        # "cveId": ("CLASS_NAME", "osim-issue-title"),
        "flawCheckAllCheckBox": ("XPATH", "//div[@class='osim-incident-list']/table/thead/tr/th/input[@type='checkbox']"),
        "flawCheckBox": ("CSS", "input[class='form-check-input']"),
        "loadMoreFlawsBtn": ("XPATH", "//button[contains(text(), 'Load More Flaws')]"),
        "firstFlaw": ("XPATH", "//div[@class='osim-incident-list']/table/tbody/tr[1]"),
        "firstFlawLink": ("XPATH", '//tbody[@class="table-group-divider"]/tr[1]/td[1]/a'),
        "settingsBtn": ("LINK_TEXT", "Settings"),
        "flawIndexBtn": ("CSS", "ul[class='navbar-nav me-auto align-items-center'] li:nth-child(1) a"),
        "flawFilterBox": ("CSS", "input[placeholder='Filter Issues/Flaws']"),
        "advancedSearchDropDownBtn": ("XPATH", '//form[@role="search"]/div/button[2]'),
        "advancedSearchBtn": ("XPATH", "//a[contains(text(), 'Advanced Search')]"),
        "cve_idText": ("XPATH", "//tr[3]/td[1]/a"),
        "quickSearchBox": ("XPATH", "//form[@role='search']/div/input"),
        "quickSearchBtn": ("XPATH", "//form[@role='search']/div/button"),
        "myIssuesCheckbox": ("XPATH", "(//input[@class='d-inline-block form-check-input'])[1]"),
        "openIssuesCheckbox": ("XPATH", "(//input[@class='d-inline-block form-check-input'])[2]"),
        "defaultFilterCheckbox": ("XPATH", "(//input[@class='d-inline-block form-check-input'])[3]"),
        "ownerText":  ("XPATH", "//tr[1]/td[6]"),
        # "bulkActionBtn": ("XPATH", "//button[contains(text(), 'Bulk Action')]"),  # TODO remove unused
        # "assignToMeBtn": ("XPATH", "//a[contains(text(), 'Assign to Me')]"),  # TODO remove unused
        "flawSavedMsg": ("XPATH", "//div[text()='Flaw saved']"),
        "idBtn": ("XPATH", "//thead[@class='sticky-top']/tr/th[contains(text(), 'ID')]"),
        "impactBtn": ("XPATH", "//thead[@class='sticky-top']/tr/th[contains(text(), 'Impact')]"),
        "sourceBtn": ("XPATH", "//thead[@class='sticky-top']/tr/th[contains(text(), 'Source')]"),
        "createdBtn": ("XPATH", "//thead[@class='sticky-top']/tr/th[contains(text(), 'Created')]"),
        "titleBtn": ("XPATH", "//thead[@class='sticky-top']/tr/th[contains(text(), 'Title')]"),
        "stateBtn": ("XPATH", "//thead[@class='sticky-top']/tr/th[contains(text(), 'State')]"),
        "ownerBtn": ("XPATH", "//thead[@class='sticky-top']/tr/th[contains(text(), 'Owner')]")
    }

    def logout(self):
        self.userBtn.click_button()
        self.logoutBtn.click_button()

    def flaw_list_exist(self):
        self.flawList.visibility_of_element_located()

    def first_flaw_exist(self):
        self.firstFlaw.visibility_of_element_located()

#     def click_flaw_check_all_checkbox(self):
#         self.firstFlaw.visibility_of_element_located()
#         self.flawCheckAllCheckBox.click_button()
#
#     def check_is_all_flaw_selected(self):
#         flaw_rows = find_elements_in_page_factory(self, "flawRow")
#         flaw_checkboxes = find_elements_in_page_factory(self, "flawCheckBox")
#         assert len(flaw_rows) + 1 == len(flaw_checkboxes), 'Incorrect checkbox count'
#         flaw_checked = [c for c in flaw_checkboxes if c.get_attribute('checked') == 'true']
#         assert len(flaw_checked) == len(flaw_checkboxes), 'Incorrect check-all check result'
#
#     def check_is_all_flaw_unselected(self):
#         flaw_checkboxes = find_elements_in_page_factory(self, "flawCheckBox")
#         flaw_checked = [c for c in flaw_checkboxes if c.get_attribute('checked') == 'true']
#         assert len(flaw_checked) == 0, 'Incorrect check-all uncheck result'

    def input_filter_keyword_and_filter_flaw(self, keywd):
        self.flawFilterBox.visibility_of_element_located()
        self.flawFilterBox.set_text(keywd)

    def get_flaw_list_item_count(self):
        self.flawRow.visibility_of_element_located()
        return len(find_elements_in_page_factory(self, "flawRow"))

    def get_field_value(self, field):
        field_value = getattr(self, field + 'Text')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_value)
        return field_value.get_text()

    def set_value(self, field, value):
        field_input = getattr(self, field + 'Box')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_input)
        field_input.set_text(value)

    def clear_box(self, field):
        field_input = getattr(self, field + 'Box')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_input)
        field_input.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)

#     def select_bulk_flaws(self, length=1):
#         self.firstFlaw.visibility_of_element_located()
#         flaw_checkboxes = find_elements_in_page_factory(self, "flawCheckBox")
#         links = []
#         for i in range(1, length+1):
#             checkbox = flaw_checkboxes[i]
#             checkbox.click()
#             flaw_link = self.driver.find_element(
#                     By.XPATH, f"(//td[contains(@class, 'osim-issue-title')])[{i}]/a")
#             links.append(flaw_link)
#         return links
#
#     def bulk_assign(self):
#         self.click_btn('bulkActionBtn')
#         hide = self.driver.find_elements(
#             locate_with(By.XPATH, "//div[@class='osim-incident-list']/table/thead"))[0]
#         self.driver.execute_script("arguments[0].style.visibility='hidden'", hide)
#         self.click_btn('assignToMeBtn')
#         self.driver.execute_script("arguments[0].style.visibility='visible'", hide)
#
#     def check_bulk_assign(self, flaw_link):
#         from features.utils import wait_for_visibility_by_locator
#         flaw_link.click()
#         wait_for_visibility_by_locator(self.driver, By.XPATH, '//button[text()=" Save Changes "]')
#         assignee_value_element = self.driver.find_elements(
#              locate_with(By.XPATH, ("(//span[@class='osim-editable-text-value form-control'])[6]")))[0]
#         login_user = self.userBtn.get_text()
#         assert assignee_value_element.get_text() == login_user.strip(), 'Bulk assign failed'

    def get_sort_flaws(self, field, sort_fields):
        sorted_numbers = sorted(random.sample(range(1, 50), 3))
        field_column = sort_fields.index(field) + 1
        for number in sorted_numbers:
            locator = f"//tr[@class='osim-issue-queue-item'][{number}]/td[{field_column}]"
            self.locators[f"{field}{number}Text"] = ("XPATH", locator)
        return sorted_numbers

    def get_sort_field_values(self, field, sort_fields):
        sorted_numbers = self.get_sort_flaws(field, sort_fields)
        value = []
        for number in sorted_numbers:
            if "title" not in field:
                value.append(self.get_field_value(f"{field}{number}"))
            else:
                value.append(self.get_field_value(f"{field}{number}").lower())
        return value

    def get_specified_cell_value(self, row, column):
        locator = f"//div[@class='osim-incident-list']/table/tbody/tr[{row}]/td[{column}]"
        return self.driver.find_element(By.XPATH, locator).text

    def get_jira_username(self):
        # Get the current username
        user_name = self.userBtn.get_text().strip()
        if "|" not in user_name:
            value = user_name
        else:
            value = user_name.split('|')[1].strip()

        return value
