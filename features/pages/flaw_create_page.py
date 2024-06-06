from selenium.webdriver.common.by import By
from selenium.webdriver.support.relative_locator import locate_with

from .flaw_detail_page import FlawDetailPage


class FlawCreatePage(FlawDetailPage):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "flawCreatedMsg": ("XPATH", "//div[text()='Flaw created']"),

        "bottomBar": ("XPATH", "//div[@class='osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end']"),
        "bottomFooter": ("XPATH", "//footer[@class='fixed-bottom osim-status-bar']"),

        "createNewFlawBtn": ("XPATH",  "//button[contains(text(), 'Create New Flaw')]"),
        "createFlawLink": ("LINK_TEXT", "Create Flaw"),
        "embargeodCheckBox": ("XPATH", "//input[@class='form-check-input']"),

        "comment#0Text": ("XPATH", "//span[text()='Comment#0']"),
        "descriptionBtn": ("XPATH", "//button[contains(text(), 'Add Description')]"),
        "descriptionText": ("XPATH", "//span[text()='Description']"),
        "statementBtn": ("XPATH", "//button[contains(text(), 'Add Statement')]"),
        "statementText": ("XPATH", "//span[text()='Statement']"),

        "impactText": ("XPATH", "//span[text()='Impact']"),
        "sourceText": ("XPATH", "//span[text()='CVE Source']"),
        "titleText": ("XPATH", "//span[text()='Title']"),
        "componentText": ("XPATH", "//span[text()='Component']"),
        "cveidText": ("XPATH", "//span[text()='CVE ID']"),
        "cweidText": ("XPATH", "//span[text()='CWE ID']"),
        "publicDateText": ("XPATH", "//span[text()='Public Date']")
    }

    def set_select_value(self, field):
        text_element = getattr(self, field + "Text")
        field_select = self.driver.find_elements(
                locate_with(By.XPATH, "//select[@class='form-select is-invalid']").
                near(text_element))[0]
        all_values, current_value = self.get_select_value(field_select)
        if field == 'source':
            all_values = self.allowed_sources
        if current_value:
            all_values.remove(current_value)
        if all_values:
            updated_value = all_values[-1]
            field_select.select_element_by_value(updated_value)
        else:
            updated_value = current_value
        return updated_value

    def click_empty_public_date_input(self):
        edit_btn = self.driver.find_elements(
            locate_with(By.XPATH, "//button[@class='osim-editable-date-pen input-group-text']").
            to_right_of(self.publicDateText))[0]

        self.click_button_with_js(edit_btn)

