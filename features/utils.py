from functools import wraps

import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support.relative_locator import locate_with
from selenium.webdriver.common.action_chains import ActionChains

from constants import TIMEOUT, OSIM_URL, BUGZILLA_API_KEY
from locators import LOGIN_BUTTON, USER_BUTTON, BUGZILLA_API_KEY_TEXT_ELEMENT


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


def set_bugzilla_api_key(browser):
    """
    set osim bugzilla API key in settings
    """
    # enter settings page
    wait_for_visibility_by_locator(browser, By.CSS_SELECTOR, USER_BUTTON)
    element = browser.find_element(By.CSS_SELECTOR, USER_BUTTON)
    ActionChains(browser).move_to_element(element).click().perform()
    settings_btn = browser.find_element(By.LINK_TEXT, "Settings")
    settings_btn.click()
    # set bugzilla api key
    key_text = browser.find_element(By.XPATH, BUGZILLA_API_KEY_TEXT_ELEMENT)
    key_input = browser.find_elements(
        locate_with(By.TAG_NAME, "input").below(key_text))[0]

    key_input.clear()
    key_input.send_keys(BUGZILLA_API_KEY)

    save_btn = browser.find_element(By.XPATH, "//button[text()='Save' and @type='submit']")
    browser.execute_script("arguments[0].click();", save_btn)

