from behave import then
from selenium.webdriver.common.by import By
from features.utils import (
        wait_for_visibility_by_xpath
)
from features.constants import (
    USER_BUTTON,
    LOGOUT_BUTTON
    )

@then('I am able to log into OSIM')
def step_impl(context):
    """
    If user login success, the user could see flaw_filter.
    """
    wait_for_visibility_by_xpath(context.browser, USER_BUTTON)
    context.browser.find_element(By.XPATH, USER_BUTTON).click()
    wait_for_visibility_by_xpath(context.browser, LOGOUT_BUTTON)
    context.browser.find_element(By.XPATH, LOGOUT_BUTTON)
    context.browser.quit()
