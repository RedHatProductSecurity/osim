import time
from behave import given, when, then
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By

from features.utils import (
    wait_for_visibility_by_locator,
    skip_step_when_needed,
    generate_random_text,
    go_to_flaw_detail_page
)
from features.pages.flaw_detail_page import FlawDetailPage
from features.pages.home_page import HomePage
from features.pages.advanced_search_page import AdvancedSearchPage


@given('I am on the flaw list')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.flaw_list_exist()


@when('I click the link of a flaw')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.click_first_flaw_link()


@then('I am able to view the flaw detail')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.add_comment_btn_exist()
    context.browser.quit()


@when('I check the check-all checkbox of flaw table')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.click_flaw_check_all_checkbox()


@then('All flaws in flaw table are selected')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.check_is_all_flaw_selected()
    context.browser.quit()


@given('The check-all checkbox of flaw list is checked')
def step_impl(context):
    context.execute_steps(u"""
        When I check the check-all checkbox of flaw table
    """)


@when('I uncheck the check-all checkbox')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.click_flaw_check_all_checkbox()


@then('No flaw in flaw table is selected')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.check_is_all_flaw_unselected()
    context.browser.quit()


@given('Not all flaws are loaded')
def step_impl(context):
    home_page = HomePage(context.browser)
    try:
        home_page.check_is_all_flaw_loaded()
    except NoSuchElementException:
        context.skip = True
        context.browser.quit()


@when("I click the button 'Load More Flaws'")
@skip_step_when_needed
def step_impl(context):
    home_page = HomePage(context.browser)
    context.flaws_count = home_page.click_load_more_flaws_btn()


@then("More flaws are loaded into the list")
@skip_step_when_needed
def step_impl(context):
    # check if there is more flaws loaded
    home_page = HomePage(context.browser)
    home_page.is_more_flaw_loaded(context.flaws_count)
    context.browser.quit()


@when("I add a public comment to the flaw")
def step_impl(context):
    # Click the "Add public comment" button
    context.browser.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.add_comment_btn_exist()
    flaw_detail_page.click_add_comment_btn()

    # Add the random public comment
    public_comment = generate_random_text()
    flaw_detail_page.set_comment_value(public_comment)
    # Save the comment
    context.browser.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    flaw_detail_page.click_add_comment_btn()

    context.add_comment = public_comment


@then('A comment is added to the flaw')
def step_impl(context):
    # Check the comment saved successfully
    comment_xpath = f'//p["data-v-38eda711="][text()="{context.add_comment}"]'
    wait_for_visibility_by_locator(context.browser, By.XPATH, comment_xpath)
    context.browser.quit()


@when('I am searching for all flaws')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.click_advanced_search_drop_down_btn()
    home_page.click_advanced_search_btn()

    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.click_search_btn()


@then('I get a list of all flaws')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.first_flaw_exist()
    context.browser.quit()


@given('I set the {field} value to {value}')
def step_impl(context, field, value):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_document_text_fields_button()
    value = value.strip('"')
    flaw_detail_page.set_text_field(field, value)
    context.field_value = value
    flaw_detail_page.click_save_btn()
    flaw_detail_page.wait_flaw_saved_msg()


@then('The {field} value is changed')
def step_impl(context, field):
    go_to_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_document_text_fields_button()
    v = flaw_detail_page.get_text_field(field)
    assert v == context.field_value, f"{field} value should be {context.field_value}, got {v}"
    context.browser.quit()
