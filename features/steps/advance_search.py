import time
from pprint import pprint

from behave import *

from features.pages.advanced_search_page import AdvancedSearchPage
from features.pages.flaw_detail_page import FlawDetailPage
from features.common_utils import get_data_from_tmp_data_file
from features.steps.common_steps import go_to_specific_flaw_detail_page
from features.constants import EMBARGOED_FLAW_UUID_KEY
from features.utils import go_to_advanced_search_page, is_sorted

EMPTY_FIELDS = [
    "cve_description",
    "cve_id",
    "cvss_scores__score",
    "mitigation",
    "owner",
    "statement"
]


@when('I am searching for all flaws')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.click_btn("searchBtn")


@then('I get a list of all flaws')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.first_flaw_exist()


@given("I add lacking data to the flaw which for later search")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)

    # add cvssV3 field
    flaw_detail_page = FlawDetailPage(context.browser)
    if not flaw_detail_page.get_cvssV3_score():
        flaw_detail_page.set_cvssV3_field()
        flaw_detail_page.click_btn('saveBtn')
        flaw_detail_page.wait_msg('flawSavedMsg')
        flaw_detail_page.wait_msg("cvssV3SavedMsg")

    # add an acknowledgement
    v = flaw_detail_page.acknowledgmentCountLabel.get_text()
    reference_count = int(v.split(": ")[1])
    if reference_count == 0:
        flaw_detail_page.click_acknowledgments_dropdown_btn()
        context.execute_steps('When I add an acknowledgment to the flaw')


@when('I prepare the advance search keywords')
def step_impl(context):
    # get all needed value for search
    flaw_detail_page = FlawDetailPage(context.browser)
    context.fields_keywords = flaw_detail_page.get_valid_search_keywords_from_created_flaw()


@then('I use keywords to search flaws and I am able to view flaws matching the search keywords')
def step_impl(context):
    # use all search value to search the flaw, check the result
    advanced_search_page = AdvancedSearchPage(context.browser)
    # search flaw using prefetched value
    context.fields_keywords["uuid"] = get_data_from_tmp_data_file(EMBARGOED_FLAW_UUID_KEY)
    for field in context.fields_keywords:
        value = context.fields_keywords[field]
        advanced_search_page.click_button_with_js("closeSelectRowBtn")
        advanced_search_page.select_field_and_value_to_search(field, value)
        advanced_search_page.click_btn("searchBtn")
        advanced_search_page.first_flaw_exist()


@when('I am searching flaws with two fields and two values')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.select_field_and_value_to_search("workflow_state", "NEW")
    advanced_search_page.select_second_field_and_value_to_search("impact", "LOW")
    advanced_search_page.click_btn("searchBtn")


@then('I am able to view flaws matching the search with two selected fileds')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.first_flaw_exist()
    field_value = advanced_search_page.get_field_value_from_flawlist("workflow_state")
    assert field_value == "NEW"
    field_value = advanced_search_page.get_field_value_from_flawlist("impact")
    assert field_value == "LOW"


@then('I am able to search flaws with empty or nonempty value')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    for field in EMPTY_FIELDS:
        advanced_search_page.selectKeyList.click_button()
        advanced_search_page.selectKeyList.select_element_by_value(field)

        # Check search result with empty value
        advanced_search_page.click_btn("emptyBtn")
        advanced_search_page.click_btn("searchBtn")
        advanced_search_page.first_flaw_exist()
        if field in ['cve_id', 'owner']:
            value = advanced_search_page.get_field_value_from_flawlist(field)
            is_correct = not value.startswith('CVE-') if field == 'cve_id' else value == ''
            assert is_correct is True
        else:
            # cve_description, cvss_scores__score, mitigation, statement
            advanced_search_page.go_to_first_flaw_detail()
            time.sleep(1)
            flaw_page = FlawDetailPage(context.browser)
            if field == 'cvss_scores__score':
                value = flaw_page.get_cvssV3_score()
            else:
                text_field = 'description' if field == 'cve_description' else field
                value = flaw_page.get_document_text_field(text_field)
            assert value == ''
            # Back to advanced search page
            go_to_advanced_search_page(context.browser)
            advanced_search_page.selectKeyList.click_button()
            advanced_search_page.selectKeyList.select_element_by_value(field)

        # Check search result with nonempty value
        advanced_search_page.click_btn("nonemptyBtn")
        advanced_search_page.click_btn("searchBtn")
        advanced_search_page.first_flaw_exist()
        if field in ['cve_id', 'owner']:
            value = advanced_search_page.get_field_value_from_flawlist(field)
            is_correct = value.startswith('CVE-') if field == 'cve_id' else value != ''
            assert is_correct is True
        else:
            advanced_search_page.go_to_first_flaw_detail()
            time.sleep(1)
            flaw_page = FlawDetailPage(context.browser)
            if field == 'cvss_scores__score':
                value = flaw_page.get_cvssV3_score()
            else:
                text_field = 'description' if field == 'cve_description' else field
                value = flaw_page.get_document_text_field(text_field)
            assert value != ''
            go_to_advanced_search_page(context.browser)


@then('I am able to search flaws with single query filter')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    filter_examples = {
       'impact': 'impact in ("LOW", "MODERATE")',
       'workflow_state': 'workflow_state = "New"',
       'title': 'title startswith "RHEL"',
       'created': 'created_dt >= "2017-01-01"'
    }
    for k, v in filter_examples.items():
        advanced_search_page.set_query_filter(v)
        advanced_search_page.click_btn("searchBtn")
        advanced_search_page.first_flaw_exist()
        value = advanced_search_page.get_field_value_from_flawlist(k)
        if k == 'workflow_state':
            assert value == "NEW"
        elif k == 'impact':
            assert value in ("LOW", "MODERATE")
        elif k == 'title':
            assert value.startswith('RHEL')
        elif k == 'created':
            assert value >= "2017-01-01"
        else:
            continue


@then('I am able to search flaws with multiple conditions in query filter')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    filter_str = '(workflow_state = "NEW" or source = "NVD") and created_dt > "2017-01-01"',
    advanced_search_page.set_query_filter(filter_str)
    advanced_search_page.click_btn("searchBtn")
    advanced_search_page.first_flaw_exist()

    advanced_search_page.go_to_first_flaw_detail()
    flaw_page = FlawDetailPage(context.browser)
    source = flaw_page.get_value_from_detail_page('source')
    workflow_state = flaw_page.get_field_value_using_relative_locator(
            'stateText', "//span[@class='form-control rounded-0']")
    created_dt = flaw_page.get_input_value('reportedDate')
    assert source == 'NVD' or workflow_state == 'NEW'
    assert created_dt > "2017-01-01"


@when('I sort search result by sortable field')
def step_impl(context):
    context.execute_steps("When I click the field header of flaw list table")


@then('I got sorted search result')
def step_impl(context):
    context.execute_steps("Then The flaw list is sorted by the field")


@then('I am able to search flaws with osidb related models in query filter')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_page = FlawDetailPage(context.browser)
    search_data = flaw_page.get_valid_search_keywords_from_created_flaw()

    # Search with acknowledgment name or affect ps_component
    filter_dict = {
        'acknowledgments.name': search_data['acknowledgments__name'],
        'affects.ps_component': search_data["affects__ps_component"],
    }
    advanced_search_page = AdvancedSearchPage(context.browser)
    for k, v in filter_dict.items():
        go_to_advanced_search_page(context.browser)
        advanced_search_page.set_query_filter(f'{k} = "{v}"')
        advanced_search_page.click_btn("searchBtn")
        advanced_search_page.first_flaw_exist()
        advanced_search_page.go_to_first_flaw_detail()
        if 'acknowledgments' in k:
            flaw_page.click_acknowledgments_dropdown_btn()
        flaw_page.check_text_exist(v)


@when('I sort search result by extended sortable field')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    # click created order twice, let result not sort by table column
    advanced_search_page.click_btn("createdBtn")
    advanced_search_page.click_btn('createdBtn')
    advanced_search_page.first_flaw_exist()

    select_value_list = ["cvss_scores__score", "cwe_id", "major_incident_state", "source"]
    # select_value_list = ["cvss_scores__score", "major_incident_state", "source"]
    result_dict = {}

    # ascending
    for select_value in select_value_list:
        advanced_search_page.extendSortSelect.select_element_by_value(select_value)
        time.sleep(3)
        res = advanced_search_page.get_specified_field_search_result(select_value)
        result_dict[select_value] = {"asce": res}

    advanced_search_page.extendSortOrderBtn.click_button()
    # descending
    for select_value in select_value_list:
        advanced_search_page.extendSortSelect.select_element_by_value(select_value)
        time.sleep(3)
        res = advanced_search_page.get_specified_field_search_result(select_value)
        result_dict[select_value]["desc"] = res

    context.result_dict = result_dict
    pprint(context.result_dict, indent=4)


@then('I got search result sorted by extended field')
def step_impl(context):
    for k, v in context.result_dict.items():
        for order, values in v.items():
            assert is_sorted(values, order) is True, f"Sort by field {k} in {order} failed. Get: {values}"


@then('I am able to search flaws with both query filter and selected field')
def step_impl(context):
    # get flaw data for search
    go_to_specific_flaw_detail_page(context.browser)
    flaw_page = FlawDetailPage(context.browser)
    search_data = flaw_page.get_valid_search_keywords_from_created_flaw()
    go_to_advanced_search_page(context.browser)

    advanced_search_page = AdvancedSearchPage(context.browser)
    # set query in query filter
    advanced_search_page.set_query_filter(f'cve_id = "{search_data["cve_id"]}"')
    # set query in selected field
    advanced_search_page.select_field_and_value_to_search("title", search_data['title'])
    advanced_search_page.click_btn("searchBtn")
    advanced_search_page.first_flaw_exist()
