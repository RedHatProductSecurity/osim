import time
from behave import *
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from features.pages.home_page import HomePage
from features.pages.flaw_detail_page import FlawDetailPage
from pages.advanced_search_page import AdvancedSearchPage

from features.utils import (
        wait_for_visibility_by_locator,
        go_to_home_page,
        go_to_specific_flaw_detail_page
)


FLAW_TITLE_TEXT_XPATH = "//tr[1]/td[6]"
FLAW_CVE_ID_TEXT_XPATH = "//tr[1]/td[2]/a"
FLAW_SOURCE_TEXT_XPATH = '//tr[1]/td[4]'

# The following constants are related to flaw filter that should be updated
# according to the imported test database in the future
COUNT_FLAWS_SAME_SOURCE = 10


def catch_one_existing_flaw_text_and_locator(context, text_type):
    """
    Catch a filter keyword and the specific text locator according to the
    existing flaws.
    requires: the filter keyword text type
    return: filter keyword text and the related locator
    """
    if text_type == "title":
        context.element_locator = FLAW_TITLE_TEXT_XPATH
    elif text_type == "cve_id":
        context.element_locator = FLAW_CVE_ID_TEXT_XPATH
    elif text_type == "source":
        context.element_locator = FLAW_SOURCE_TEXT_XPATH
    else:
        return "No flaws were found."
    time.sleep(3)
    wait_for_visibility_by_locator(
        context.browser, By.XPATH, context.element_locator)
    try:
        element = context.browser.find_element(
            By.XPATH, context.element_locator)
        return element.text, context.element_locator
    except NoSuchElementException:
        context.browser.quit()

def when_step_mathcher(context, text_type):
    """
    Input the filter keyword and search
    """
    try:
        text, context.element_locator = catch_one_existing_flaw_text_and_locator(
            context, text_type)
        home_page = HomePage(context.browser)
        home_page.input_filter_keyword_and_filter_flaw(text)
    except NoSuchElementException:
        context.browser.quit()


def then_step_mathcher(context, flaws_count):
    """
    Check the filter results and check the number of the flaws
    """
    # Make sure the flaws were loaded and the flaw was the filtered flaw
    home_page = HomePage(context.browser)
    current_len = home_page.get_flaw_list_item_count()
    assert current_len == int(flaws_count)
    context.browser.quit()

@when('I input a filter keyword "title" in the "Filter Issues/Flaws" input box')
def step_impl(context):
    when_step_mathcher(context, "title")

@then('I am able to view flaws matching "title keyword" and the flaws "count" is correct')
def step_impl(context):
    then_step_mathcher(context, 1)

@when('I input a filter keyword "cve_id" in the "Filter Issues/Flaws" input box')
def step_impl(context):
    when_step_mathcher(context, "cve_id")

@then('I am able to view flaws matching "cve_id" and the flaws "count" is correct')
def step_impl(context):
    then_step_mathcher(context, 1)

@when('I input a filter keyword "source" in the "Filter Issues/Flaws" input box')
def step_impl(context):
    when_step_mathcher(context, "source")

@then('I am able to view flaws matching "source" and the flaws "count" is correct')
def step_impl(context):
    flaws_count = COUNT_FLAWS_SAME_SOURCE
    then_step_mathcher(context, flaws_count)

@given("I assgin one issue to me")
def step_impl(context):
    home_page = HomePage(context.browser)
    detail_page = FlawDetailPage(context.browser)
    # Get the current username
    context.user_name = home_page.userBtn.get_text()
    # Go to a specific flaw detail page
    go_to_specific_flaw_detail_page(context.browser)
    # Assign this flaw to the current user
    detail_page.set_input_field("owner", context.user_name)
    detail_page.click_btn('saveBtn')
    detail_page.wait_msg('flawSavedMsg')

@when("I check 'My Issues' checkbox in index page")
def step_impl(context):
    home_page = HomePage(context.browser)
    go_to_home_page(context.browser)
    home_page.firstFlaw.visibility_of_element_located()
    home_page.click_btn("myIssuesCheckbox")

@then("All issues assigned to me should be listed in flaw table")
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.firstFlaw.visibility_of_element_located()
    # Only firstFlaw.visibility_of_element_located can't work
    time.sleep(1)
    owner = home_page.get_field_value("owner")
    assert context.user_name == owner
    # Need to check the count of my issues that depends on testdata
    context.browser.quit()
