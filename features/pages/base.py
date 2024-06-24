from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.common.exceptions import NoSuchElementException
from seleniumpagefactory.Pagefactory import PageFactory

from features.page_factory_utils import find_elements_in_page_factory


class BasePage(PageFactory):
    """
    Put common function to this class, all page class should inherit
    this class
    """

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 30

    def click_button_with_js(self, btn_element):
        if not isinstance(btn_element, WebElement):
            element = getattr(self, btn_element)
        else:
            element = btn_element
        element.execute_script("arguments[0].scrollIntoView(true);")
        element.execute_script("arguments[0].click();")

    def click_btn(self, btn_element):
        if not isinstance(btn_element, WebElement):
            element = getattr(self, btn_element)
        else:
            element = btn_element
        self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
        element.click_button()

    def clear_text_with_js(self, element_name):
        if not isinstance(element_name, WebElement):
            element = getattr(self, element_name)
        else:
            element = element_name
        element.execute_script("arguments[0].scrollIntoView(true);")
        element.execute_script("arguments[0].value = '';")

    def wait_msg(self, msg_element):
        element = getattr(self, msg_element)
        element.visibility_of_element_located()

    def check_value_exist(self, value):
        try:
            self.driver.find_element(By.XPATH, f'//span[contains(text(), "{value}")]')
        except NoSuchElementException:
            raise

    def is_checkbox_selected(self, checkbox):
        element = find_elements_in_page_factory(self, checkbox)
        return element[0].is_selected()
