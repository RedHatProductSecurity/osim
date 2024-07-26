import time
import random
from datetime import date, datetime

from behave import when, then
from selenium.webdriver.common.by import By
from seleniumpagefactory.Pagefactory import ElementNotFoundException

from features.utils import (
    generate_cve,
    generate_cwe,
    generate_random_text,
    go_to_specific_flaw_detail_page,
    get_osidb_token,
    go_to_advanced_search_page
)
from features.pages.flaw_detail_page import FlawDetailPage
from features.pages.home_page import HomePage
from features.pages.advanced_search_page import AdvancedSearchPage
from features.constants import AFFECTED_MODULE_JR


MAX_RETRY = 10
DOCUMENT_TEXT_FIELDS = {
    # Exclude 'comment#0' because it's mandatory in creation
    'add': ['description', 'statement', 'mitigation'],
    # requires_cve_description can not be REQUESTED if description is missing
    'delete': ['statement', 'mitigation'],
    # Exclude 'description' because of OSIDB-2308
    'update': ['description', 'statement', 'mitigation']
}


@when("I add a {comment_type} comment to the flaw")
def step_impl(context, comment_type):
    flaw_detail_page = FlawDetailPage(context.browser)
    if comment_type != 'Public':
        flaw_detail_page.click_button_with_js('tab' + comment_type + 'Comments')
    flaw_detail_page.add_comment_btn_exist(comment_type)
    flaw_detail_page.click_button_with_js('add' + comment_type + 'CommentBtn')

    new_comment = generate_random_text()
    flaw_detail_page.set_comment_value(comment_type, new_comment)
    flaw_detail_page.click_button_with_js('save' + comment_type + 'CommentBtn')
    flaw_detail_page.wait_msg(comment_type.lower() + "CommentSavedMsg")
    time.sleep(2)
    context.new_comment = new_comment


@then('A {comment_type} comment is added to the flaw')
def step_impl(context, comment_type):
    # Check the comment saved successfully
    flaw_detail_page = FlawDetailPage(context.browser)
    if comment_type != 'Public':
        flaw_detail_page.click_button_with_js('tab' + comment_type + 'Comments')
    comment_xpath = f"//p[@class='osim-flaw-comment' and text()='{context.new_comment}']"
    flaw_detail_page.check_element_exists(By.XPATH, comment_xpath)


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
    fields = context.texts.keys()
    for field in fields:
        v = flaw_detail_page.get_document_text_field(field)
        assert v == context.texts.get(field), f"{field} text should be {context.texts.get(field)}, got {v}"


@when('I add an acknowledgment to the flaw')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_acknowledgments_dropdown_btn()
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
    flaw_detail_page.click_acknowledgments_dropdown_btn()
    flaw_detail_page.check_acknowledgement_exist(context.acknowledgement_value)


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


@when("I edit the first acknowledgement in correct format")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_acknowledgments_dropdown_btn()
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
    flaw_detail_page.click_acknowledgments_dropdown_btn()
    flaw_detail_page.check_acknowledgement_exist(context.acknowledgement_value)


@when("I delete an acknowledgement from acknowledgement list")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_acknowledgments_dropdown_btn()
    context.ack_value = flaw_detail_page.get_text_value("firstAcknowledgementValue")
    flaw_detail_page.click_first_ack_delete_btn()
    flaw_detail_page.click_btn('confirmAcknowledgmentDeleteBtn')
    flaw_detail_page.wait_msg('acknowledgmentDeletedMsg')


@then("Acknowledgement is removed from flaw")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_acknowledgments_dropdown_btn()
    flaw_detail_page.check_acknowledgement_not_exist(context.ack_value)


@when("I update the random input fields")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    home_page = HomePage(context.browser)

    context.field_values = []
    for row in context.table:
        field = row["field"]
        value = generate_random_text()
        if field == "contributors" or field == "owner":
            value = home_page.get_jira_username()

        if field == "components":
            flaw_detail_page.set_components_field(value)
        elif field == "contributors":
            flaw_detail_page.set_contributors_field(value)
            value = flaw_detail_page.firstContributorText.get_text().split("Remove")[0].strip()
        elif field == "cvssV3":
            value = flaw_detail_page.set_cvssV3_field()
        else:
            flaw_detail_page.set_input_field(field, value)

        context.field_values.append(value)
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')
    flaw_detail_page.wait_msg("cvssV3SavedMsg")


@then("The random input fields are updated")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.firstContributorText.visibility_of_element_located()
    for value in context.field_values:
        flaw_detail_page.check_text_exist(value)


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
    flaw_detail_page.check_text_exist(context.value)


@when("I {action} the CWE ID")
def step_impl(context, action):
    flaw_detail_page = FlawDetailPage(context.browser)
    if action == 'delete':
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


@when('I click self assign button and save changes')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    cur_value = flaw_detail_page.get_current_value_of_field("owner")
    if cur_value:
        flaw_detail_page.set_field_value('owner', '')
        flaw_detail_page.click_btn('saveBtn')
        flaw_detail_page.wait_msg('flawSavedMsg')
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page.click_btn('selfAssignBtn')
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("The flaw is assigned to me")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    assignee = flaw_detail_page.get_current_value_of_field("owner")
    home_page = HomePage(context.browser)
    login_user = home_page.get_jira_username()
    assert assignee == login_user.strip(), f'Self assign failed: {assignee}'


@when('I update the cve review status')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    go_to_specific_flaw_detail_page(context.browser)
    context.review_status = flaw_page.set_select_value('reviewStatusSelect')
    flaw_page.click_btn('saveBtn')
    flaw_page.wait_msg('flawSavedMsg')


@then("The review status is updated")
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    _, review_status = flaw_page.get_select_value('reviewStatusSelect')
    assert review_status == context.review_status, f'Review status update failed'


def add_a_reference_to_first_flaw(context, value, wait_msg, external=True):
    flaw_detail_page = FlawDetailPage(context.browser)
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page.click_button_with_js("addReferenceBtn")
    if external:
        flaw_detail_page.add_reference_select_external_type()
    flaw_detail_page.add_reference_set_link_url(value)
    flaw_detail_page.add_reference_set_description(value)
    flaw_detail_page.click_button_with_js("saveReferenceBtn")
    flaw_detail_page.wait_msg(wait_msg)
    flaw_detail_page.click_btn("toastMsgCloseBtn")


@when("I add two external references to the flaw")
def step_impl(context):
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
    flaw_detail_page.check_text_exist(context.first_value)
    flaw_detail_page.check_text_exist(context.second_value)


@when("I add two RHSB references to the flaw")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.delete_all_reference()
    context.first_value = f"https://access.redhat.com/{generate_random_text()}"
    add_a_reference_to_first_flaw(context, context.first_value, "referenceCreatedMsg", external=False)
    context.second_value = f"https://access.redhat.com/{generate_random_text()}"
    add_a_reference_to_first_flaw(context, context.second_value, "addMultipleRHSBReferenceErrorMsg", external=False)


@then("Only one RHSB reference can be added")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.check_text_exist(context.first_value)
    flaw_detail_page.check_value_not_exist(context.second_value)


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
        'reportedDate', datetime.today().strftime("%Y%m%d")+'0000')
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


@when("I delete a reference from a flaw")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()

    context.expected = flaw_detail_page.get_input_value("firstReferenceDescription")

    flaw_detail_page.click_first_reference_delete_btn()
    flaw_detail_page.click_btn('referenceDelConfirmBtn')
    flaw_detail_page.wait_msg("referenceDeletedMsg")


@then("The reference is deleted from this flaw")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.check_value_not_exist(context.expected)


@when("I edit a internal/external reference")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()

    context.expected = f"https://access.redhat.com/{generate_random_text()}"
    flaw_detail_page.click_first_reference_edit_btn()
    flaw_detail_page.add_reference_set_link_url(context.expected)
    flaw_detail_page.add_reference_set_description(context.expected)
    flaw_detail_page.click_first_reference_edit_btn()
    flaw_detail_page.click_button_with_js("saveReferenceBtn")
    flaw_detail_page.wait_msg("referenceUpdatedMsg")


@then("The reference information is changed")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.check_text_exist(context.expected)


@when("I add a RHSB reference to the flaw with incorrect link")
def step_impl(context):
    context.v = f"https://test.com/{generate_random_text()}"
    add_a_reference_to_first_flaw(
        context, context.v, "rhsbReferenceLinkFormatErrorMsg", external=False)


@then("I got an error message and no RHSB reference added to the flaw")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_reference_dropdown_button()
    flaw_detail_page.check_value_not_exist(context.v)


@when("I update the embargoed flaw with a past public date")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    context.v = date(2024, 1, 1).strftime("%Y%m%d")+"0000"
    flaw_detail_page.set_input_field("publicDate", context.v)
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('embargoedPublicDateErrorMsg')


@then("The embargoed flaw update is failed")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    v = flaw_detail_page.get_input_value("publicDate")
    assert v != context.v, f"Public date is updated to a past date {v}"


@when("I update the embargoed flaw with a future public date")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    context.v = date(2040, 1, 1).strftime("%Y%m%d")+"0000"
    flaw_detail_page.set_input_field("publicDate", context.v)
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("The embargoed flaw is updated")
def step_impl(context):
    pass


@when("I update the affects of the flaw and click 'Save Changes' button")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    # Display the affect detail
    flaw_detail_page.display_affect_detail()
    current_module = flaw_detail_page.get_current_value_of_field('affects__ps_module')
    current_affectedness = flaw_detail_page.get_selected_value_for_affect('affects__affectedness')
    # Get the valid/available values to update
    # 1. Get an available ps_module to be updated
    ps_module = flaw_detail_page.get_an_available_ps_module(current_module)
    # 2. Generate the random component name to be updated
    ps_component = generate_random_text()
    # 3. Get the available (key, value) for affectedness and resolution
    if current_affectedness == 'NEW':
        affectedness = 'AFFECTED'
        resolution = 'DELEGATED'
    else:
        affectedness = 'NEW'
        resolution = ''
    # 4. Generate the random cvss3_score
    cvss3_score = float("{0:.1f}".format(random.uniform(1, 6)))
    # Update the fields with the available values
    context.value_dict = {'ps_module': f'{ps_module}',
                          'ps_component': f'{ps_component}',
                          'affectedness': f'{affectedness}',
                          'resolution': f'{resolution}',
                          'cvss3_score': f'{cvss3_score}'}
    for item in context.value_dict.items():
        field = 'affects__' + item[0]
        if field in ['affects__ps_module', 'affects__ps_component', 'affects__cvss3_score']:
            flaw_detail_page.set_field_value(field, item[1])
        else:
            flaw_detail_page.set_select_specific_value(field, item[1])

    # Update afffect impact
    updated_value = flaw_detail_page.set_select_value_for_affect('affects__impact')
    context.value_dict['impact'] = updated_value
    # Save all the updates
    flaw_detail_page.click_btn('saveBtn')
    # Comment the line due to the Affect Saved message won't alert now
    # flaw_detail_page.wait_msg('affectSaveMsg')
    flaw_detail_page.wait_msg('affectUpdateMsg')
    flaw_detail_page.wait_msg('flawSavedMsg')

 
@then("All changes are saved")
def step_impl(context):
    token = get_osidb_token()
    # Check the affect updates have been saved
    flaw_detail_page = FlawDetailPage(context.browser)
    component_value = context.value_dict['ps_component']
    field_value_dict = flaw_detail_page.get_affect_values(
                    context.value_dict.keys(), token, component_value)
    # There is a bug OSIDB-3042, so the following step will be failed
    assert context.value_dict == field_value_dict


@when("I add a new affect with valid data")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    context.ps_component = flaw_detail_page.set_new_affect_inputs('bugzilla', 'NEW')


@then("The affect is added")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.display_affect_detail()
    component_xpath = f"//span[contains(text(), '{context.ps_component}')]"
    flaw_detail_page.check_element_exists(By.XPATH, component_xpath)


@when("I delete an affect of the flaw")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.module, context.component = \
        flaw_detail_page.click_affect_delete_btn()
    warning = flaw_detail_page.affectDeleteTips.get_text()
    assert warning == "Affected Offerings To Be Deleted"
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('affectDeleteMsg')
    flaw_detail_page.click_button_with_js('msgClose')
    flaw_detail_page.wait_msg('flawSavedMsg')
    flaw_detail_page.click_button_with_js('msgClose')
    

@then("The affect is deleted")
def step_impl(context):
    token = get_osidb_token()
    flaw_detail_page = FlawDetailPage(context.browser)
    module_component_list = flaw_detail_page.get_affect_module_component_values(
                    token, context.component)
    assert (context.module, context.component) not in module_component_list


@when("I click 'delete' button of an affect")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    context.module, context.component = \
        flaw_detail_page.click_affect_delete_btn()
    # Click the delete button of the affect
    flaw_detail_page.click_button_with_js('affectRecoverBtn')


@then("I could 'recover' the affect that I tried to delete above")
def step_impl(context):
    token = get_osidb_token()
    flaw_detail_page = FlawDetailPage(context.browser)
    module_component_list = flaw_detail_page.get_affect_module_component_values(
                    token, context.component)
    assert (context.module, context.component) in module_component_list


@when("I unembargo this flaw and add public date")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    # unembargo and set public date
    flaw_detail_page.click_button_with_js("unembargoBtn")
    context.public_date = datetime.today().strftime("%Y%m%d")+'0000'
    flaw_detail_page.set_input_field("publicDate", context.public_date)
    flaw_detail_page.click_btn("saveBtn")
    flaw_id = flaw_detail_page.get_flaw_id_from_unembargo_warning()
    flaw_detail_page.fill_flaw_id_for_unembargo_confirm(flaw_id)
    flaw_detail_page.click_button_with_js("removeEmbargoBtn")
    flaw_detail_page.wait_msg("flawSavedMsg")


@then("Flaw is unembargoed and have public date")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.check_unembargo_btn_not_exist()
    v = flaw_detail_page.get_input_value("publicDate")
    public_date = datetime.strptime(context.public_date, "%Y%m%d%H%M").strftime("%Y-%m-%d %H:%M")
    assert public_date in v, f"Public date should be {public_date}, got {v}"


@when('I file a {type} tracker')
def step_impl(context, type):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_button_with_js("ManageTrackers")
    if type == 'zstream':
        trackertext = flaw_detail_page.trackerZstream.get_text()
        flaw_detail_page.click_button_with_js("trackerZstream")
    else:
        trackertext = flaw_detail_page.affectUpstreamCheckbox.get_text()
        flaw_detail_page.click_button_with_js("affectUpstreamCheckbox")
    context.upstream = trackertext.split(' ')[0]
    flaw_detail_page.click_button_with_js("fileSelectedTrackers")
    flaw_detail_page.wait_msg("trackersFiledMsg")
    flaw_detail_page.clear_text_with_js('msgClose')


@then('The tracker is created')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.display_affect_detail()
    # Check the tracker summary
    trackerSummary_xpath = f"//summary[contains(text(), '{context.upstream}')]"
    flaw_detail_page.check_element_exists(By.XPATH, trackerSummary_xpath)


@when('I add a new affect to {external_system} supported module and selected {affectedness_value}')
def step_imp(context, external_system, affectedness_value):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.set_new_affect_inputs(external_system, affectedness_value)


@then("I can't file a tracker")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_button_with_js("ManageTrackers")
    flaw_detail_page.disabledfileSelectTrackers.visibility_of_element_located()


@then('The manager trackers list the filed trackers')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_button_with_js("ManageTrackers")
    flaw_detail_page.filedTrackers.visibility_of_element_located()


@then('I Select/Deselect all trackers and all the trackers could be Selected/Deselected')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_button_with_js("ManageTrackers")
    context.trackersCount = flaw_detail_page.trackers_list_count("trackersList")
    actions = ['Select', 'Deselect']
    for action in actions:
        if action == 'Select':
            flaw_detail_page.click_button_with_js("SelectAllTrackers")
            checked_count = flaw_detail_page.trackers_list_count("checkedTrackersList")
            assert checked_count == context.trackersCount
        if action == 'Deselect':
            flaw_detail_page.click_button_with_js("DeselectAllTrackers")
            checked_count = flaw_detail_page.trackers_list_count("checkedTrackersList")
            assert checked_count == 0


@when('I add some affects with valid data')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    # Get the current trackers count
    flaw_detail_page.click_button_with_js("ManageTrackers")
    context.trackersCurrentCount = flaw_detail_page.trackers_list_count("trackersList")
    # Add one more affect and get the trackers count of the new affect
    context.ps_component = flaw_detail_page.set_new_affect_inputs('jira', 'AFFECTED')
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page.click_button_with_js("ManageTrackers")
    context.trackersTotalCount = flaw_detail_page.trackers_list_count("trackersList")
    context.trackersNewCount = context.trackersTotalCount - context.trackersCurrentCount


@then('I could filter trackers by stream or component name')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    # Filter by the component name
    flaw_detail_page.FilterTrackers.set_text(context.ps_component)
    trackersCount = flaw_detail_page.trackers_list_count("trackersList")
    assert trackersCount == context.trackersNewCount
    # Filter by the stream name
    flaw_detail_page.FilterTrackers.set_text(AFFECTED_MODULE_JR)
    trackersCount = flaw_detail_page.trackers_list_count("trackersList")
    assert trackersCount == context.trackersNewCount


@when('I click state button to update flaw state')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.click_button_with_js('promoteStateBtn')
    time.sleep(10)
    flaw_page.wait_msg('flawPromotedMsg')


@then('The flaw is updated to {new_state} following workflow')
def step_impl(context, new_state):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.check_text_exist(new_state)


@when('I click reject button to reject a flaw')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.click_button_with_js('rejectStateBtn')
    flaw_page.set_reject_reason(generate_random_text())
    flaw_page.click_button_with_js('rejectFlawBtn')
    flaw_page.wait_msg('flawRejectedMsg')


@then('The flaw is rejected')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.check_text_exist('REJECTED')
