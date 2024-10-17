from collections import namedtuple

from selenium.webdriver.common.by import By

from features.pages.base import BasePage


AdvancedSearchPageResult = namedtuple(
    'AdvancedSearchPageResult',
    ["id", "impact", "created", "title", "state", "owner"])


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
        "titleText": ("XPATH", "//tr[1]/td[4]"),
        "workflow_stateText": ("XPATH", "//tr[1]/td[5]"),
        "ownerText":  ("XPATH", "//tr[1]/td[6]"),
        "closeKeysetBtn": ("XPATH", "//button[@class='osim-toast-close-btn btn-close']"),
        "closeSelectRowBtn": ("XPATH", '//i[@aria-label="remove field"]'),
        "embargoedFlag": ("XPATH", "(//span[contains(text(), 'Embargoed')])[1]"),
        "defaultFilterSavedMsg": ("XPATH", "//div[contains(text(), 'default filter saved')]"),

        "sortIDTh": ("XPATH", '//th[contains(text(), "ID")]'),
        "sortImpactTh": ("XPATH", '//th[contains(text(), "Impact")]'),
        "sortCreatedTh": ("XPATH", '//th[contains(text(), "Created")]'),
        "sortTitleTh": ("XPATH", '//th[contains(text(), "Title")]'),
        "sortStateTh": ("XPATH", '//th[contains(text(), "State")]'),
        "sortOwnerTh": ("XPATH", '//th[contains(text(), "Owner")]'),
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

    def get_search_result(self, n=5):
        flaws = self.driver.find_elements(By.XPATH, "//tbody[@class='table-group-divider']/tr")
        count = 0
        result = []

        for flaw in flaws:
            if count == n:
                break
            tds = flaw.find_elements(By.XPATH, './td')
            if len(tds) < 6:
                continue

            value = AdvancedSearchPageResult(
                id=tds[0].find_element(By.XPATH, './a').text,
                impact=tds[1].text,
                created=tds[2].text,
                title=tds[3].text,
                state=tds[4].text,
                owner=tds[5].text
            )
            result.append(value)
            count += 1

        return result

    def sort_by_field(self, field_element, n=5):
        self.click_btn(field_element)
        self.first_flaw_exist()

        attribute_name = field_element.lstrip("sort").rstrip('Th').lower()

        descending_result = [
            getattr(r, attribute_name) for r in self.get_search_result(n)]
        self.click_btn(field_element)
        self.first_flaw_exist()
        ascending_result = [
            getattr(r, attribute_name) for r in self.get_search_result(n)]

        return descending_result, ascending_result
