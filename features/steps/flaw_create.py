from datetime import datetime

from behave import *

from features.pages.advanced_search_page import AdvancedSearchPage
from features.pages.flaw_detail_page import FlawDetailPage
from features.utils import (
    generate_cve,
    generate_cwe,
    generate_random_text,
    go_to_advanced_search_page
)


MAX_RETRY = 10


def create_flaw_with_valid_data(context, embargoed=False, with_optional=False):
    flaw_page = FlawDetailPage(context.browser)
    context.cve_id = generate_cve()
    description = generate_random_text()
    reported_date = datetime.today().strftime("%Y%m%d")
    flaw_page.set_input_field('title', generate_random_text())
    flaw_page.set_input_field('component', 'autocomponent')
    flaw_page.set_input_field('cveid', context.cve_id)
    flaw_page.set_input_field('reportedDate', reported_date)
    flaw_page.set_select_value('source')
    flaw_page.set_select_value('impact')
    if embargoed:
        flaw_page.click_btn("embargeodCheckBox")
    else:
        flaw_page.set_input_field('publicDate', reported_date)
    flaw_page.set_document_text_field('comment#0', generate_random_text())
    if with_optional:
        flaw_page.set_input_field('cweid', generate_cwe())
        flaw_page.set_document_text_field('description', generate_random_text())
        flaw_page.set_document_text_field('statement', generate_random_text())
    count = 0
    while count < MAX_RETRY:
        flaw_page.click_btn('createNewFlawBtn')
        try:
            flaw_page.wait_msg('flawCreatedMsg')
        except Exception:
            context.cve_id = generate_cve()
            flaw_page.set_input_field('cveid', context.cve_id)
            count += 1
        else:
            break


def check_created_flaw_exist(context, embargoed=False):
    go_to_advanced_search_page(context.browser)
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.select_field_and_value_to_search("cve_id", context.cve_id)
    advanced_search_page.click_search_btn()
    advanced_search_page.first_flaw_exist()
    if embargoed:
        advanced_search_page.first_flaw_embargoed_flag_exist()


@given('I open the flaw create page')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.click_btn('createFlawLink')


@when('I create flaw with valid mandatory data')
def step_impl(context):
    create_flaw_with_valid_data(context)


@then('A new flaw is created')
def step_impl(context):
    check_created_flaw_exist(context)
    context.browser.quit()


@when('I create new embargoed flaw with valid data')
def step_impl(context):
    create_flaw_with_valid_data(context, embargoed=True)


@then('The flaw is created and marked as an embargoed flaw')
def step_impl(context):
    check_created_flaw_exist(context, embargoed=True)
    context.browser.quit()

@when('I create flaw with valid data including optional fields')
def step_impl(context):
    create_flaw_with_valid_data(context, with_optional=True)
