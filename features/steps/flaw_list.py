import time
from behave import given, when, then
from selenium.common.exceptions import NoSuchElementException

from features.utils import skip_step_when_needed
from features.pages.flaw_detail_page import FlawDetailPage
from features.pages.home_page import HomePage


def order_and_check_the_order(context, field, desc = True):
    home_page = HomePage(context.browser)
    fieldbtn = field + "Btn"
    # Order the flaw list
    home_page.click_btn(fieldbtn)
    # Wait for sorting and loading the sorted flaw list
    time.sleep(3)
    # Get three flaw from the flaw list and check the values' order
    value = home_page.get_three_flaws_field_value(field)
    if desc:
        assert value[0] >= value[1] >= value[2]
    else:
        assert value[0] <= value[1] <= value[2]


@when('I click the link of a flaw')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.click_btn("firstFlawLink")


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


@when("I select some flaws from flaw list and click 'Assign to Me'")
def step_impl(context):
    home_page = HomePage(context.browser)
    # 1. Wait for loading flaw list and select flaws to bulk assign
    context.links = home_page.select_bulk_flaws()
    # 2. Click bulck action and assign to me buttons
    home_page.bulk_assign()
    # 3. Wait message "Flaw saved"
    # The current bulk assign is not actually bulk update, thus
    # there will be a 'Flaw saved' message for each selected flaw.
    home_page.wait_msg('flawSavedMsg')


@then("The owner of selected flaws is updated to me")
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.check_bulk_assign(context.links[0])
    context.browser.quit()

@then("I click the field of flaw list to order the flaw list, the flaw list is sorted")
def step_impl(context):
    for row in context.table:
        field = row["field"]
        order_and_check_the_order(context, field, desc = True )
        order_and_check_the_order(context, field, desc = False)
    context.browser.quit()