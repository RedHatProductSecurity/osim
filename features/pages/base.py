from seleniumpagefactory.Pagefactory import PageFactory


class BasePage(PageFactory):
    """
    Put common function to this class, all page class should inherit
    this class
    """

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    def click_button_with_js(self, btn_element):
        element = getattr(self, btn_element)
        element.execute_script("arguments[0].scrollIntoView(true);")
        element.execute_script("arguments[0].click();")

    def click_btn(self, btn_element):
        element = getattr(self, btn_element)
        self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
        element.click_button()

    def clear_text_with_js(self, element_name):
        element = getattr(self, element_name)
        element.execute_script("arguments[0].scrollIntoView(true);")
        element.execute_script("arguments[0].value = '';")

    def wait_msg(self, msg_element):
        element = getattr(self, msg_element)
        element.visibility_of_element_located()
