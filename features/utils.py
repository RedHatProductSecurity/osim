import json
import os
import re
import time

import rstr
import random
import string
import urllib.parse

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.common.exceptions import NoSuchElementException

from constants import (
    OSIDB_URL,
    OSIM_URL,
    SELENIUM_URL,
    BUGZILLA_API_KEY,
    JIRA_API_KEY,
    FLAW_ID_KEY
)
from common_utils import get_data_from_tmp_data_file
from pages.login_page import LoginPage
from pages.home_page import HomePage
from pages.settings_page import SettingsPage
from pages.flaw_detail_page import FlawDetailPage
from pages.advanced_search_page import AdvancedSearchPage


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
    if 'CI' in os.environ:
        op.add_argument("-headless")
    return webdriver.Remote(command_executor=SELENIUM_URL, options=op)


def osim_login_page():
    """
    This function is used to get the index page of OSIM
    """
    browser = init_remote_firefox_browser()
    browser.get(OSIM_URL)
    return browser


def login_with_valid_account():
    """
    This function defines the login.
    """
    browser = osim_login_page()
    login_page = LoginPage(browser)
    login_page.login()
    return browser


def set_api_keys(browser):
    home_page = HomePage(browser)
    home_page.click_btn("userBtn")
    home_page.click_btn("settingsBtn")
    settings_page = SettingsPage(browser)
    settings_page.set_api_key('bugzilla', BUGZILLA_API_KEY)
    settings_page.set_api_key('jira', JIRA_API_KEY)

    # wait osim getting username from jira
    time.sleep(2)

    # open notification so that we can judge if operation succeed
    flaw_detail_page = FlawDetailPage(browser)
    try:
        flaw_detail_page.muteNotificationIcon.click()
    except NoSuchElementException:
        pass

    flaw_detail_page.close_all_toast_msg()


def go_to_home_page(browser):
    home_page = HomePage(browser)
    home_page.click_button_with_js('flawIndexBtn')
    home_page.flaw_list_exist()


def go_to_specific_flaw_detail_page(browser, flaw_id=None):
    """
    Go to a specific flaw detail page
    """
    cve_id = flaw_id if flaw_id else get_data_from_tmp_data_file(FLAW_ID_KEY)

    if cve_id.startswith("CVE-"):
        go_to_home_page(browser)
        home_page = HomePage(browser)
        home_page.clear_text_with_js(home_page.quickSearchBox)
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
        return l == sorted(l, key=lambda x: str.casefold(x), reverse=True)
    else:
        return l == sorted(l, key=lambda x: str.casefold(x))
