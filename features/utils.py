from functools import wraps

import requests
import random
import string
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

from constants import TIMEOUT, OSIM_URL, BUGZILLA_API_KEY, JIRA_API_KEY
from pages.login_page import LoginPage
from pages.home_page import HomePage
from pages.settings_page import SettingsPage
from pages.flaw_detail_page import FlawDetailPage


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
    login_page = LoginPage(browser)
    login_page.login()
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


def set_jira_api_key(browser):
    """
    set osim jira API key in settings
    """
    home_page = HomePage(browser)
    home_page.click_user_btn()
    home_page.click_settings_btn()

    settings_page = SettingsPage(browser)
    settings_page.set_jira_api_key(JIRA_API_KEY)


def set_bugzilla_api_key(browser):
    """
    set osim jira API key in settings
    """
    home_page = HomePage(browser)
    home_page.click_user_btn()
    home_page.click_settings_btn()

    settings_page = SettingsPage(browser)
    settings_page.set_bugzilla_api_key(BUGZILLA_API_KEY)


def go_to_flaw_detail_page(browser):
    """
    This function is a comment one for all senarios of edit flaw.
    """
    # From the setting page back to flaw list
    home_page = HomePage(browser)
    home_page.click_flaw_index_btn()
    home_page.flaw_list_exist()

    # Get the first flaw and go to detail table
    home_page.click_first_flaw_link()

    flaw_detail_page = FlawDetailPage(browser)
    flaw_detail_page.add_comment_btn_exist()


def generate_random_text():
    """
    This function is used to generate random text
    """
    N = 8
    text = ''.join(random.choices(string.ascii_uppercase + string.digits, k=N))
    return text
