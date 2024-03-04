from seleniumpagefactory.Pagefactory import PageFactory


class FlawDetailPage(PageFactory):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "addCommentBtn": ("XPATH", "//button[contains(text(), 'Comment')]"),
        "commentTextWindow": ("XPATH", "(//textarea[@class='form-control col-9 d-inline-block'])[5]"),
        "statementText": ("XPATH", "//span[text()='Statement']"),
        "statementTextWindow": ("XPATH", "(//textarea[@class='form-control col-9 d-inline-block'])[3]"),
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

    def set_statement(self, value):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.statementText)
        self.driver.execute_script("arguments[0].value = '';", self.statementTextWindow)
        self.statementTextWindow.send_keys(value)

    def get_statement_value(self):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.statementText)
        return self.statementTextWindow.getAttribute("value")

    def click_save_btn(self):
        self.saveBtn.click_button()

    def wait_flaw_saved_msg(self):
        self.flawSavedMsg.visibility_of_element_located()
