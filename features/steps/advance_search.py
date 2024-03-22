from behave import *

from features.pages.home_page import HomePage
from features.pages.advanced_search_page import AdvancedSearchPage
from features.pages.flaw_detail_page import FlawDetailPage
FIELD_FLAW_LIST = ["uuid", "cve_id", "impact", "source", "title", "workflow_state", "owner"]
FIELD_IN_DATABASE = ["type", "affects__ps_component", "affects__ps_module",
                    "affects__trackers__ps_update_stream",
                    "affects__trackers__external_system_id",
                    "affects__trackers__errata__advisory_name",
                    "component", "cwe_id", "cvss_scores__vector",
                    "cvss_scores__score", "team_id", "acknowledgments__name"]


@when('I am searching for all flaws')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.click_search_btn()


@then('I get a list of all flaws')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.first_flaw_exist()
    context.browser.quit()


@then('I select the field and value to search flaws and I am able to view flaws matching the search')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    for row in context.table:
        field=row["field"]
        value=row["value"]
        advanced_search_page.clear_search_select()
        advanced_search_page.select_field_and_value_to_search(field, value)
        advanced_search_page.click_search_btn()
        advanced_search_page.first_flaw_exist()
        # 1. Check if the first flaw matches the search condition
        if advanced_search_page.get_first_flaw_id():
        #Check the result in the flaw list page, no need to go into detail page
            if field in FIELD_FLAW_LIST:
                if field == "uuid":
                    field_value = advanced_search_page.get_first_flaw_uuid()
                else:
                    field_value = advanced_search_page.get_field_value_from_flawlist(field)
            elif field in FIELD_IN_DATABASE:
                if field == "cvss_scores__vector":
                    field = "cvss3"
                if field == "cvss_scores__score":
                    field = "cvss3_score"
                field_value = advanced_search_page.get_value_from_osidb(field)
                if field == "cvss3_score":
                    field_value = str(field_value)
            #Check the result in the flaw detail page.
            else:
                advanced_search_page.go_to_first_flaw_detail()
                advanced_search_page.close_setting_keys_window()
                flaw_detail = FlawDetailPage(context.browser)
                if field == "embargoed":
                    field_value = flaw_detail.get_text_value(field)
                    # Embargoed is true, the value is Yes
                    if value == "true":
                        value = "Yes"
                    elif value == "false":
                        value = "No"
        assert value in field_value
        # 2. Check the flaws list count is correct. Since the data is sharing
        # currently, this check will be added when the test data is lockdown in
        # the future.
    context.browser.quit()

@when('I am searching flaws with two fields and two values')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.select_field_and_value_to_search("source", "CUSTOMER")
    advanced_search_page.select_second_field_and_value_to_search("impact", "LOW")
    advanced_search_page.click_search_btn()

@then('I am able to view flaws matching the search with two selected fileds')
def step_impl(context):
    advanced_search_page = AdvancedSearchPage(context.browser)
    advanced_search_page.first_flaw_exist()
    field_value = advanced_search_page.get_field_value_from_flawlist("source")
    assert "CUSTOMER" == field_value
    field_value = advanced_search_page.get_field_value_from_flawlist("impact")
    assert "LOW" == field_value
    context.browser.quit()