import os
from datetime import datetime, timezone
from behave import *

from features.pages.advanced_search_page import AdvancedSearchPage
from features.pages.flaw_create_page import FlawCreatePage
from features.pages.flaw_detail_page import FlawDetailPage
from features.utils import (
    generate_cve,
    generate_cwe,
    generate_random_text,
    go_to_advanced_search_page,
    go_to_specific_flaw_detail_page
)
from features.common_utils import set_flaw_id_to_file


MAX_RETRY = 5


def create_flaw_with_valid_data(context, embargoed=False, with_optional=False):
    flaw_create_page = FlawCreatePage(context.browser)
    context.title = generate_random_text()
    flaw_create_page.set_input_field('title', context.title)
    flaw_create_page.set_components_field(generate_random_text())
    flaw_create_page.set_select_value('impact')
    flaw_create_page.set_select_value('source')
    public_date = datetime.today().replace(tzinfo=timezone.utc).strftime("%Y%m%d0000")
    if embargoed:
        flaw_create_page.click_btn("embargeodCheckBox")
    else:
        flaw_create_page.set_input_field('publicDate', public_date)
    flaw_create_page.set_document_text_field('comment#0', generate_random_text())

    if with_optional:
        context.cve_id = generate_cve()
        flaw_create_page.set_input_field('cveid', context.cve_id)
        flaw_create_page.set_input_field('cweid', generate_cwe())
        flaw_create_page.set_document_text_field('description', generate_random_text())
        flaw_create_page.set_document_text_field('statement', generate_random_text())
        count = 0
        while count < MAX_RETRY:
            flaw_create_page.click_btn('createNewFlawBtn')
            try:
                flaw_create_page.wait_msg('flawCreatedMsg')
            except Exception:
                context.cve_id = generate_cve()
                flaw_create_page.set_input_field('cveid', context.cve_id)
                count += 1
            else:
                break
    else:
        flaw_create_page.click_btn('createNewFlawBtn')
        flaw_create_page.wait_msg('flawCreatedMsg')


def check_created_flaw_exist(context, embargoed=False):
    go_to_advanced_search_page(context.browser)
    advanced_search_page = AdvancedSearchPage(context.browser)
    if hasattr(context, 'cve_id'):
        advanced_search_page.select_field_and_value_to_search("cve_id", context.cve_id)
    else:
        advanced_search_page.select_field_and_value_to_search("title", context.title)
    advanced_search_page.click_btn("searchBtn")
    advanced_search_page.first_flaw_exist()
    if embargoed:
        advanced_search_page.first_flaw_embargoed_flag_exist()
    return advanced_search_page.get_first_flaw_id()


@when('I open the flaw create page')
def step_impl(context):
    flaw_page = FlawCreatePage(context.browser)
    flaw_page.click_btn('createFlawLink')


@when('I create flaw with valid mandatory data')
def step_impl(context):
    create_flaw_with_valid_data(context)


@then('A new flaw is created')
def step_impl(context):
    os.environ["FLAW_ID"] = check_created_flaw_exist(context)
    # check validation alert that flaw has no affect
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.go_to_first_flaw_detail()
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.click_btn("alertDropdownBtn")
    flaw_page.click_btn("alertFlawDropdownBtn")
    flaw_page.flawWithoutAffectErrorText.visibility_of_element_located()
    set_flaw_id_to_file()


@when("I add a CVE ID to a flaw without a CVE")
def step_impl(context):
    go_to_advanced_search_page(context.browser)
    advanced_search_page = AdvancedSearchPage(context.browser)
    flaw_id = os.environ["FLAW_ID"]
    if flaw_id.startswith('CVE-'):
        advanced_search_page.select_field_and_value_to_search(
            "cve_id", flaw_id)
    else:
        advanced_search_page.select_field_and_value_to_search(
            "uuid", flaw_id)
    advanced_search_page.click_btn("searchBtn")
    advanced_search_page.first_flaw_exist()
    advanced_search_page.go_to_first_flaw_detail()

    flaw_create_page = FlawCreatePage(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    context.cve_id = generate_cve()
    flaw_create_page.set_input_field('cveid', context.cve_id)
    count = 0
    while count < MAX_RETRY:
        flaw_detail_page.click_btn('saveBtn')
        try:
            flaw_detail_page.wait_msg('flawSavedMsg')
        except Exception:
            context.cve_id = generate_cve()
            flaw_create_page.set_input_field('cveid', context.cve_id)
            count += 1
        else:
            os.environ["FLAW_ID"] = context.cve_id
            break


@then("The flaw CVE ID is saved")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    set_flaw_id_to_file()


@when('I create new embargoed flaw with valid data')
def step_impl(context):
    create_flaw_with_valid_data(context, embargoed=True)


@then('The flaw is created and marked as an embargoed flaw')
def step_impl(context):
    os.environ["FLAW_ID"] = check_created_flaw_exist(context, embargoed=True)


@when('I create flaw with valid data including optional fields')
def step_impl(context):
    create_flaw_with_valid_data(context, with_optional=True)
