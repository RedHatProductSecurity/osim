from datetime import datetime
from behave import *

from features.utils import (
    generate_cve,
    generate_random_text,
    go_to_advanced_search_page
)
from features.pages.flaw_detail_page import FlawDetailPage
from features.pages.advanced_search_page import AdvancedSearchPage


MAX_RETRY = 10

def create_flaw_with_valid_data(context, type):
    flaw_page = FlawDetailPage(context.browser)
    context.cve_id = generate_cve()
    description = generate_random_text()
    reported_date = datetime.today().strftime("%Y%m%d")
    flaw_page.set_input_field('title', generate_random_text())
    flaw_page.set_input_field('component', 'autocomponent')
    flaw_page.set_input_field('cveid', context.cve_id)
    flaw_page.set_select_value('impact')
    flaw_page.set_select_value('source')
    flaw_page.set_input_field('reportedDate', reported_date)
    if type == "unembargeod":
        flaw_page.set_input_field('publicDate', reported_date)
    else:
        flaw_page.click_btn("embargeodCheckBox")
    flaw_page.click_btn('documentTextFieldsDropDownBtn')
    flaw_page.set_document_text_field('description', description)
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

def check_created_flaw_exist(context, type):
    go_to_advanced_search_page(context.browser)
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.select_field_and_value_to_search("cve_id", context.cve_id)
    advanced_search_page.click_search_btn()
    advanced_search_page.first_flaw_exist()
    if type == "embargoed":
        advanced_search_page.first_flaw_embargoed_flag_exist()


@given('I open the flaw create page')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.click_btn('createFlawLink')


@when('I fill flaw form with valid data and click create new flaw')
def step_impl(context):
    create_flaw_with_valid_data(context, "unembargoed")

@then('A new flaw is created')
def step_impl(context):
    check_created_flaw_exist(context, "unembargoed")
    context.browser.quit()

@when('I create new embargoed flaw with valid data')
def step_impl(context):
    create_flaw_with_valid_data(context, "embargoed")

@then('The flaw is created and marked as an embargoed flaw')
def step_impl(context):
    check_created_flaw_exist(context, "embargoed")
    context.browser.quit()