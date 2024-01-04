from behave import given, when, then
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException

from features.utils import (
    wait_for_visibility_by_xpath,
    skip_step_when_needed
)
from features.constants import (
    LOAD_MORE_FLAWS_BUTTON,
    USER_BUTTON,
    FLAW_ROW
)


@given('Not all flaws are loaded')
def step_impl(context):
    wait_for_visibility_by_xpath(context.browser, USER_BUTTON)
    try:
        context.browser.find_element(By.XPATH, LOAD_MORE_FLAWS_BUTTON)
    except NoSuchElementException:
        context.skip = True
        context.browser.quit()


@when("I click the button 'Load More Flaws'")
@skip_step_when_needed
def step_impl(context):
    # wait flaw data load
    wait_for_visibility_by_xpath(context.browser, '//tbody[@class="table-group-divider"]/tr[1]')
    # get current flaw count
    rows = context.browser.find_elements(By.XPATH, FLAW_ROW)
    context.flaws_count = len(rows)
    # click button
    btn = context.browser.find_element(By.XPATH, LOAD_MORE_FLAWS_BUTTON)
    context.browser.execute_script("arguments[0].click();", btn)


@then("More flaws are loaded into the list")
@skip_step_when_needed
def step_impl(context):
    # check if there is more flaws loaded
    wait_for_visibility_by_xpath(
        context.browser,
        f'//tbody[@class="table-group-divider"]/tr[{context.flaws_count*2+1}]')

    rows = context.browser.find_elements(By.XPATH, FLAW_ROW)
    assert len(rows) > context.flaws_count, \
        "No more flaws loaded after click the 'Load More Flaws' button"

    context.browser.quit()
