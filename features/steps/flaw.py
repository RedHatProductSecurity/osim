import time
from behave import given, when, then
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By

from features.locators import (
    COMMENT_BUTTON,
    FLAW_CHECKALL,
    FLAW_CHECKBOX,
    FLAW_LIST,
    FLAW_ROW,
    LOAD_MORE_FLAWS_BUTTON,
    USER_BUTTON
)
from features.utils import (
    wait_for_visibility_by_locator,
    skip_step_when_needed,
    generate_random_text
)


@given('I am on the flaw list')
def step_impl(context):
    wait_for_visibility_by_locator(context.browser, By.CSS_SELECTOR, FLAW_LIST)


@when('I click the link of a flaw')
def step_impl(context):
    flaw_link_xpath = '//tbody[@class="table-group-divider"]/tr[1]/td[2]/a'
    wait_for_visibility_by_locator(context.browser, By.XPATH, flaw_link_xpath)
    context.browser.find_element(By.XPATH, flaw_link_xpath).click()


@then('I am able to view the flaw detail')
def step_impl(context):
    wait_for_visibility_by_locator(context.browser, By.XPATH, COMMENT_BUTTON)
    context.browser.quit()


@when('I check the check-all checkbox of flaw table')
def step_impl(context):
    wait_for_visibility_by_locator(context.browser, By.XPATH, FLAW_CHECKALL)
    wait_for_visibility_by_locator(context.browser, By.XPATH, '//tbody[@class="table-group-divider"]/tr[1]')
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


@given('Not all flaws are loaded')
def step_impl(context):
    wait_for_visibility_by_locator(context.browser, By.CSS_SELECTOR, USER_BUTTON)
    try:
        context.browser.find_element(By.XPATH, LOAD_MORE_FLAWS_BUTTON)
    except NoSuchElementException:
        context.skip = True
        context.browser.quit()


@when("I click the button 'Load More Flaws'")
@skip_step_when_needed
def step_impl(context):
    # wait flaw data load
    wait_for_visibility_by_locator(context.browser, By.XPATH, '//tbody[@class="table-group-divider"]/tr[1]')
    rows = context.browser.find_elements(By.XPATH, FLAW_ROW)
    context.flaws_count = len(rows)
    btn = context.browser.find_element(By.XPATH, LOAD_MORE_FLAWS_BUTTON)
    context.browser.execute_script("arguments[0].click();", btn)


@then("More flaws are loaded into the list")
@skip_step_when_needed
def step_impl(context):
    # check if there is more flaws loaded
    wait_for_visibility_by_locator(
        context.browser, By.XPATH,
        f'//tbody[@class="table-group-divider"]/tr[{context.flaws_count*2+1}]')

    rows = context.browser.find_elements(By.XPATH, FLAW_ROW)
    assert len(rows) > context.flaws_count, \
        "No more flaws loaded after click the 'Load More Flaws' button"
    context.browser.quit()


@when("I add a public comment to the flaw")
def step_impl(context):
    # Click the "Add public comment" button
    context.browser.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    wait_for_visibility_by_locator(context.browser, By.XPATH, COMMENT_BUTTON)
    try:
        element=context.browser.find_element(By.XPATH, COMMENT_BUTTON)
    except NoSuchElementException:
        context.browser.quit()
    ActionChains(context.browser).move_to_element(element).click().perform()
    # Add the random public comment
    comment_text_windown = f"(//textarea[@class='form-control'])[5]"
    wait_for_visibility_by_locator(context.browser, By.XPATH, comment_text_windown)
    public_comment = generate_random_text()
    context.browser.find_element(By.XPATH,comment_text_windown).send_keys(public_comment)
    # Save the comment
    context.browser.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    try:
        element=context.browser.find_element(By.XPATH, COMMENT_BUTTON)
    except NoSuchElementException:
        context.browser.quit()
    ActionChains(context.browser).move_to_element(element).click().perform()
    context.add_comment = public_comment

@then('A comment is added to the flaw')
def step_impl(context):
    # Check the comment saved successfully
    comment_xpath = f'//p["data-v-38eda711="][text()="{context.add_comment}"]'
    wait_for_visibility_by_locator(context.browser, By.XPATH, comment_xpath)
    context.browser.quit()
