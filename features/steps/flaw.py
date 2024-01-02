from behave import given, when, then
from selenium.webdriver.common.by import By

from features.constants import (
    FLAW_CHECKALL,
    FLAW_CHECKBOX,
    FLAW_ROW
)
from features.utils import wait_for_visibility_by_xpath


@given('I am on the flaw list')
def step_impl(context):
    flaw_list_xpath = '//div[@class="osim-incident-list"]'
    wait_for_visibility_by_xpath(context.browser, flaw_list_xpath)


@when('I click the link of a flaw')
def step_impl(context):
    flaw_link_xpath = '//tbody[@class="table-group-divider"]/tr[1]/td[2]/a'
    wait_for_visibility_by_xpath(context.browser, flaw_link_xpath)
    context.browser.find_element(By.XPATH, flaw_link_xpath).click()


@then('I am able to view the flaw detail')
def step_impl(context):
    add_comment_button = '//button[contains(text(), "Comment")]'
    wait_for_visibility_by_xpath(context.browser, add_comment_button)
    context.browser.quit()


@when('I check the check-all checkbox of flaw table')
def step_impl(context):
    wait_for_visibility_by_xpath(context.browser, FLAW_CHECKALL)
    wait_for_visibility_by_xpath(context.browser, '//tbody[@class="table-group-divider"]/tr[1]')
    context.browser.find_element(By.XPATH, FLAW_CHECKALL).click()


@then('All flaws in flaw table are selected')
def step_impl(context):
    flaw_rows = context.browser.find_elements(By.XPATH, FLAW_ROW)
    flaw_checkboxes = context.browser.find_elements(By.CSS_SELECTOR, FLAW_CHECKBOX)
    assert len(flaw_rows) == len(flaw_checkboxes), 'Incorrect checkbox count'

    flaw_checked = [c for c in flaw_checkboxes if c.get_attribute('checked') == 'true']
    assert len(flaw_checked) == len(flaw_checkboxes), 'Incorrect check-all check result'
    context.browser.quit()


@given('The check-all checkbox of flaw list is checked')
def step_impl(context):
    context.execute_steps(u"""
        When I check the check-all checkbox of flaw table
    """)


@when('I uncheck the check-all checkbox')
def step_impl(context):
    context.browser.find_element(By.XPATH, FLAW_CHECKALL).click()


@then('No flaw in flaw table is selected')
def step_impl(context):
    flaw_checkboxes = context.browser.find_elements(By.CSS_SELECTOR, FLAW_CHECKBOX)
    flaw_checked = [c for c in flaw_checkboxes if c.get_attribute('checked') == 'true']
    assert len(flaw_checked) == 0, 'Incorrect check-all uncheck result'
    context.browser.quit()
