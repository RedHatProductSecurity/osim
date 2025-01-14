import time
from datetime import date, datetime

from behave import when, then
from selenium.common import NoSuchElementException
from selenium.webdriver.common.by import By

from features.common_utils import get_data_from_tmp_data_file
from features.steps.flaw_create import create_flaw_with_valid_data
from features.utils import (
    is_sorted,
    generate_cve,
    generate_cwe,
    generate_random_text,
    go_to_specific_flaw_detail_page,
)
from features.pages.flaw_detail_page import FlawDetailPage
from features.pages.home_page import HomePage
from features.constants import (
    CVSS_COMMENT_FLAW_ID,
    OSIM_URL,
    FLAW_ID_KEY
)


MAX_RETRY = 10
DOCUMENT_TEXT_ACTION_FIELD_DICT = {
    # Exclude 'comment#0' because it's mandatory in creation
    'add': ['description', 'statement', 'mitigation'],
    # requires_cve_description can not be REQUESTED if description is missing
    'delete': ['statement', 'mitigation'],
    # Exclude 'description' because of OSIDB-2308
    'update': ['description', 'statement', 'mitigation']
}
DROPDOWN_FIELDS = ['impact', 'source']
INPUT_FIELDS = ['title', 'components', 'owner', 'contributors', 'cvssV3']
COMMENT_TYPES = ['Public', 'Private', 'Internal']
AFFECT_SORTABLE_FIELDS = ['Module', 'Component', 'Affectedness']


@when("I add new comments to the flaw")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.new_comments = []
    for comment_type in COMMENT_TYPES:
        if comment_type != 'Public':
            flaw_detail_page.click_button_with_js('tab' + comment_type + 'Comments')
        flaw_detail_page.add_comment_btn_exist(comment_type)
        flaw_detail_page.click_button_with_js('add' + comment_type + 'CommentBtn')

        new_comment = generate_random_text()
        flaw_detail_page.set_comment_value(comment_type, new_comment)
        flaw_detail_page.click_button_with_js('save' + comment_type + 'CommentBtn')
        flaw_detail_page.wait_msg(comment_type.lower() + "CommentSavedMsg")
        time.sleep(2)
        context.new_comments.append(new_comment)


@then('The comments are added to the flaw')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    for comment_type in COMMENT_TYPES:
        if comment_type != 'Public':
            flaw_detail_page.click_button_with_js('tab' + comment_type + 'Comments')
            comment_text = context.new_comments[COMMENT_TYPES.index(comment_type)]
            comment_xpath = f"//p[@class='osim-flaw-comment' and text()='{comment_text}']"
            flaw_detail_page.check_element_exists(By.XPATH, comment_xpath)


@when('I {action} the document text fields')
def step_impl(context, action):
    flaw_detail_page = FlawDetailPage(context.browser)
    fields = DOCUMENT_TEXT_ACTION_FIELD_DICT.get(action)
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
    flaw_detail_page.check_text_exist(context.acknowledgement_value)


@when('I update the dropdown field values')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.field_values = []
    for field in DROPDOWN_FIELDS:
        value = flaw_detail_page.set_select_value(field)
        context.field_values.append(value)
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then('The dropdown field values are updated')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    for field in DROPDOWN_FIELDS:
        _, v = flaw_detail_page.get_select_value(field)
        updated_value = context.field_values[DROPDOWN_FIELDS.index(field)]
        assert v == updated_value, f"{field} value should be {updated_value}, got {v}"


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
    flaw_detail_page.check_text_exist(context.acknowledgement_value)


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


@when("I update the input fields")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    home_page = HomePage(context.browser)

    context.field_values = []
    for field in INPUT_FIELDS:
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


@then("The input fields are updated")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.firstContributorText.visibility_of_element_located()
    for index, value in enumerate(context.field_values):
        if index == 2:
            flaw_detail_page.check_owner_value_exist(value)
        else:
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
    cur_value = flaw_detail_page.get_input_field_value_using_relative_locator("ownerText")
    if cur_value:
        flaw_detail_page.set_input_field('owner', '')
        flaw_detail_page.click_btn('saveBtn')
        flaw_detail_page.wait_msg('flawSavedMsg')
        flaw_detail_page.close_all_toast_msg()
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page.click_button_with_js('selfAssignBtn')
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("The flaw is assigned to me")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    assignee = flaw_detail_page.get_input_field_value_using_relative_locator("ownerText")
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
    flaw_page.reviewStatusSelect.element_to_be_clickable()
    _, review_status = flaw_page.get_select_value('reviewStatusSelect')
    assert review_status == context.review_status, f'Review status update failed'


def add_a_reference_to_first_flaw(context, value, wait_msg, external=True):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_button_with_js("addReferenceBtn")
    if external:
        flaw_detail_page.add_reference_select_external_type()
    flaw_detail_page.add_reference_set_link_url(value)
    flaw_detail_page.add_reference_set_description(value)
    flaw_detail_page.click_button_with_js("saveReferenceBtn")
    flaw_detail_page.wait_msg(wait_msg)
    flaw_detail_page.click_btn("toastMsgCloseBtn")
    time.sleep(2)


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
    flaw_detail_page = FlawDetailPage(context.browser)
    context.v = date(2040, 1, 1).strftime("%Y%m%d")+"0000"
    flaw_detail_page.set_input_field("publicDate", context.v)
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("The embargoed flaw is updated")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    v = flaw_detail_page.get_input_value("publicDate")
    format_v = datetime.strptime(context.v, "%Y%m%d%H%M").strftime("%Y-%m-%d %H:%M")
    assert format_v in v, f"Public date should updated to a {format_v}, got {v}"


@when("I update the affects of the flaw and click 'Save Changes' button")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    # update first row affect
    # Get an available ps_module to be updated
    current_module = flaw_detail_page.firstAffectModuleSpan.get_text()
    ps_module = flaw_detail_page.get_an_available_ps_module(current_module)

    # Get the available (key, value) for affectedness and resolution
    current_affectedness = flaw_detail_page.firstAffectAffectednessSpan.get_text()
    if current_affectedness == 'NEW':
        affectedness = 'AFFECTED'
        resolution = 'DELEGATED'
    else:
        affectedness = 'NEW'
        resolution = ''

    # Generate the random component name to be updated
    ps_component = generate_random_text()

    # Update the fields with the available values
    context.value_dict = {
        'ps_module': f'{ps_module}',
        'ps_component': f'{ps_component}',
        'affectedness': f'{affectedness}',
        'resolution': f'{resolution}',
    }

    flaw_detail_page.set_affect_fields(
        module=ps_module, component=ps_component, affectedness=affectedness,
        resolution=resolution)
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')
    flaw_detail_page.wait_msg('affectUpdateMsg')
    flaw_detail_page.check_element_exists(By.XPATH, "//div[text()='1 CVSS score(s) saved on 1 affect(s).']")


@then("All changes are saved")
def step_impl(context):
    # Check the affect updates have been saved
    flaw_detail_page = FlawDetailPage(context.browser)
    for _, v in context.value_dict.items():
        flaw_detail_page.check_text_exist(v)


@when("I add a new affect with valid data")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.ps_component = flaw_detail_page.add_new_affect(component=generate_random_text(), affectedness_value="NEW")


@then("The affect is added")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.check_text_exist(context.ps_component)


@when("I delete an affect of the flaw")
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    affect = flaw_page.get_affect_value()
    context.ps_module, context.ps_component = affect.module, affect.component
    flaw_page.click_button_with_js("firstAffectRemoveBtn")
    flaw_page.click_btn('saveBtn')
    flaw_page.wait_msg('flawSavedMsg')
    time.sleep(1)
    flaw_page.click_button_with_js('msgClose')
    flaw_page.wait_msg('affectDeleteMsg')


@then("The affect is deleted")
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    if flaw_page.get_displayed_affects_number() > 0:
        affect = flaw_page.get_affect_value()
        ps_module, ps_component = affect.module, affect.component
        assert (context.ps_module, context.ps_component) != (ps_module, ps_component)


@when("I 'delete' an affect and 'recover' it")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    context.affect = flaw_detail_page.get_affect_value()
    flaw_detail_page.click_button_with_js("firstAffectRemoveBtn")
    flaw_detail_page.click_button_with_js("firstAffectRecoverBtn")
    flaw_detail_page.click_btn('saveBtn')
    flaw_detail_page.wait_msg('flawSavedMsg')


@then("I could 'recover' the affect that I tried to delete above")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    affect = context.affect
    flaw_detail_page.check_text_exist(affect.module)
    flaw_detail_page.check_text_exist(affect.component)
    flaw_detail_page.check_text_exist(affect.cvss)


@when("I bulk delete selected affects of the flaw")
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    context.ps_component1 = flaw_page.add_new_affect(affectedness_value="NEW", component=generate_random_text())
    time.sleep(2)
    flaw_page.close_all_toast_msg()
    flaw_page.bulk_delete_affects()
    flaw_page.click_btn('saveBtn')
    flaw_page.wait_msg('flawSavedMsg')
    flaw_page.click_button_with_js('msgClose')
    flaw_page.wait_msg('affectDeleteMsg')


@then("The selected affects are deleted")
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    assert flaw_page.get_displayed_affects_number() == 0


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


@when('I add a new affect for file tracker')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)

    # delete all existing affects
    current_affects_number = flaw_detail_page.get_all_affects_number()
    if current_affects_number > 0:
        flaw_detail_page.bulk_delete_affects()
        flaw_detail_page.click_btn('saveBtn')
        flaw_detail_page.wait_msg('flawSavedMsg')
        flaw_detail_page.check_text_exist(f"{current_affects_number} Affect(s) Deleted.")
        flaw_detail_page.close_all_toast_msg()

    # add a new affect for filing tracker
    context.component = flaw_detail_page.add_new_affect(affectedness_value='AFFECTED')
    flaw_detail_page.close_all_toast_msg()


@when('I file a tracker for new added affect')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.product_stream = flaw_detail_page.file_tracker_for_specific_affect(context.component)


@then('The tracker is created')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    # Check the created tracker
    flaw_detail_page.check_text_exist(context.product_stream)


@when('I filter modules/components in Tracker Manager and select filtered')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.product_stream = flaw_detail_page.select_filter_tracker()


@then('Filtered trackers selected')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    assert flaw_detail_page.get_selected_tracker_number() == 1
    assert flaw_detail_page.is_tracker_selected(context.product_stream) is True


@when('I file tracker for selected affects')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.product_stream = flaw_detail_page.file_tracker_for_selected_affects()


@when("I sort tracker by updated date and created date")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    asce, desc = [], []
    # created date ascending order
    asce.append(flaw_detail_page.get_value_list_of_displayed_tracker_list("created_date"))

    # created date descending order
    flaw_detail_page.click_button_with_js("trackerCreatedDateOrder")
    time.sleep(2)
    desc.append(flaw_detail_page.get_value_list_of_displayed_tracker_list("created_date"))

    # updated date ascending order
    flaw_detail_page.click_button_with_js("trackerUpdatedDateOrder")
    time.sleep(2)
    asce.append(flaw_detail_page.get_value_list_of_displayed_tracker_list("updated_date"))

    # updated date descending order
    flaw_detail_page.click_button_with_js("trackerUpdatedDateOrder")
    time.sleep(2)
    desc.append(flaw_detail_page.get_value_list_of_displayed_tracker_list("updated_date"))

    context.asce = asce
    context.desc = desc


@then("I got sorted tracker list order by updated date and created date")
def step_impl(context):
    # check asce result
    for r in context.asce:
        sorted_r = sorted(r)
        assert sorted_r == r, f"got incorrect asce sort result, {r}"
    # check desc result
    for r in context.desc:
        sorted_r = sorted(r, reverse=True)
        assert sorted_r == r, f"got incorrect desc sort result, {r}"


@then('I Select/Deselect all trackers and all the trackers could be Selected/Deselected')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_button_with_js("showTrackerManagerBtn")
    flaw_detail_page.wait_trackers_loaded_in_tracker_manager()
    # click deselectAll button to deselect pre-selected tracker
    flaw_detail_page.click_button_with_js("deselectAllTracker")
    n = flaw_detail_page.get_unfiled_tracker_number()
    # select
    flaw_detail_page.click_button_with_js("selectAllTracker")
    selected_number = flaw_detail_page.get_selected_tracker_number()
    assert selected_number == n, f"should select all trackers({n}), selected {selected_number}"

    # deselect
    flaw_detail_page.click_button_with_js("deselectAllTracker")
    assert flaw_detail_page.get_unfiled_tracker_number() == n, "should deselect all trackers"


@when('I click state button to update flaw state')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.click_button_with_js('promoteStateBtn')
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


@when("I click the erase button of CVSSv3 field")
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.click_btn("cvssV3EraseButton")
    flaw_page.click_btn("saveBtn")
    flaw_page.wait_msg('flawSavedMsg')
    flaw_page.wait_msg('cvssV3DeleteMsg')


@then("The CVSSv3 field is empty")
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_detail_page = FlawDetailPage(context.browser)
    cvss_score = flaw_detail_page.get_cvssV3_score()
    assert cvss_score == "", f"The CVSSv3 score should be empty, got {cvss_score}"


@when('I update flaw incident state to {new_state}')
def step_impl(context, new_state):
    flaw_page = FlawDetailPage(context.browser)
    if new_state == 'APPROVED':
        flaw_page.set_document_text_field(
            'description', generate_random_text())
        flaw_page.set_select_specific_value('reviewStatusSelect', 'APPROVED')
        flaw_page.driver.execute_script("window.scrollTo(0, 0);")
    flaw_page.set_select_specific_value('incidentStateText', new_state)
    flaw_page.click_btn('saveBtn')
    flaw_page.wait_msg('flawSavedMsg')


@then('The flaw incident state is updated to {new_state}')
def step_impl(context, new_state):
    flaw_page = FlawDetailPage(context.browser)
    time.sleep(2)
    _, v = flaw_page.get_select_value('incidentState')
    assert v == new_state, f"Incident state should be {new_state}, got {v}"


@when('I {action} the CVSS score explanation')
def step_impl(context, action):
    # For now, this scenario can only apply to specific flaw(s).
    go_to_specific_flaw_detail_page(context.browser, CVSS_COMMENT_FLAW_ID)
    flaw_page = FlawDetailPage(context.browser)
    context.value = '' if action == 'delete' else generate_random_text()
    flaw_page.set_cvss_score_explanation(context.value)
    flaw_page.click_btn('saveBtn')
    flaw_page.wait_msg('flawSavedMsg')
    flaw_page.wait_msg('cvssScoreSavedMsg')


@then('The CVSS score explanation is updated')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser, CVSS_COMMENT_FLAW_ID)
    flaw_page = FlawDetailPage(context.browser)
    updated_value = flaw_page.get_cvss_score_explanation()
    assert context.value == updated_value, "Failed to update CVSS score explanation."


@when('I click an affect module listed in affected offerings')
def step_impl(context):
    go_to_specific_flaw_detail_page(context.browser)
    flaw_page = FlawDetailPage(context.browser)
    context.module_name = flaw_page.select_affect_module()


@then('Only affects with this module are listed in affects table')
def step_impl(context):
    if context.module_name:
        flaw_page = FlawDetailPage(context.browser)
        modules = flaw_page.get_affect_filter_result('module')
        assert len(list(set(modules))) == 1
        assert modules[0] == context.module_name


@when("I bulk update affects")
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    flaw_page.add_new_affect(affectedness_value="NEW", component=generate_random_text())
    flaw_page.close_all_toast_msg()
    context.check_result = flaw_page.bulk_update_affects()


@then("All affects are updated")
def step_impl(context):
    # Check the affect updates have been saved
    flaw_detail_page = FlawDetailPage(context.browser)
    for v in context.check_result:
        flaw_detail_page.check_text_exist(v)


@when('I click a filterable field in affects table')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    context.affect = flaw_page.get_affect_value()
    context.affectedness = flaw_page.collect_affect_filter_data(
            'Affectedness', context.affect.affectedness)
    context.resolutions = flaw_page.collect_affect_filter_data(
            'Resolution', context.affect.resolution)
    context.impacts = flaw_page.collect_affect_filter_data(
            'Impact', context.affect.impact)


@then('I could get the correct data filtered by the field value')
def step_impl(context):
    assert len(list(set(context.affectedness))) == 1
    assert context.affectedness[0] == context.affect.affectedness
    assert len(list(set(context.resolutions))) == 1
    assert context.resolutions[0] == context.affect.resolution
    assert len(list(set(context.impacts))) == 1
    assert context.impacts[0] == context.affect.impact


@when("I set affects pagination number to 5")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    # add affect number to 6
    all_affects_number = flaw_detail_page.get_all_affects_number()

    if all_affects_number < 6:
        diff = 6 - all_affects_number
        for _ in range(diff):
            flaw_detail_page.add_new_affect(component=generate_random_text(), affectedness_value="NEW")
            flaw_detail_page.close_all_toast_msg()
            time.sleep(2)

    # change affect pagination to 5
    flaw_detail_page.change_affect_pagination(5)


@then("Only 5 affects shown in affect section")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    assert flaw_detail_page.get_displayed_affects_number() == 5


@when('I click a sortable field in affects table')
def step_impl(context):
    flaw_page = FlawDetailPage(context.browser)
    sort_fields = ['Module', 'Component', 'Affectedness']
    value_dict = {}
    for field in sort_fields:
        field_header = 'affect' + field + 'Header'
        if field != 'Module':
            flaw_page.click_button_with_js(field_header)
        asce_values = flaw_page.get_sorted_affects(field.lower())
        flaw_page.click_button_with_js(field_header)
        desc_values = flaw_page.get_sorted_affects(field.lower())
        value_dict[field] = {'desc': desc_values, 'asce': asce_values}
    context.value_dict = value_dict


@then('The affects table is sorted by the field')
def step_impl(context):
    for k, v in context.value_dict.items():
        for order, values in v.items():
            assert is_sorted(values, order) is True, f"Sort by field {k} in {order} failed."


@when("I change the state of affects")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.change_affect_state_for_filter()


@then("I can filter affect by affect state")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.select_affect_by_state()


@when("I create a new flaw and add same module/component affect")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    # get public flaw affect information
    affect = flaw_detail_page.get_affect_value()
    # open a new tab, create a new flaw add same module/component affect to flaw
    original_window = flaw_detail_page.open_new_tab(OSIM_URL)
    flaw_detail_page.click_btn('createFlawLink')
    create_flaw_with_valid_data(context, with_optional=True)
    flaw_detail_page.close_all_toast_msg()
    flaw_detail_page.add_new_affect(module=affect.module, component=affect.component, affectedness_value="AFFECTED")

    flaw_detail_page.close_tab_return_to_original_window(original_window)


@when("I add embargoed flaw in public flaw's Tracker Manager")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_button_with_js("showTrackerManagerBtn")
    flaw_detail_page.wait_trackers_loaded_in_tracker_manager()
    # click deselectAll button to deselect pre-selected tracker
    flaw_detail_page.click_button_with_js("deselectAllTracker")
    # add another related flaw
    flaw_detail_page.click_button_with_js('addFlawTabButton')

    flaw_detail_page.trackerMangerSearchFlawInput.set_text(context.cve_id)
    flaw_detail_page.click_button_with_js('trackerManagerAddFlawBtn')
    flaw_detail_page.wait_trackers_loaded_in_tracker_manager()
    flaw_detail_page.click_flaw_tab_in_tracker_manager(context.cve_id)
    flaw_detail_page.click_flaw_deselect_all_in_tracker_manager(context.cve_id)


@when("Sync tracker selections across tabs in Tracker Manager")
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_flaw_tab_in_tracker_manager(get_data_from_tmp_data_file(FLAW_ID_KEY))
    # select first tracker and check if the selection sync to another flaw tab
    product_stream = flaw_detail_page.get_unfiled_tracker_product_stream(row=1)
    context.product_stream = product_stream
    flaw_detail_page.select_unfiled_tracker(row=1)
    # check select status
    assert flaw_detail_page.is_tracker_selected(product_stream) is True
    flaw_detail_page.click_flaw_tab_in_tracker_manager(context.cve_id)
    assert flaw_detail_page.is_tracker_selected(product_stream) is True
    flaw_detail_page.click_flaw_tab_in_tracker_manager(get_data_from_tmp_data_file(FLAW_ID_KEY))


@when('Inspect selected trackers to file in Tracker Manager')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.click_inspect_trackers_to_file_btn(tracker_number=1)

    affect_number, flaw_number = flaw_detail_page.get_inspect_trackers_result(context.product_stream)
    assert affect_number == 2, f"inspect tracker result incorrect, should get 2 affect(s), got {affect_number}"
    assert flaw_number == 2, f"inspect tracker result incorrect, should get 2 flaw(s), got {flaw_number}"


@when('I file tracker for multiple flaw')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    flaw_detail_page.driver.find_element(By.XPATH, "//button[text()=' File 1 Trackers ']").click()
    # confirm if current flaw is low impact
    try:
        flaw_detail_page.driver.find_element(By.XPATH, "//*[contains(text(), ' Filing Low Severity Trackers ')]")
    except NoSuchElementException:
        pass
    else:
        flaw_detail_page.confirmFileLowSeverityBtn.click_button()
    flaw_detail_page.wait_msg("trackersFiledMsg")
    flaw_detail_page.close_all_toast_msg()


@then('Tracker filed for multiple flaw')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    go_to_specific_flaw_detail_page(context.browser)
    # Check if tracker created successfully
    flaw_detail_page.check_text_exist(context.product_stream)
    go_to_specific_flaw_detail_page(context.browser, flaw_id=context.cve_id)
    flaw_detail_page.check_text_exist(context.product_stream)


@when('I filter tracker by status field')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    context.n = flaw_detail_page.get_tracker_number_of_displayed_tracker_list()
    flaw_detail_page.click_button_with_js('trackerStatusFilterBtn')
    flaw_detail_page.select_tracker_status_filter_by_test("NEW")


@then('Tracker filtered by status field')
def step_impl(context):
    flaw_detail_page = FlawDetailPage(context.browser)
    n = flaw_detail_page.get_tracker_number_of_displayed_tracker_list()
    assert n == context.n, f"incorrect number of filtered trackers, should get {context.n}, got {n}"
