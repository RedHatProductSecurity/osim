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

        "createNewFlawBtn": ("XPATH", '//button[text()="Create New Flaw"]'),
        "createFlawLink": ("LINK_TEXT", "Create Flaw"),
        "embargeodCheckBox": ("XPATH", "//input[@class='form-check-input']"),

        "comment#0Text": ("XPATH", "//span[text()='Comment#0']"),
        "descriptionBtn": ("XPATH", "//button[contains(text(), 'Add Description')]"),
        "descriptionText": ("XPATH", "//span[text()='Description']"),
        "statementBtn": ("XPATH", "//button[contains(text(), 'Add Statement')]"),
        "statementText": ("XPATH", "//span[text()='Statement']"),

        "impactText": ("XPATH", "//span[text()='Impact']"),
        "sourceText": ("XPATH", "//span[text()='Source']"),
        "titleText": ("XPATH", "//span[text()='Title']"),
        "componentText": ("XPATH", "//span[text()='Component']"),
        "cveidText": ("XPATH", "//span[text()='CVE ID']"),
        "reportedDateText": ("XPATH", "//span[text()='Reported Date']"),
        "publicDateText": ("XPATH", "//span[text()='Public Date']"),
        "cweidText": ("XPATH", "//span[text()='CWE ID']")
    }

    def set_input_field(self, field, value):
        text_element = getattr(self, field + "Text")
        # find edit button and input using relative locators
        if "Date" not in field:
            edit_btn = self.driver.find_elements(
                locate_with(By.XPATH, "//button[@class='osim-editable-text-pen input-group-text']").
                to_right_of(text_element))[0]
        else:
            edit_btn = self.driver.find_elements(
                locate_with(By.XPATH, "//button[@class='osim-editable-date-pen input-group-text']").
                to_right_of(text_element))[0]

        self.click_button_with_js(edit_btn)

        if ("cveid" in field) or ("cweid" in field):
            field_input = self.driver.find_elements(
                locate_with(By.XPATH, "//input[@class='form-control']").
                near(text_element))[0]
        else:
            field_input = self.driver.find_elements(
                locate_with(By.XPATH, "//input[@class='form-control is-invalid']").
                near(text_element))[0]

        self.driver.execute_script("arguments[0].value = '';", field_input)
        field_input.send_keys(value)

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
