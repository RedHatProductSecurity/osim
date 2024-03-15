from behave import when, then

from features.pages.home_page import HomePage
from features.pages.advanced_search_page import AdvancedSearchPage


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
