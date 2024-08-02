import time

from behave import given

from features.utils import (
    osim_home_page,
    login_with_valid_account,
    set_bugzilla_api_key,
    set_jira_api_key,
    go_to_home_page,
    go_to_specific_flaw_detail_page,
    go_to_advanced_search_page
)

@given('I am an analyst AND want to log into OSIM')
def step_impl(context):
    context.browser = osim_home_page()

@given('I am an analyst AND I am logged into OSIM')
def step_impl(context):
    context.browser = login_with_valid_account()


@given('I set the bugzilla api key and jira api key')
def step_impl(context):
    set_bugzilla_api_key(context.browser)
    set_jira_api_key(context.browser)
    # wait osim getting username from jira
    time.sleep(2)


@given('I am on the flaw list')
def step_impl(context):
    go_to_home_page(context.browser)


@given('I go to a public flaw detail page')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)


@given('I go to an embargoed flaw detail page')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)


@given('I go to the advanced search page')
def step_impl(context):
    go_to_advanced_search_page(context.browser)
