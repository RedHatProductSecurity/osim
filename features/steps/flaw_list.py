from behave import given, when, then
from selenium.common.exceptions import NoSuchElementException

from features.utils import skip_step_when_needed
from features.pages.flaw_detail_page import FlawDetailPage
from features.pages.home_page import HomePage


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
