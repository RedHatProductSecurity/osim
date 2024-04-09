import time
from datetime import datetime

from behave import when, then
from selenium.webdriver.common.by import By
from seleniumpagefactory.Pagefactory import ElementNotFoundException

from features.utils import (
    wait_for_visibility_by_locator,
    generate_cve,
    generate_cwe,
    generate_random_text,
    go_to_specific_flaw_detail_page
)
from features.pages.flaw_detail_page import FlawDetailPage


MAX_RETRY = 10
DOCUMENT_TEXT_FIELDS = {
    # Exclude 'comment#0' because it's mandatory in creation
    'add': ['description', 'statement', 'mitigation'],
    # requires_summary can not be REQUESTED if summary is missing
    'delete': ['statement', 'mitigation'],
    # Exclude 'description' because of OSIDB-2308
    'update': ['description', 'statement', 'mitigation']
}


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


@when('I {action} the document text fields')
def step_impl(context, action):
    flaw_detail_page = FlawDetailPage(context.browser)
    fields = DOCUMENT_TEXT_FIELDS.get(action)
    text_dict = dict.fromkeys(fields, '')
    if action != 'delete':
        for field in fields:
            text_dict[field] = generate_random_text()
    for field in fields:
        flaw_detail_page.set_document_text_field(field, text_dict[field])

    context.texts = text_dict
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then('The document text fields are updated')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('documentTextFieldsDropDownBtn')
    fields = context.texts.keys()
    for field in fields:
        v = flaw_detail_page.get_document_text_field(field)
        assert v == context.texts.get(field), f"{field} text should be {context.texts.get(field)}, got {v}"
    context.browser.quit()


@when('I add an acknowledgment to the flaw')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('acknowledgmentsDropDownBtn')
    flaw_detail_page.click_button_with_js("addAcknowledgmentBtn")
    l, r = generate_random_text(), generate_random_text()
    flaw_detail_page.set_acknowledgement(l, r)
    flaw_detail_page.click_save_acknowledgment_btn()
    flaw_detail_page.wait_msg('acknowledgmentSavedMsg')
    context.acknowledgement_value = f"{l} from {r}"


@then("A new acknowledgement added to the flaw")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
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
    go_to_specific_flaw_detail_page(context.browser)
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
    go_to_specific_flaw_detail_page(context.browser)
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
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_btn('acknowledgmentsDropDownBtn')
    flaw_detail_page.check_acknowledgement_not_exist(context.ack_value)
    context.browser.quit()


@when("I update the random input fields")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.field_values = []
    for row in context.table:
        field = row["field"]
        value = generate_random_text()
        flaw_detail_page.set_input_field(field, value)
        context.field_values.append(value)
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("The random input fields are updated")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    for value in context.field_values:
        flaw_detail_page.check_value_exist(value)
    context.browser.quit()


@when("I update the CVE ID with a valid data")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    count = 0
    while count < MAX_RETRY:
        value = generate_cve()
        flaw_detail_page.set_input_field('cveid', value)
        flaw_detail_page.click_btn('saveBtn')
        try:
            flaw_detail_page.wait_msg('flawSavedMsg')
        except Exception:
            count += 1
            continue
        else:
            context.value = value
            break


@then("The CVE ID is updated")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
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
        value = generate_cwe()
        flaw_detail_page.set_input_field('cweid', value)
    context.field_value = value
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("The CWE ID is updated")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    v = flaw_detail_page.get_input_value('cweid')
    assert v == context.field_value, f"CWE ID should be {context.field_value}, got {v}"
    context.browser.quit()


@when('I update the Reported Date with a valid data')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.v = datetime.today().strftime("%Y%m%d")
    flaw_detail_page.set_input_field("reportedDate", context.v)
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("The Reported Date is updated")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    expected = datetime.strftime(datetime.strptime(context.v, "%Y%m%d"), "%Y-%m-%d")
    get_value = flaw_detail_page.get_input_value("reportedDate")
    assert get_value == expected, f"get {get_value}, expected {expected}"
    context.browser.quit()


def add_a_reference_to_first_flaw(context, value, wait_msg, external=True):
    flaw_detail_page = FlawDetailPage(context.browser)
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page.click_button_with_js("addReferenceBtn")
    flaw_detail_page.click_reference_dropdown_button()
    if external:
        flaw_detail_page.add_reference_select_external_type()
    flaw_detail_page.add_reference_set_link_url(value)
    flaw_detail_page.add_reference_set_description(value)
    flaw_detail_page.click_button_with_js("saveReferenceBtn")
    flaw_detail_page.wait_msg(wait_msg)
    flaw_detail_page.click_btn("toastMsgCloseBtn")


@when("I add two external references to the flaw")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.delete_all_reference()
    # add first
    context.first_value = f"https://test.com/{generate_random_text()}"
    add_a_reference_to_first_flaw(context, context.first_value, "referenceCreatedMsg")
    # add second
    context.second_value = f"https://test.com/{generate_random_text()}"
    add_a_reference_to_first_flaw(context, context.second_value, "referenceCreatedMsg")


@then("Two external references added")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.check_value_exist(context.first_value)
    flaw_detail_page.check_value_exist(context.second_value)
    context.browser.quit()


@when("I add two RHSB references to the flaw")
def step_impl(context):
    context.first_value = f"https://access.redhat.com/{generate_random_text()}"
    add_a_reference_to_first_flaw(context, context.first_value, "referenceCreatedMsg", external=False)
    context.second_value = f"https://access.redhat.com/{generate_random_text()}"
    add_a_reference_to_first_flaw(context, context.second_value, "addMultipleRHSBReferenceErrorMsg", external=False)


@then("Only one RHSB reference can be added")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.check_value_exist(context.first_value)
    flaw_detail_page.check_value_not_exist(context.second_value)
    context.browser.quit()


@when("I update the flaw and click 'Reset Changes' button")
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    context.title = flaw_page.get_input_value('title')
    flaw_page.set_input_field('title', generate_random_text())
    _, context.impact = flaw_page.get_select_value('impact')
    flaw_page.set_select_value('impact')
    _, context.source = flaw_page.get_select_value('source')
    flaw_page.set_select_value('source')
    context.reported_date = flaw_page.get_input_value('reportedDate')
    flaw_page.set_input_field(
        'reportedDate', datetime.today().strftime("%Y%m%d"))
    flaw_page.click_btn('documentTextFieldsDropDownBtn')
    context.description = flaw_page.get_document_text_field('description')
    flaw_page.set_document_text_field(
        'description', generate_random_text())
    flaw_page.click_btn('resetBtn')


@then("All changes are reset")
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    assert context.title == flaw_page.get_input_value('title')
    assert context.impact == flaw_page.get_select_value('impact')[1]
    assert context.source == flaw_page.get_select_value('source')[1]
    assert context.reported_date == flaw_page.get_input_value('reportedDate')
    assert context.description == flaw_page.get_document_text_field('description')
    context.browser.quit()


@when("I delete a reference from a flaw")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()

    try:
        context.expected = flaw_detail_page.get_input_value("firstReferenceDescription")
    except ElementNotFoundException:
        context.expected = f"https://test.com/{generate_random_text()}"
        add_a_reference_to_first_flaw(context, context.expected, "referenceCreatedMsg")
        go_to_specific_flaw_detail_page(context.browser)
        flaw_detail_page.click_reference_dropdown_button()

    flaw_detail_page.click_button_with_js("firstReferenceDeleteBtn")
    flaw_detail_page.click_btn('referenceDelConfirmBtn')
    flaw_detail_page.wait_msg("referenceDeletedMsg")


@then("The reference is deleted from this flaw")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.check_value_not_exist(context.expected)
    context.browser.quit()


@when("I edit a internal/external reference")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()

    try:
        flaw_detail_page.get_input_value("firstReferenceDescription")
    except ElementNotFoundException:
        v = f"https://access.redhat.com/{generate_random_text()}"
        add_a_reference_to_first_flaw(context, v, "referenceCreatedMsg")
        go_to_specific_flaw_detail_page(context.browser)
        flaw_detail_page.click_reference_dropdown_button()

    context.expected = f"https://access.redhat.com/{generate_random_text()}"
    flaw_detail_page.click_button_with_js("firstReferenceEditBtn")
    flaw_detail_page.clear_text_with_js("addReferenceLinkUrlInput")
    flaw_detail_page.add_reference_set_link_url(context.expected)
    flaw_detail_page.clear_text_with_js('addReferenceDescriptionInput')
    flaw_detail_page.add_reference_set_description(context.expected)
    flaw_detail_page.click_button_with_js("firstReferenceEditBtn")
    flaw_detail_page.click_button_with_js("saveReferenceBtn")
    flaw_detail_page.wait_msg("referenceUpdatedMsg")


@then("The reference information is changed")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.check_value_exist(context.expected)
    context.browser.quit()


@when("I add a RHSB reference to the flaw with incorrect link")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.delete_all_reference()
    context.v = f"https://test.com/{generate_random_text()}"
    add_a_reference_to_first_flaw(
        context, context.v, "rhsbReferenceLinkFormatErrorMsg", external=False)


@then("I got an error message and no RHSB reference added to the flaw")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.check_value_not_exist(context.v)
    context.browser.quit()
