from selenium.webdriver.common.keys import Keys
from seleniumpagefactory.Pagefactory import PageFactory
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC


class FlawDetailPage(PageFactory):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "summaryText": ("XPATH", "//span[text()='Summary']"),
        "summaryTextWindow": ("XPATH", "(//textarea[@class='form-control col-9 d-inline-block'])[1]"),
        "descriptionText": ("XPATH", "//span[text()='Description']"),
        "descriptionTextWindow": ("XPATH", "(//textarea[@class='form-control col-9 d-inline-block'])[2]"),
        "statementText": ("XPATH", "//span[text()='Statement']"),
        "statementTextWindow": ("XPATH", "(//textarea[@class='form-control col-9 d-inline-block'])[3]"),
        "mitigationText": ("XPATH", "//span[text()='Mitigation']"),
        "mitigationTextWindow": ("XPATH", "(//textarea[@class='form-control col-9 d-inline-block'])[4]"),
        "addCommentBtn": ("XPATH", "//button[contains(text(), 'Comment')]"),
        "commentTextWindow": ("XPATH", "(//textarea[@class='form-control col-9 d-inline-block'])[5]"),
        "saveBtn": ("XPATH", '//button[text()="Save Changes"]'),
        "flawSavedMsg": ("XPATH", "//div[text()='Flaw saved']"),
        "documentTextFieldsDropDownBtn": ("XPATH", "(//button[@class='me-2'])[1]"),
        "acknowledgmentsDropDownBtn": ("XPATH", "(//button[@class='me-2'])[3]"),
        "addAcknowledgementBtn": ("XPATH", "//button[contains(text(), 'Add Acknowledgment')]"),
        "addAcknowledgementInputLeft": ("XPATH", "(//div[@class='osim-list-create']/div/div/input)[1]"),
        "addAcknowledgementInputRight": ("XPATH", "(//div[@class='osim-list-create']/div/div/input)[2]"),
        "saveAcknowledgementBtn": ("XPATH", '//button[contains(text(), "Save Changes to Acknowledgments")]'),
        "acknowledgementSavedMsg": ("XPATH", '//div[text()="Acknowledgment created."]'),
        "newestAcknowledgement": ("XPATH", "(//div[@class='osim-list-edit']/div/div)[1]")
    }

    def add_comment_btn_exist(self):
        self.addCommentBtn.visibility_of_element_located()

    def click_add_comment_btn(self):
        self.addCommentBtn.click_button()

    def set_comment_value(self, value):
        self.commentTextWindow.set_text(value)

    def click_document_text_fields_button(self):
        self.documentTextFieldsDropDownBtn.click_button()

    def set_text_field(self, field, value):
        field_element = getattr(self, field + 'Text')
        field_input = getattr(self, field + 'TextWindow')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_element)
        if value:
            self.driver.execute_script("arguments[0].value = '';", field_input)
            field_input.send_keys(value)
        else:
            field_input.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)

    def get_text_field(self, field):
        field_element = getattr(self, field + 'Text')
        field_input = getattr(self, field + 'TextWindow')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_element)
        return field_input.getAttribute("value")

    def click_save_btn(self):
        self.saveBtn.click_button()

    def wait_flaw_saved_msg(self):
        self.flawSavedMsg.visibility_of_element_located()

    def click_acknowledgments_drop_down_btn(self):
        self.acknowledgmentsDropDownBtn.click_button()

    def click_add_acknowledgment_btn(self):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.addAcknowledgementBtn)
        self.driver.execute_script("arguments[0].click();", self.addAcknowledgementBtn)

    def set_acknowledgement(self, left_value, right_value):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.addAcknowledgementInputLeft)
        self.addAcknowledgementInputLeft.set_text(left_value)
        self.addAcknowledgementInputRight.set_text(right_value)

    def click_save_acknowledgement_btn(self):
        self.driver.execute_script("arguments[0].click();", self.saveAcknowledgementBtn)

    def wait_acknowledgement_saved_msg(self):
        self.acknowledgementSavedMsg.visibility_of_element_located()

    def check_acknowledgement_exist(self, value):
        e = self.driver.find_element(By.XPATH, f'//div[text()="{value}"]')
        return WebDriverWait(self.driver, self.timeout).until(
            EC.visibility_of(e)
        )
