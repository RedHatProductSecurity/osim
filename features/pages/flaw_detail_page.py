from seleniumpagefactory.Pagefactory import PageFactory


class FlawDetailPage(PageFactory):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "addCommentBtn": ("XPATH", "//button[contains(text(), 'Comment')]"),
        "commentTextWindow": ("XPATH", "(//textarea[@class='form-control'])[5]")
    }

    def add_comment_btn_exist(self):
        self.addCommentBtn.visibility_of_element_located()

    def click_add_comment_btn(self):
        self.addCommentBtn.click_button()

    def set_comment_value(self, value):
        self.commentTextWindow.set_text(value)
