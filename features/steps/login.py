from behave import then, when

from features.pages.home_page import HomePage
from features.pages.login_page import LoginPage


@when('I click the Logout button from the account dropdown')
def step_impl(context):
    home_page = HomePage(context.browser)
    home_page.logout()


@then('I log out and am redirected to the login page')
def step_impl(context):
    login_page = LoginPage(context.browser)
    login_page.loginBtn.visibility_of_element_located()
