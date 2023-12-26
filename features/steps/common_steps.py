from behave import given
from features.utils import login_with_valid_account


@given('I am an analyst AND I am logged into OSIM')
def step_impl(context):
    context.browser = login_with_valid_account()
