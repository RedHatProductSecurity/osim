from selenium.webdriver.common.keys import Keys
from seleniumpagefactory.Pagefactory import PageFactory


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
        "mitigationText": ("XPATH", "//span[text()='Mitigation']"),
        "documentTextFieldsDropDownBtn": ("XPATH", "(//button[@class='me-2'])[1]")
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
