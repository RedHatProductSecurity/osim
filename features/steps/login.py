from behave import then, when

from features.pages.home_page import HomePage
from features.pages.login_page import LoginPage


@then('I am able to log into OSIM')
def step_impl(context):
    """
    If user login success, the user could see logout.
    """
    home_page = LoginPage(context.browser)
    home_page.check_login()


@when('I click the Logout button from the account dropdown')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.logout()


@then('I log out and am redirected to the login page')
def step_impl(context):
    home_page = LoginPage(context.browser)
    home_page.check_login()
