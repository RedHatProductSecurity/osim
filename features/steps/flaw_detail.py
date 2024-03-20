import re
import rstr
import time
from behave import when, then
from selenium.webdriver.common.by import By

from features.utils import (
    wait_for_visibility_by_locator,
    generate_random_text,
    go_to_first_flaw_detail_page
)
from features.pages.flaw_detail_page import FlawDetailPage


# From: https://github.com/RedHatProductSecurity/osidb/blob/master/osidb/validators.py#L13
CVE_RE_STR = re.compile(r"CVE-(?:1999|2\d{3})-(?!0{4})(?:0\d{3}|[1-9]\d{3,})")
CWE_RE_STR = re.compile(r"CWE-[1-9]\d*(\[auto\])?", flags=re.IGNORECASE)

CVE_RE_STR = r"CVE-(?:1999|2\d{3})-(?!0{4})(?:0\d{3}|[1-9]\d{3,})"
MAX_RETRY = 10


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


@when("I update the random input fields")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.field_values = []
    for row in context.table:
        field=row["field"]
        value = generate_random_text()
        flaw_detail_page.set_input_field(field, value)
        context.field_values.append(value)
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("The random input fields are updated")
def step_impl(context):
    go_to_first_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    for value in context.field_values:
        flaw_detail_page.check_value_exist(value)
    context.browser.quit()


@when("I update the CVE ID with a valid data")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    count = 0
    while count < MAX_RETRY:
        value = rstr.xeger(CVE_RE_STR)
        flaw_detail_page.set_input_field('cveid', value)
        flaw_detail_page.click_btn('saveBtn')
        try:
            flaw_detail_page.wait_msg('flawSavedMsg')
        except Exception as e:
            count += 1
            continue
        else:
            context.value = value
            break


@then("The CVE ID is updated")
def step_impl(context):
    go_to_first_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.check_value_exist(context.value)
    context.browser.quit()

@when("I {action} the CWE ID")
def step_impl(context, action):
    flaw_detail_page = FlawDetailPage(context.browser)
    if action == 'delete':
        flaw_detail_page.clear_input_field('cweid')
        value = ''
    else:
        value = rstr.xeger(CWE_RE_STR)
        flaw_detail_page.set_input_field('cweid', value)
    context.field_value = value
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')

@then("The CWE ID is updated")
def step_impl(context):
    go_to_first_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    v = flaw_detail_page.get_input_value('cweid')
    assert v == context.field_value, f"CWE ID should be {context.field_value}, got {v}"
    context.browser.quit()
