import time
from behave import when, then
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from features.utils import wait_for_visibility_by_xpath
from features.constants import (
    FILTER_FLAWS,
    LOAD_MORE_FLAWS_BUTTON
    )

# The following constants are related to flaw filter that should be updated
# according to the imported test database in the future
FLAW_TITLE_TEXT = 'test1 security flaw bug'
FLAW_TITLE_TEXT_XPATH = f'//td[6][contains(text(), "{FLAW_TITLE_TEXT}")]'
COUNT_FLAW_TITLE_TEXT = 1 # count the flaws that contain same text in title

FLAW_CVE_ID = 'CVE-2024-1337'
FLAW_CVE_ID_XPATH = f'//a[contains(text(), "{FLAW_CVE_ID}")]'
COUNT_FLAW_CVE_ID = 1

FLAW_STATE = 'NEW'
FLAW_STATE_XPATH = '//td[7][text()="NEW"]'
COUNT_FLAWS_SAME_STATE = 120 

FLAW_SOURCE = 'CUSTOMER'
FLAW_SOURCE_XPATH = '//td[4][text()="CUSTOMER"]'
COUNT_FLAWS_SAME_SOURCE = 35

def when_step_mathcher(context, text):
    wait_for_visibility_by_xpath(context.browser, FILTER_FLAWS)
    try:
        input_element = context.browser.find_element(By.XPATH, FILTER_FLAWS)
        input_element.send_keys(text)
    except NoSuchElementException:
        context.browser.quit()

def then_step_mathcher(context, flaws_list, flaws_count):
    wait_for_visibility_by_xpath(context.browser, flaws_list)
    current_len = len(context.browser.find_elements(By.XPATH, flaws_list))
    while True:
        btn = context.browser.find_element(By.XPATH, LOAD_MORE_FLAWS_BUTTON)
        context.browser.execute_script("arguments[0].click();", btn)
        time.sleep(3)
        load_more_flaw_count = len(context.browser.find_elements(By.XPATH, flaws_list))
        if load_more_flaw_count == current_len:
           break
        else:
            current_len = load_more_flaw_count
    assert current_len == int(flaws_count)
    context.browser.quit()

@when('I input a filter keyword "title" in the "Filter Issues/Flaws" input box')
def step_impl(context, text=FLAW_TITLE_TEXT):
    when_step_mathcher(context, text)

@then('I am able to view flaws matching "title keyword" and the flaws "count" is correct')
def step_impl(context, flaws_list=FLAW_TITLE_TEXT_XPATH, flaws_count=COUNT_FLAW_TITLE_TEXT):
    then_step_mathcher(context, flaws_list, flaws_count)


@when('I input a filter keyword "cve_id" in the "Filter Issues/Flaws" input box')
def step_impl(context, text=FLAW_CVE_ID):
    when_step_mathcher(context, text)

@then('I am able to view flaws matching "cve_id" and the flaws "count" is correct')
def step_impl(context, flaws_list=FLAW_CVE_ID_XPATH, flaws_count=COUNT_FLAW_CVE_ID):
    then_step_mathcher(context, flaws_list, flaws_count)

@when('I input a filter keyword "state" in the "Filter Issues/Flaws" input box')
def step_impl(context, text=FLAW_STATE):
    when_step_mathcher(context, text)

@then('I am able to view flaws matching "state" and the flaws "count" is correct')
def step_impl(context, flaws_list=FLAW_STATE_XPATH, flaws_count=COUNT_FLAWS_SAME_STATE):
    then_step_mathcher(context, flaws_list, flaws_count)

@when('I input a filter keyword "source" in the "Filter Issues/Flaws" input box')
def step_impl(context, text=FLAW_SOURCE):
    when_step_mathcher(context, text)

@then('I am able to view flaws matching "source" and the flaws "count" is correct')
def step_impl(context, flaws_list=FLAW_SOURCE_XPATH, flaws_count=COUNT_FLAWS_SAME_SOURCE):
    then_step_mathcher(context, flaws_list, flaws_count)