from behave import given

from features.utils import (
    check_flaw_list,
    go_to_flaw_detail_page,
    login_with_valid_account,
    set_bugzilla_api_key,
    set_jira_api_key
)


@given('I am an analyst AND I am logged into OSIM')
def step_impl(context):
    context.browser = login_with_valid_account()


@given('I set the bugzilla api key and jira api key')
def step_impl(context):
    set_bugzilla_api_key(context.browser)
    set_jira_api_key(context.browser)


@given('I am on the flaw list')
def step_impl(context):
    check_flaw_list(context.browser)


@given('I go to a flaw detail page')
def step_impl(context):
    go_to_flaw_detail_page(context.browser)
