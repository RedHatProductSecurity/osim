from behave import *

from features.pages.home_page import HomePage
from features.pages.flaw_detail_page import FlawDetailPage

from features.utils import go_to_specific_flaw_detail_page, go_to_home_page


@when('I am searching the flaw with CVE-ID')
def step_impl(context):
    home_page = HomePage(context.browser)
    # Get the first flaw cve_id in the index page and use the cve_id to search
    context.value = home_page.get_field_value('cve_id')
    home_page.set_value("quickSearch", context.value)
    home_page.click_btn("quickSearchBtn")


@then('I will go to the flaw detail page with the CVE_ID')
def step_impl(context):
    detail_page = FlawDetailPage(context.browser)
    value = detail_page.get_input_value("cveid")
    assert value == context.value


@then('I search the flaw with text and I am able to view flaws list matching the search')
def step_impl(context):
    home_page = HomePage(context.browser)
    detail_page = FlawDetailPage(context.browser)

    go_to_specific_flaw_detail_page(context.browser)
    # get current flaw data
    value_list = list()
    for row in context.table:
        field = row['field']
        if field == "title":
            value = detail_page.get_input_value(field)
        else:
            value = detail_page.get_document_text_field(field)
        value_list.append(value)

    go_to_home_page(context.browser)

    for index, row in enumerate(context.table):
        field = row['field']
        home_page.clear_box("quickSearch")
        home_page.set_value("quickSearch", value_list[index])
        home_page.click_btn("quickSearchBtn")
        # Check the results
        home_page.click_btn("firstFlawLink")
        if field == "title":
            value = detail_page.get_input_value(field)
        else:
            value = detail_page.get_document_text_field(field)

        assert value_list[index] in value
