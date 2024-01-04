from behave import then
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from features.utils import (
        wait_for_visibility_by_locator
)
from features.constants import (
    USER_BUTTON,
    LOGOUT_BUTTON
    )

@then('I am able to log into OSIM')
def step_impl(context):
    """
    If user login success, the user could see logout.
    """
    wait_for_visibility_by_locator(context.browser, By.CSS_SELECTOR,
        USER_BUTTON)
    element=context.browser.find_element(By.CSS_SELECTOR, USER_BUTTON)
    ActionChains(context.browser).move_to_element(element).click().perform()
    wait_for_visibility_by_locator(context.browser, By.XPATH, LOGOUT_BUTTON)
    context.browser.find_element(By.XPATH, LOGOUT_BUTTON)
    context.browser.quit()