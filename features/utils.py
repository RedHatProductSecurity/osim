import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait
from .constants import SUBMIT_BUTTON, TIMEOUT, OSIM_URL


def server_is_ready(url):
    try:
        response = requests.get(url, verify=False)
        print("Status Code:", response.status_code)
        if response.status_code == 200:
            return True
    except ConnectionError as e:
        print("Connection error:", e)
        return False
    except Exception as e:  # This will catch other exceptions that may occur.
        print("An error occurred:", e)
        return False
    return False


def init_remote_firefox_browser():
    """
    Init a remote firefox driver which we can use to test
    osim
    :return: Remote selenium firefox driver
    """
    profile = webdriver.FirefoxProfile()
    profile.set_preference('network.negotiate-auth.trusted-uris', 'http://')
    op = Options()
    op.profile = profile
    return webdriver.Remote(options=op)


def wait_for_visibility_by_xpath(browser, element_xpath):
    """
    Wait for loading the element.
    """
    wait = WebDriverWait(browser, int(TIMEOUT))
    locator = (By.XPATH, element_xpath)
    wait.until(EC.visibility_of_element_located(locator))


def login_with_valid_account():
    """
    This function defines the login.
    """
    browser = init_remote_firefox_browser()
    browser.get(OSIM_URL)
    wait_for_visibility_by_xpath(browser, SUBMIT_BUTTON)
    browser.find_element(By.XPATH, SUBMIT_BUTTON).click()
    return browser
