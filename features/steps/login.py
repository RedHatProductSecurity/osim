from behave import then, when
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By

from features.utils import wait_for_visibility_by_locator
from features.locators import (
    LOGIN_BUTTON,
    LOGOUT_BUTTON,
    USER_BUTTON
)


@then('I am able to log into OSIM')
def step_impl(context):
    """
    If user login success, the user could see logout.
    """
    wait_for_visibility_by_locator(context.browser, By.CSS_SELECTOR, USER_BUTTON)
    context.browser.quit()


@when('I click the Logout button from the account dropdown')
def step_impl(context):
    wait_for_visibility_by_locator(context.browser, By.CSS_SELECTOR, USER_BUTTON)
    element = context.browser.find_element(By.CSS_SELECTOR, USER_BUTTON)
    ActionChains(context.browser).move_to_element(element).click().perform()
    wait_for_visibility_by_locator(context.browser, By.XPATH, LOGOUT_BUTTON)
    context.browser.find_element(By.XPATH, LOGOUT_BUTTON).click()


@then('I log out and am redirected to the login page')
def step_impl(context):
    wait_for_visibility_by_locator(context.browser, By.XPATH, LOGIN_BUTTON)
    context.browser.quit()
