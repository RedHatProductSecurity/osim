from behave import given, when, then
from selenium.webdriver.common.by import By

from features.steps.common_steps import *
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
