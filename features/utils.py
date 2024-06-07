import json
import os
import re
import rstr
import requests
import random
import string
import urllib.parse
from functools import wraps

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

from constants import (
    TIMEOUT,
    OSIDB_URL,
    OSIM_URL,
    SELENIUM_URL,
    BUGZILLA_API_KEY,
    JIRA_API_KEY
)
from pages.login_page import LoginPage
from pages.home_page import HomePage
from pages.settings_page import SettingsPage
from pages.flaw_detail_page import FlawDetailPage
from pages.advanced_search_page import AdvancedSearchPage


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
    return webdriver.Remote(command_executor=SELENIUM_URL, options=op)


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
    home_page.click_btn("userBtn")
    home_page.click_btn("settingsBtn")

    settings_page = SettingsPage(browser)
    settings_page.set_jira_api_key(JIRA_API_KEY)


def set_bugzilla_api_key(browser):
    """
    set osim jira API key in settings
    """
    home_page = HomePage(browser)
    home_page.click_btn("userBtn")
    home_page.click_btn("settingsBtn")

    settings_page = SettingsPage(browser)
    settings_page.set_bugzilla_api_key(BUGZILLA_API_KEY)


def go_to_home_page(browser):
    home_page = HomePage(browser)
    home_page.click_button_with_js('flawIndexBtn')
    home_page.flaw_list_exist()


def go_to_specific_flaw_detail_page(browser):
    """
    Go to a specific flaw detail page
    """
    cve_id = os.getenv("FLAW_ID")

    if cve_id.startswith("CVE-"):
        go_to_home_page(browser)
        home_page = HomePage(browser)
        home_page.quickSearchBox.clear_text()
        home_page.quickSearchBox.set_text(cve_id)
        home_page.click_btn('quickSearchBtn')
    else:
        go_to_advanced_search_page(browser)
        advanced_search_page = AdvancedSearchPage(browser)
        advanced_search_page.select_field_and_value_to_search("uuid", cve_id)
        advanced_search_page.click_btn("searchBtn")
        advanced_search_page.first_flaw_exist()
        advanced_search_page.go_to_first_flaw_detail()

    flaw_detail_page = FlawDetailPage(browser)
    flaw_detail_page.save_button_exist()


def generate_random_text(length=8):
    """
    This function is used to generate random text
    """
    text = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
    return text


def go_to_advanced_search_page(browser):
    """
    This function is a comment one for all advance search senarios.
    """
    home_page = HomePage(browser)
    home_page.click_button_with_js("advancedSearchDropDownBtn")
    home_page.click_button_with_js("advancedSearchBtn")


def generate_cve():
    cve_re_str = re.compile(r"CVE-(?:1999|2\d{3})-(?!0{4})(?:0\d{3}|[1-9]\d{3,7})")
    return rstr.xeger(cve_re_str)


def generate_cwe():
    cwe_re_str = re.compile(r"CWE-[1-9]\d*(\[auto\])?", flags=re.IGNORECASE)
    return rstr.xeger(cwe_re_str)


def get_osidb_token():
    url = urllib.parse.urljoin(OSIDB_URL, "auth/token")
    cli = f"curl -H 'Content-Type: application/json' --negotiate -u  : {url} > token"
    os.system(cli)
    f = open("token", "r")
    text = f.read()
    return json.loads(text).get('access')


def is_sorted(l, order):
    if order == 'desc':
        return all(l[i] >= l[i+1] for i in range(len(l) - 1))
    else:
        return all(l[i] <= l[i+1] for i in range(len(l) - 1))
