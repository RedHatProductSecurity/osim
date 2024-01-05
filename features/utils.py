from functools import wraps

import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

from .constants import TIMEOUT, OSIM_URL
from .locators import LOGIN_BUTTON


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
    profile.set_preference('network.negotiate-auth.trusted-uris', 'https://')
    op = Options()
    op.profile = profile
    return webdriver.Remote(options=op)


def wait_for_visibility_by_locator(browser, locator_type, element_locator):
    """
    Wait for loading the element.
    """
    wait = WebDriverWait(browser, int(TIMEOUT))
    locator = (locator_type, element_locator)
    wait.until(EC.visibility_of_element_located(locator))


def login_with_valid_account():
    """
    This function defines the login.
    """
    browser = init_remote_firefox_browser()
    browser.get(OSIM_URL)
    wait_for_visibility_by_locator(browser, By.XPATH, LOGIN_BUTTON)
    browser.find_element(By.XPATH, LOGIN_BUTTON).click()
    return browser


def skip_step_when_needed(func):
    """
    Decorator used for cucumber steps. When context.skip is True,
    skip current step
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        if hasattr(args[0], "skip") and args[0].skip:
            return

        return func(*args, **kwargs)

    return wrapper
