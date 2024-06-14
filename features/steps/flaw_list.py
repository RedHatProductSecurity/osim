import time
from behave import given, when, then
from selenium.common.exceptions import NoSuchElementException

from features.pages.advanced_search_page import AdvancedSearchPage
from features.pages.flaw_detail_page import FlawDetailPage
from features.pages.home_page import HomePage
from features.utils import (
        is_sorted,
        skip_step_when_needed,
        go_to_advanced_search_page,
        go_to_home_page,
        go_to_specific_flaw_detail_page
)


@when('I click the link of a flaw')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.click_button_with_js("firstFlawLink")


@then('I am able to view the flaw detail')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.save_button_exist()


@when('I check the check-all checkbox of flaw table')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.click_flaw_check_all_checkbox()


@then('All flaws in flaw table are selected')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.check_is_all_flaw_selected()


# @given('The check-all checkbox of flaw list is checked')
# def step_impl(context):
#     context.execute_steps(u"""
#         When I check the check-all checkbox of flaw table
#     """)
#
#
# @when('I uncheck the check-all checkbox')
# def step_impl(context):
#     home_page = HomePage(context.browser)
#     home_page.click_flaw_check_all_checkbox()
#
#
# @then('No flaw in flaw table is selected')
# def step_impl(context):
#     home_page = HomePage(context.browser)
#     home_page.check_is_all_flaw_unselected()
#     context.browser.quit()
#
#
# @when("I select some flaws from flaw list and click 'Assign to Me'")
# def step_impl(context):
#     home_page = HomePage(context.browser)
#     # 1. Wait for loading flaw list and select flaws to bulk assign
#     context.links = home_page.select_bulk_flaws()
#     # 2. Click bulck action and assign to me buttons
#     home_page.bulk_assign()
#     # 3. Wait message "Flaw saved"
#     # The current bulk assign is not actually bulk update, thus
#     # there will be a 'Flaw saved' message for each selected flaw.
#     home_page.wait_msg('flawSavedMsg')
#
#
# @then("The owner of selected flaws is updated to me")
# def step_impl(context):
#     home_page = HomePage(context.browser)
#     home_page.check_bulk_assign(context.links[0])


@when("I click the field header of flaw list table")
def step_impl(context):
    home_page = HomePage(context.browser)
    sort_fields = ['id', 'impact', 'created', 'title', 'state', 'owner']
    value_dict = {}
    for field in sort_fields:
        fieldbtn = field + "Btn"
        home_page.click_btn(fieldbtn)
        time.sleep(3)
        desc_values = home_page.get_sort_field_values(field, sort_fields)
        home_page.click_btn(fieldbtn)
        time.sleep(3)
        asce_values = home_page.get_sort_field_values(field, sort_fields)
        value_dict[field] = {'desc': desc_values, 'asce': asce_values}
    context.value_dict = value_dict


@then("The flaw list is sorted by the field")
def step_impl(context):
    for k, v in context.value_dict.items():
        for order, values in v.items():
            assert is_sorted(values, order) is True, f"Sort by field {k} in {order} failed."


@when("I check 'Open Issues' checkbox of flaw list")
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.click_btn('openIssuesCheckbox')
    # Sort flaw list by state and check if any closed ones. States:
    # NEW, TRIAGE, PRE_SECONDARY_ASSESSMENT, SECONDARY_ASSESSMENT, DONE
    home_page.click_btn('stateBtn')
    time.sleep(3)
    home_page.click_btn('stateBtn')
    time.sleep(3)
    context.state = home_page.get_specified_cell_value(1, 7)


@then("Only open issues are listed in flaw list")
def step_impl(context):
    # Check the first state value in the asce sorted flaw list
    assert context.state != 'DONE', 'Closed issue(s) in open issues filter result'


@when("I set a default filter and back to flaw list")
def step_impl(context):
    go_to_advanced_search_page(context.browser)
    # Set a default search
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.select_field_and_value_to_search("impact", "LOW")
    context.default_filter = "Impact : LOW"
    advanced_search_page.click_btn("saveAsDefaultBtn")
    advanced_search_page.wait_msg("defaultFilterSavedMsg")

@then("The flaw list is filtered by the default filter")
def step_impl(context):
    go_to_home_page(context.browser)
    # Check the default search checkbox is checked
    home_page = HomePage(context.browser)
    assert home_page.is_checkbox_selected("defaultFilterCheckbox") is True
    home_page.check_value_exist(context.default_filter)
    # The flaw list is filtered by the default search
    home_page.first_flaw_exist()
    home_page.click_btn('stateBtn')
    home_page.first_flaw_exist()
    desc_state = home_page.get_specified_cell_value(1, 3)
    home_page.click_btn('stateBtn')
    home_page.first_flaw_exist()
    asce_state = home_page.get_specified_cell_value(1, 3)
    assert desc_state == asce_state, "Default search not work."


@given("I assgin an issue to me")
def step_impl(context):
    home_page = HomePage(context.browser)
    detail_page = FlawDetailPage(context.browser)
    # Get the current username
    context.user_name = home_page.userBtn.get_text()
    # Go to a specific flaw detail page
    go_to_specific_flaw_detail_page(context.browser)
    # Assign this flaw to the current user
    detail_page.set_input_field("owner", context.user_name)
    detail_page.click_btn('saveBtn')
    detail_page.wait_msg('flawSavedMsg')


@when("I check 'My Issues' checkbox in index page")
def step_impl(context):
    home_page = HomePage(context.browser)
    go_to_home_page(context.browser)
    home_page.firstFlaw.visibility_of_element_located()
    home_page.click_btn("myIssuesCheckbox")


@then("Only my issues are listed in flaw list")
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.firstFlaw.visibility_of_element_located()
    # Only firstFlaw.visibility_of_element_located can't work
    time.sleep(1)
    owner = home_page.get_field_value("owner")
    assert context.user_name == owner
