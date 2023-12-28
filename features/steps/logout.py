from behave import when, then
from selenium.webdriver.common.by import By

from features.utils import wait_for_visibility_by_xpath
from features.constants import USER_BUTTON, LOGOUT_BUTTON, LOGIN_BUTTON


@when('I click the Logout button from the account dropdown')
def step_impl(context):
    wait_for_visibility_by_xpath(context.browser, USER_BUTTON)
    context.browser.find_element(By.XPATH, USER_BUTTON).click()
    wait_for_visibility_by_xpath(context.browser, LOGOUT_BUTTON)
    context.browser.find_element(By.XPATH, LOGOUT_BUTTON).click()


@then('I log out and am redirected to the login page')
def step_impl(context):
    wait_for_visibility_by_xpath(context.browser, LOGIN_BUTTON)
    context.browser.find_element(By.XPATH, LOGIN_BUTTON)
    context.browser.quit()
