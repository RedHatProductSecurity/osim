from features.pages.base import BasePage

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.relative_locator import locate_with


class AdvancedSearchPage(BasePage):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "searchBtn": ('XPATH', '//button[contains(text(), "Search")]'),
        "saveAsDefaultBtn": ('XPATH', '//button[contains(text(), "Save as Default")]'),
        "firstFlaw": ("XPATH", "//div[@class='osim-incident-list']/table/tbody/tr[1]"),
        "selectKeyList": ("XPATH", "//select[@class='form-select search-facet-field']"),
        "selectValueList": ("XPATH", "//select[@class='form-select']"),
        "emptyBtn": ("XPATH", "//button[@title='Empty field search']"),
        "nonemptyBtn": ("XPATH", "//button[@title='Non empty field search']"),

        "inputTextWindow": ("XPATH", "(//details/form/div/input[@class='form-control'])[last()]"),
        "selectKeyList2": ("XPATH", "(//select[@class='form-select search-facet-field'])[2]"),
        "selectValueList2": ("XPATH", "(//select[@class='form-select'])[2]"),
        "cve_idText": ("XPATH", "//tr[1]/td[1]/a"),
        "impactText": ("XPATH", "//tr[1]/td[2]"),
        "createdText": ("XPATH", "//tr[1]/td[3]"),
        "titleText": ("XPATH", "//tr[1]/td[4]"),
        "workflow_stateText": ("XPATH", "//tr[1]/td[5]"),
        "ownerText":  ("XPATH", "//tr[1]/td[6]"),
        "closeKeysetBtn": ("XPATH", "//button[@class='osim-toast-close-btn btn-close']"),
        "closeSelectRowBtn": ("XPATH", '//i[@aria-label="remove field"]'),
        "embargoedFlag": ("XPATH", "(//span[contains(text(), 'Embargoed')])[1]"),
        "queryFilterInput": ("XPATH", "(//div[@class='input-group my-1'])[1]/textarea"),
        "defaultFilterSavedMsg": ("XPATH", "//div[contains(text(), 'default filter saved')]"),
    }

    def first_flaw_exist(self):
        self.firstFlaw.visibility_of_element_located()

    def first_flaw_embargoed_flag_exist(self):
        self.embargoedFlag.visibility_of_element_located()

    def select_field_and_value_to_search(self, item_key, item_value):
        self.selectKeyList.click_button()
        self.selectKeyList.select_element_by_value(item_key)
        try:
            self.inputTextWindow.set_text(item_value)
        except:
            self.selectValueList.click_button()
            self.selectValueList.select_element_by_value(item_value)

    def select_second_field_and_value_to_search(self, item_key, item_value):
        self.selectKeyList2.click_button()
        self.selectKeyList2.select_element_by_value(item_key)
        self.selectValueList2.click_button()
        self.selectValueList2.select_element_by_value(item_value)

    def go_to_first_flaw_detail(self):
        self.click_button_with_js(self.cve_idText)

    def get_first_flaw_id(self):
        return self.cve_idText.get_text()

    def get_field_value_from_flawlist(self, field):
        field_value = getattr(self, field + 'Text')
        return field_value.get_text()

    def close_setting_keys_window(self):
        self.closeKeysetBtn.click_button()

    def set_query_filter(self, value):
        filter_input = getattr(self, 'queryFilterInput')
        filter_input.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)
        if value:
            self.driver.execute_script("arguments[0].value = '';", filter_input)
            filter_input.send_keys(value)
