import time
from behave import when, then
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from features.pages.home_page import HomePage
from features.utils import wait_for_visibility_by_locator

FLAW_TITLE_TEXT_XPATH = "//tr[1]/td[6]"
FLAW_CVE_ID_TEXT_XPATH = "//tr[1]/td[2]/a"
FLAW_STATE_TEXT_XPATH = '//tr[1]/td[7]'
FLAW_SOURCE_TEXT_XPATH = '//tr[1]/td[4]'

# The following constants are related to flaw filter that should be updated
# according to the imported test database in the future
COUNT_FLAWS_SAME_STATE = 20 
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
    elif text_type == "state":
        context.element_locator = FLAW_STATE_TEXT_XPATH
    elif text_type == "source":
        context.element_locator = FLAW_SOURCE_TEXT_XPATH
    else:
        return "No flaws were found."
    time.sleep(3)
    wait_for_visibility_by_locator(
        context.browser, By.XPATH, context.element_locator)
    try:
        element=context.browser.find_element(
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
    current_len=home_page.get_flaw_list_item_count()
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

@when('I input a filter keyword "state" in the "Filter Issues/Flaws" input box')
def step_impl(context):
    when_step_mathcher(context, "state")

@then('I am able to view flaws matching "state" and the flaws "count" is correct')
def step_impl(context):
    flaws_count=COUNT_FLAWS_SAME_STATE
    then_step_mathcher(context, flaws_count)

@when('I input a filter keyword "source" in the "Filter Issues/Flaws" input box')
def step_impl(context):
    when_step_mathcher(context, "source")

@then('I am able to view flaws matching "source" and the flaws "count" is correct')
def step_impl(context):
    flaws_count=COUNT_FLAWS_SAME_SOURCE
    then_step_mathcher(context, flaws_count)