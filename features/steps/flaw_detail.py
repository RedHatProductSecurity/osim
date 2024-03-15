import time
from behave import when, then
from selenium.webdriver.common.by import By

from features.utils import (
    wait_for_visibility_by_locator,
    generate_random_text,
    go_to_first_flaw_detail_page
)
from features.pages.flaw_detail_page import FlawDetailPage


@when("I add a public comment to the flaw")
def step_impl(context):
    # Click the "Add public comment" button
    context.browser.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.add_comment_btn_exist()
    flaw_detail_page.click_btn('addCommentBtn')

    # Add the random public comment
    public_comment = generate_random_text()
    flaw_detail_page.set_comment_value(public_comment)
    # Save the comment
    context.browser.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    flaw_detail_page.click_btn('addCommentBtn')

    context.add_comment = public_comment


@then('A comment is added to the flaw')
def step_impl(context):
    # Check the comment saved successfully
    comment_xpath = f'//p["data-v-38eda711="][text()="{context.add_comment}"]'
    wait_for_visibility_by_locator(context.browser, By.XPATH, comment_xpath)
    context.browser.quit()


@when('I update the document text of {field} to {value}')
def step_impl(context, field, value):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('documentTextFieldsDropDownBtn')
    value = value.strip('"')
    flaw_detail_page.set_document_text_field(field, value)
    context.field_value = value
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then('The document text of {field} is updated')
def step_impl(context, field):
    go_to_first_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('documentTextFieldsDropDownBtn')
    v = flaw_detail_page.get_document_text_field(field)
    assert v == context.field_value, f"{field} value should be {context.field_value}, got {v}"
    context.browser.quit()


@when('I add an acknowledgment to the flaw')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('acknowledgmentsDropDownBtn')
    flaw_detail_page.click_add_acknowledgment_btn()
    l, r = generate_random_text(), generate_random_text()
    flaw_detail_page.set_acknowledgement(l, r)
    flaw_detail_page.click_save_acknowledgment_btn()
    flaw_detail_page.wait_msg('acknowledgmentSavedMsg')
    context.acknowledgement_value = f"{l} from {r}"


@then("A new acknowledgement added to the flaw")
def step_impl(context):
    go_to_first_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('acknowledgmentsDropDownBtn')
    flaw_detail_page.check_acknowledgement_exist(context.acknowledgement_value)
    context.browser.quit()


@when('I update the dropdown {field} value')
def step_impl(context, field):
    flaw_detail_page = FlawDetailPage(context.browser)
    v = flaw_detail_page.set_select_value(field)
    context.selected = v
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then('The dropdown {field} value is updated')
def step_impl(context, field):
    go_to_first_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    _, v = flaw_detail_page.get_select_value(field)
    assert context.selected == v, f"{field} value should be {context.selected}, got {v}"
    context.browser.quit()


@when("I edit the first acknowledgement in correct format")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('acknowledgmentsDropDownBtn')
    flaw_detail_page.click_first_ack_edit_btn()
    l, r = generate_random_text(), generate_random_text()
    flaw_detail_page.edit_first_ack(l, r)
    flaw_detail_page.click_first_ack_edit_btn()
    flaw_detail_page.click_save_acknowledgment_btn()
    flaw_detail_page.wait_msg('acknowledgmentUpdatedMsg')

    context.acknowledgement_value = f"{l} from {r}"


@then("Acknowledgement is changed")
def step_impl(context):
    go_to_first_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('acknowledgmentsDropDownBtn')
    flaw_detail_page.check_acknowledgement_exist(context.acknowledgement_value)
    context.browser.quit()


@when("I delete an acknowledgement from acknowledgement list")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('acknowledgmentsDropDownBtn')
    context.ack_value = flaw_detail_page.get_first_ack_value()
    flaw_detail_page.click_btn('firstAcknowledgmentDeleteBtn')
    flaw_detail_page.click_btn('confirmAcknowledgmentDeleteBtn')
    flaw_detail_page.wait_msg('acknowledgmentDeletedMsg')


@then("Acknowledgement is removed from flaw")
def step_impl(context):
    go_to_first_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('acknowledgmentsDropDownBtn')
    flaw_detail_page.check_acknowledgement_not_exist(context.ack_value)
    context.browser.quit()


@when("I update the random input {field}")
def step_impl(context, field):
    flaw_detail_page = FlawDetailPage(context.browser)
    value = generate_random_text()
    flaw_detail_page.set_input_field(field, value)
    context.field_value = value
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("The random input is updated")
def step_impl(context):
    go_to_first_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.check_value_exist(context.field_value)
    context.browser.quit()
