import time

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from seleniumpagefactory.Pagefactory import PageFactory

from features.page_factory_utils import find_elements_in_page_factory


class BasePage(PageFactory):
    """
    Put common function to this class, all page class should inherit
    this class
    """

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 60

    def click_button_with_js(self, btn_element):
        if not isinstance(btn_element, WebElement):
            element = getattr(self, btn_element)
        else:
            element = btn_element
        self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
        self.driver.execute_script("arguments[0].click();", element)

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

        self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
        self.driver.execute_script("arguments[0].value = '';", element)

    def wait_msg(self, msg_element):
        element = getattr(self, msg_element)
        element.visibility_of_element_located(self.timeout)

    def check_text_exist(self, value):
        self.check_element_exists(By.XPATH, f'//*[contains(text(), "{value}")]')

    def is_checkbox_selected(self, checkbox):
        element = find_elements_in_page_factory(self, checkbox)
        return element[0].is_selected()

    def check_element_exists(self, by, value):
        return WebDriverWait(self.driver, self.timeout).until(
            EC.presence_of_element_located((by, value))
        )

    def is_element_exists(self, by, value):
        results = self.driver.find_elements(by, value)
        return bool(results)

    def open_new_tab(self, url):
        # Store the ID of the original window
        original_window = self.driver.current_window_handle

        # switch to new tab
        self.driver.switch_to.new_window('tab')
        self.driver.get(url)
        time.sleep(3)

        return original_window

    def close_tab_return_to_original_window(self, original_window):
        self.driver.close()
        self.driver.switch_to.window(original_window)
