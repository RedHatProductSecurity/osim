from behave import *

from features.pages.advanced_search_page import AdvancedSearchPage
from features.pages.flaw_detail_page import FlawDetailPage
from pages.home_page import HomePage


FIELD_FLAW_LIST = [
    "cve_id",
    "impact",
    "title",
    "workflow_state",
    "owner"
]
FIELD_IN_DETAIL = [
#    "uuid",
#    "cvss_scores__score",
#    "cvss_scores__vector",
#    "affects__ps_module",
#    "affects__ps_component",
#    "affects__trackers__ps_update_stream",
#    "acknowledgments__name",
    #"affects__trackers__errata__advisory_name",
#    "affects__trackers__external_system_id",
    "cwe_id",
    "source",
    "requires_cve_description",
    "cve_description",
    #"major_incident_state",
    "embargoed",
]


@when('I am searching for all flaws')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.click_btn("searchBtn")


@then('I get a list of all flaws')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.first_flaw_exist()


@when('I prepare the advance search keywords')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    fields = FIELD_FLAW_LIST + FIELD_IN_DETAIL
    context.fields_keywords = flaw_detail_page.get_valid_search_keywords_from_created_flaw(fields)

@then('I use keywords to search flaws and I am able to view flaws matching the search keywords')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    home_page = HomePage(context.browser)
    for field in context.fields_keywords:
        value = context.fields_keywords[field]
        advanced_search_page.click_button_with_js("closeSelBtn")
        advanced_search_page.select_field_and_value_to_search(field, value)
        advanced_search_page.click_btn("searchBtn")
        advanced_search_page.first_flaw_exist()
        # 1. Check if the first flaw matches the search condition
        if advanced_search_page.get_first_flaw_id():
            # Check the result in the flaw list page, no need to go into detail page
            if field in FIELD_FLAW_LIST:
                field_value = advanced_search_page.get_field_value_from_flawlist(field)
                assert value == field_value
            # Check the result in the flaw detail page
            elif field in FIELD_IN_DETAIL:
                advanced_search_page.go_to_first_flaw_detail()
                field_value = flaw_detail_page.get_value_from_detail_page(field)
                if field == "embargoed":
                    value = "No" if value == 'false' else 'Yes'
                assert value == field_value
                # Go back advance search to do the next feild search
                home_page.click_button_with_js("advancedSearchDropDownBtn")
                home_page.click_button_with_js("advancedSearchBtn")


        # 2. Check the flaws list count is correct. Since the data is sharing
        # currently, this check will be added when the test data is lockdown in
        # the future.


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
