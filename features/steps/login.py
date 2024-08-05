from behave import then, when

from features.pages.home_page import HomePage
from features.pages.login_page import LoginPage
from features.utils import login_with_valid_account


@given('I am an analyst AND want to log into OSIM')
def step_impl(context):
    context.browser = login_with_valid_account()


@then('I am able to log into OSIM')
def step_impl(context):
    """
    If user login success, the user could see user button.
    """
    home_page = HomePage(context.browser)
    home_page.userBtn.visibility_of_element_located()


@when('I click the Logout button from the account dropdown')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.logout()


@then('I log out and am redirected to the login page')
def step_impl(context):
    login_page = LoginPage(context.browser)
    login_page.loginBtn.visibility_of_element_located()
