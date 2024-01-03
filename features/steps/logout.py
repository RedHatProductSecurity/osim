from behave import when, then
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By

from features.utils import wait_for_visibility_by_locator
from features.constants import USER_BUTTON, LOGOUT_BUTTON, LOGIN_BUTTON


@when('I click the Logout button from the account dropdown')
def step_impl(context):
    wait_for_visibility_by_locator(context.browser, By.CSS_SELECTOR, USER_BUTTON)
    element=context.browser.find_element(By.CSS_SELECTOR, USER_BUTTON)
    ActionChains(context.browser).move_to_element(element).click().perform()
    wait_for_visibility_by_locator(context.browser, By.XPATH, LOGOUT_BUTTON)
    context.browser.find_element(By.XPATH, LOGOUT_BUTTON).click()


@then('I log out and am redirected to the login page')
def step_impl(context):
    wait_for_visibility_by_locator(context.browser, By.CSS_SELECTOR, LOGIN_BUTTON)
    context.browser.find_element(By.CSS_SELECTOR, LOGIN_BUTTON)
    context.browser.quit()
