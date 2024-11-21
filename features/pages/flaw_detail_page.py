import random
import time
from collections import namedtuple

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.relative_locator import locate_with
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import NoSuchElementException
from seleniumpagefactory.Pagefactory import ElementNotVisibleException, ElementNotFoundException
from selenium.webdriver.remote.webelement import WebElement

from features.pages.base import BasePage
from features.page_factory_utils import find_elements_in_page_factory, find_element_in_page_factory
from features.constants import AFFECTS_MODULE_COMPONENT_PAIR


Affect = namedtuple(
    'Affect',
    ["module", "component", "affectedness", "resolution", "impact", "cvss"])

Tracker = namedtuple(
    "Tracker", ["bug_id", "module", "product_stream", "status", "resolution", "created_date", "updated_date"])


class FlawDetailPage(BasePage):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 60

    locators = {
        "createFlawLink": ("LINK_TEXT", "Create Flaw"),
        "createNewFlawBtn": ("XPATH", '//button[contains(text(), "Create New Flaw")]'),
        "embargeodCheckBox": ("XPATH", "//input[@class='form-check-input']"),

        "comment#0Text": ("XPATH", "//span[text()=' Comment#0']"),
        "descriptionBtn": ("XPATH", "//button[contains(text(), 'Add Description')]"),
        "descriptionText": ("XPATH", "//span[text()=' Description ']"),
        "reviewStatusSelect": ("XPATH", "//select[@class='form-select col-3 osim-description-required']"),
        "statementBtn": ("XPATH", "//button[contains(text(), 'Add Statement')]"),
        "statementText": ("XPATH", "//span[contains(text(),'Statement')]"),
        "mitigationBtn": ("XPATH", "//button[contains(text(), 'Add Mitigation')]"),
        "mitigationText": ("XPATH", "//span[contains(text(),'Mitigation')]"),

        "addPublicCommentBtn": ("XPATH", "//button[contains(text(), 'Add Public Comment')]"),
        "savePublicCommentBtn": ("XPATH", "//button[contains(text(),'Save Public Comment')]"),
        "publicCommentSavedMsg": ("XPATH", "//div[text()='Public comment saved.']"),
        "newPublicCommentText": ("XPATH", "//span[contains(text(), 'New Public Comment')]"),
        "tabPrivateComments": ("XPATH", "//button[contains(text(), 'Private Comments')]"),
        "addPrivateCommentBtn": ("XPATH", "//button[contains(text(), 'Add Private Comment')]"),
        "savePrivateCommentBtn": ("XPATH", "//button[contains(text(),'Save Private Comment')]"),
        "privateCommentSavedMsg": ("XPATH", "//div[text()='Private comment saved.']"),
        "newPrivateCommentText": ("XPATH", "//span[contains(text(),'New Private Comment')]"),
        "tabInternalComments": ("XPATH", "//button[contains(text(), 'Internal Comments')]"),
        "addInternalCommentBtn": ("XPATH", "//button[contains(text(), 'Add Internal Comment')]"),
        "saveInternalCommentBtn": ("XPATH", "//button[contains(text(),'Save Internal Comment')]"),
        "internalCommentSavedMsg": ("XPATH", "//div[text()='Internal comment saved']"),
        "newInternalCommentText": ("XPATH", "//span[contains(text(),'New Internal Comment')]"),

        "resetBtn": ("XPATH", '//button[text()="Reset Changes"]'),
        "saveBtn": ("XPATH", '//button[text()=" Save Changes "]'),
        "flawSavedMsg": ("XPATH", "//div[text()='Flaw saved']"),
        "flawCreatedMsg": ("XPATH", "//div[text()='Flaw created']"),
        "cvssScoreSavedMsg": ("XPATH", "//div[text()='Saved CVSS Scores']"),

        "addAcknowledgmentBtn": ("XPATH", "//button[contains(text(), 'Add Acknowledgment')]"),
        "acknowledgmentCountLabel": ("XPATH", "//label[contains(text(), 'Acknowledgments:')]"),
        "addAcknowledgementNameSpan": ("XPATH", "//span[text()='Name']"),
        "addAcknowledgementAffiliationSpan": ("XPATH", "//span[text()='Affiliation']"),
        "firstAcknowledgementValueText": ("XPATH", '(//div[contains(text(), "from")])[1]'),
        "saveAcknowledgmentBtn": ("XPATH", '//button[contains(text(), "Save Changes to Acknowledgments")]'),
        "acknowledgmentSavedMsg": ("XPATH", '//div[text()="Acknowledgment created."]'),
        "confirmAcknowledgmentDeleteBtn": ("XPATH", '//button[contains(text(), "Confirm")]'),
        "acknowledgmentUpdatedMsg": ("XPATH", "//div[text()='Acknowledgment updated.']"),
        "acknowledgmentDeletedMsg": ("XPATH", "//div[text()='Acknowledgment deleted.']"),

        "impactText": ("XPATH", "(//span[text()='Impact'])[1]"),
        "sourceText": ("XPATH", "//span[text()='CVE Source']"),
        "titleText": ("XPATH", "//span[text()='Title']"),
        "titleValue": ("XPATH", "(//span[@class='osim-editable-text-value form-control'])[1]"),
        "componentsText": ("XPATH", "//span[text()='Components']"),
        "cveidText": ("XPATH", "//span[text()='CVE ID']"),
        "cveidValue": ("XPATH", "(//span[@class='osim-editable-text-value form-control'])[2]"),
        "cweidText": ("XPATH", "//span[text()='CWE ID']"),
        "cweidValue": ("XPATH", "(//span[@class='osim-editable-text-value form-control'])[3]"),
        "incidentStateText": ("XPATH", "//span[text()='Incident State']"),

        "cvssV3Text": ("XPATH", "//span[text()=' RH CVSSv3 ']"),
        "cvssV3Score": ("XPATH", "//span[@class='osim-cvss-score']"),
        "cvssV3EraseButton": ("XPATH", "//button[@class='erase-button input-group-text']"),
        "cvssV3SavedMsg": ("XPATH", "//div[text()='Saved CVSS Scores']"),
        "cvssV3DeleteMsg": ("XPATH", "//div[text()='CVSS score deleted.']"),

        "reportedDateText": ("XPATH", "//span[text()='Reported Date']"),
        "reportedDateValue": ("XPATH", "(//span[@class='osim-editable-date-value form-control text-start form-control'])[1]"),
        "publicDateText": ("XPATH", "//span[text()='Public Date']"),
        "publicDateFutureText": ("XPATH", "//span[text()='Public Date [FUTURE]']"),
        "publicDateValue": ("XPATH", "(//span[@class='osim-editable-date-value form-control text-start form-control'])[2]"),

        "ownerText": ("XPATH", "//span[text()=' Owner']"),
        "selfAssignBtn": ("XPATH", "//button[contains(text(), 'Self Assign')]"),
        "contributorsText": ("XPATH", "//span[text()='Contributors']"),
        "contributorListFirstOption": ("XPATH", "(//div[@class='menu dropdown-menu']/div/span)[1]"),
        "firstContributorText": ("XPATH", "(//li[@class='badge text-bg-secondary'])[1]"),

        "rejectStateBtn": ("XPATH", "(//div[@class='osim-workflow-state-buttons']/button)[1]"),
        "promoteStateBtn": ("XPATH", "(//div[@class='osim-workflow-state-buttons']/button)[2]"),
        "flawPromotedMsg": ("XPATH", "//strong[text()='Flaw Promoted']"),
        "rejectFlawBtn":  ("XPATH", "//button[contains(text(), 'Reject Flaw')]"),
        "rejectReasonText": ("XPATH", "//span[text()='Please provide a reason for rejecting the flaw']"),
        "flawRejectedMsg": ("XPATH", "//strong[text()='Flaw Rejected']"),

        "cvssCommentLabel": ("XPATH", "//label[contains(text(), 'Explain non-obvious CVSSv3 score metrics')]"),

        "referenceCountLabel": ("XPATH", '//label[contains(text(), "References:")]'),
        "addReferenceBtn": ("XPATH", "//button[contains(text(), 'Add Reference')]"),
        "saveReferenceBtn": ("XPATH", "//button[contains(text(), 'Save Changes to References')]"),
        "referenceList": ("XPATH", "(//div[@class='ps-3 border-start'])[6]/div/div"),
        "referenceCreatedMsg": ("XPATH", "//div[text()='Reference created.']"),
        "referenceDelConfirmBtn": ("XPATH", '//button[contains(text(), "Confirm")]'),
        "referenceDeletedMsg": ("XPATH", "//div[text()='Reference deleted.']"),
        "addReferenceLinkUrlSpan": ("XPATH", "//span[text()='Link URL']"),
        "addMultipleRHSBReferenceErrorMsg": ("XPATH", "//div[contains(text(),'A flaw has 2 article links, but only 1 is allowed.')]"),
        "referenceUpdatedMsg": ("XPATH", "//div[text()='Reference updated.']"),
        "rhsbReferenceLinkFormatErrorMsg": ("XPATH", '//div[contains(text(), "A flaw reference of the ARTICLE type does not begin with https://access.redhat.com")]'),
        "firstReferenceDescriptionValue": ("XPATH", "(//div[@class='osim-list-edit'])[1]/div/div/div/div/span"),

        "bottomBar": ("XPATH", "//div[@class='osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end']"),
        "bottomFooter": ("XPATH", "//footer[@class='fixed-bottom osim-status-bar']"),
        "toastMsgCloseBtn": ("XPATH", "//button[@class='osim-toast-close-btn btn-close']"),
        "embargoedPublicDateErrorMsg": ("XPATH", '//div[contains(text(), "unembargo_dt: An embargoed flaw must have a public date in the future")]'),
        "alertDropdownBtn": ("XPATH", "(//button[@class='me-2 osim-collapsible-toggle'])[1]"),
        "alertFlawDropdownBtn": ("XPATH", "(//button[@class='me-2 osim-collapsible-toggle'])[2]"),
        "flawWithoutAffectErrorText": ("XPATH", "//span[contains(text(),'Error _validate_flaw_without_affect')]"),
        "selects": ("XPATH", "//select[@class='form-select']"),
        "affectCreatedMsg": ("XPATH", "//div[text()='Affects Created.']"),

        # Affects locators
        "addNewAffectBtn": ("XPATH", "//button[contains(text(), 'Add New Affect')]"),
        "newAddAffectEditBtn": ("XPATH", "(//tbody)[1]/tr[1]/td[last()]/button[@title='Edit affect']"),
        "newAddAffectCommitBtn": ("XPATH", "//button[@title='Commit edit']"),
        "newAddAffectModuleInput": ("XPATH", "(//tbody)[1]/tr[1]/td[3]/input"),
        "newAddAffectComponentInput": ("XPATH", "(//tbody)[1]/tr[1]/td[4]/input"),
        "newAddAffectAffectednessSelect": ("XPATH", "(//tbody)[1]/tr[1]/td[5]/select"),
        "newAddAffectResolutionSelect": ("XPATH", "(//tbody)[1]/tr[1]/td[6]/select"),
        "newAddAffectImpactSelect": ("XPATH", "(//tbody)[1]/tr[1]/td[7]/select"),
        "newAddAffectCVSSInput": ("XPATH", "(//tbody)[1]/tr[1]/td[8]/input"),
        "firstAffectCheckbox": ("XPATH", "(//tbody)[1]/tr[1]/td[1]/input"),
        "firstAffectModuleSpan": ("XPATH", "(//tbody)[1]/tr[1]/td[3]/span"),
        "firstAffectComponentSpan": ("XPATH", "(//tbody)[1]/tr[1]/td[4]/span"),
        "firstAffectAffectednessSpan": ("XPATH", "(//tbody)[1]/tr[1]/td[5]/span"),
        "firstAffectResolutionSpan": ("XPATH", "(//tbody)[1]/tr[1]/td[6]/span"),
        "firstAffectImpactSpan": ("XPATH", "(//tbody)[1]/tr[1]/td[7]/span"),
        "firstAffectCVSSSpan": ("XPATH", "(//tbody)[1]/tr[1]/td[8]/span"),
        "commitAllAffectChangesBtn": ("XPATH", "//button[@title='Commit changes on all affects being edited']"),
        "firstAffectRemoveBtn": ("XPATH", "(//tbody)[1]/tr[1]/td[last()]/button[@title='Remove affect']"),
        "firstAffectRecoverBtn": ("XPATH", "(//tbody)[1]/tr[1]/td[last()]/button[@title='Recover affect']"),
        "affectRows": ("XPATH", "(//tbody)[1]/tr"),
        "allAffectsCheckBox": ("XPATH", "(//thead)[1]/tr[1]/th[1]/input"),
        "bulkRemoveAffectBtn": ("XPATH", "//button[@title='Remove all selected affects']"),
        "bulkEditAffectBtn": ("XPATH", "//button[@title='Edit all selected affects']"),
        "affectModuleWithTrackerBtn": ("XPATH", "//button[@class='module-btn btn btn-sm border-gray']"),
        "affectModuleWithoutTrackerBtn": ("XPATH", "//button[@class='module-btn btn btn-sm border-gray fw-bold']"),
        "affectAffectednessFilterBtn": ("ID", "affectedness-filter"),
        "affectResolutionFilterBtn": ("ID", "resolution-filter"),
        "affectImpactFilterBtn": ("ID", "impact-filter"),
        "affectPaginationNumberSpan": ("XPATH", "//div[@class='per-page-btn btn btn-sm btn-secondary']/span"),
        "reduceAffectPerPage": ("XPATH", "//i[@title='Reduce affects per page']"),
        "increaseAffectPerPage": ("XPATH", "//i[@title='Increase affects per page']"),
        "allAffectNumberSpan": ("XPATH", "//span[contains(text(), 'All affects')]"),
        "affectModuleHeader": ("XPATH", "//thead[@class='sticky-top table-dark']/tr/th[contains(text(), 'Module')]"),
        "affectComponentHeader": (
            "XPATH", "//thead[@class='sticky-top table-dark']/tr/th[contains(text(), 'Component')]"),
        "affectAffectednessHeader": (
            "XPATH", "//thead[@class='sticky-top table-dark']/tr/th/span[contains(text(), 'Affectedness')]"),
        "displayEditingAffect": ("XPATH", "//div[@title='Display editing affects']"),
        "displayModifiedAffect": ("XPATH", "//div[@title='Display modified affects']"),
        "displayRemovedAffect": ("XPATH", "//div[@title='Display removed affects']"),
        "displayNewAddedAffect": ("XPATH", "//div[@title='Display new affects']"),
        "displaySelectedAffect": ("XPATH", "//div[@title='Display selected affects']"),
        "deselectAllTracker": ("XPATH", "//button[text()=' Deselect All']/i"),
        "selectAllTracker": ("XPATH", "//button[text()=' Select All']"),
        "trackersFiledMsg": ("XPATH", "//div[contains(text(), 'Tracker filed.')]"),
        "trackerManagerCloseBtn": ("XPATH", "//button[@class='btn btn-close ms-auto']"),
        "showTrackerManagerBtn": ("XPATH", "//button[text()=' Show Trackers Manager ']"),
        "affectUpdateMsg": ("XPATH", "//div[text()='Affects Updated.']"),
        "affectDeleteMsg": ("XPATH", "//div[text()='1 Affect(s) Deleted.']"),
        "filterModuleComponentInput": ("XPATH", "//input[@placeholder='Filter Modules/Components...']"),
        "selectFilteredTrackerBtn": ("XPATH", "//button[text()=' Select Filtered']"),
        "trackerCreatedDateOrder": ("XPATH", "//th[text()=' Created date ']"),
        "trackerUpdatedDateOrder": ("XPATH", "//th[text()=' Updated date ']"),

        "ManageTrackers": ("XPATH", "//button[contains(text(), 'Manage Trackers')]"),
        "SelectAllTrackers": ("XPATH", "//button[contains(text(), 'Select All')]"),
        "DeselectAllTrackers": ("XPATH", "//button[contains(text(), 'Deselect All')]"),
        "trackersList": ("XPATH", "//input[@class='osim-tracker form-check-input']"),
        "checkedTrackersList": ("XPATH", "//input[@class='osim-tracker form-check-input' and @checked='']"),
        "FilterTrackers": ("XPATH", "//input[@placeholder='Filter by stream or component name']"),
        "trackerZstream": ("XPATH", "(//label[contains(text(), '.z')])[1]"),

        "msgClose": ("XPATH", "(//button[@class='osim-toast-close-btn btn-close'])[1]"),
        "unembargoBtn": ("XPATH", "//button[contains(text(), 'Unembargo')]"),
        "unembargoWarningText": ("XPATH", "//div[@class='alert alert-info']"),
        "unembargoConfirmText": ("XPATH", "//span[text()='Confirm']"),
        "removeEmbargoBtn": ("XPATH", "//button[contains(text(), 'Remove Embargo')]"),
        'stateText': ("XPATH", "//span[text()=' State']"),
        'embargoedText': ("XPATH", "//span[text()=' Embargoed']"),
    }

    # Data is from OSIDB allowed sources:
    # https://github.com/RedHatProductSecurity/osidb/blob/master/osidb/models.py#L419
    allowed_sources = [
        'ADOBE',
        'APPLE',
        'BUGTRAQ',
        'CERT',
        'CUSTOMER',
        'CVE',
        'DEBIAN',
        'DISTROS',
        'FULLDISCLOSURE',
        'GENTOO',
        'GIT',
        'GOOGLE',
        'HW_VENDOR',
        'INTERNET',
        'LKML',
        'MAGEIA',
        'MOZILLA',
        'OPENSSL',
        'ORACLE',
        'OSS_SECURITY',
        'REDHAT',
        'RESEARCHER',
        'SECUNIA',
        'SKO',
        'SUN',
        'SUSE',
        'TWITTER',
        'UBUNTU',
        'UPSTREAM',
        'XEN',
    ]

    def switch_element_visibility(self, element, visibility):
        try:
            self.driver.execute_script(f"arguments[0].style.visibility='{visibility}'", element)
        except ElementNotVisibleException:
            pass

    def add_comment_btn_exist(self, comment_type):
        button_element = getattr(self, 'add' + comment_type + 'CommentBtn')
        button_element.visibility_of_element_located()

    def save_button_exist(self):
        self.saveBtn.visibility_of_element_located()

    def set_comment_value(self, comment_type, value):
        self.componentsText.execute_script("arguments[0].scrollIntoView(true);")
        comment_text_element = getattr(self, 'new' + comment_type + 'CommentText')
        comment_text_area = self.driver.find_elements(
            locate_with(By.TAG_NAME, "textarea").near(comment_text_element))[0]
        comment_text_area.send_keys(value)

    def set_document_text_field(self, field, value):
        if field != 'comment#0':
            field_btn = field + 'Btn'
            if find_elements_in_page_factory(self, field_btn):
                self.driver.execute_script("arguments[0].scrollIntoView(true);", getattr(self, field_btn))
                bottom_footer = find_elements_in_page_factory(self, 'bottomFooter')[0]
                bottom_bar = find_elements_in_page_factory(self, 'bottomBar')[0]
                self.switch_element_visibility(bottom_footer, 'hidden')
                self.switch_element_visibility(bottom_bar, 'hidden')
                self.click_btn(field_btn)
                self.switch_element_visibility(bottom_footer, 'visible')
                self.switch_element_visibility(bottom_bar, 'visible')
        field_element = getattr(self, field + 'Text')
        field_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "textarea").near(field_element))[0]
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_element)
        if value:
            self.driver.execute_script("arguments[0].value = '';", field_input)
            field_input.send_keys(value)
        else:
            field_input.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)

    def get_document_text_field(self, field):
        if field != 'comment#0':
            field_btn = field + 'Btn'
            if find_elements_in_page_factory(self, field_btn):
                return ''
        field_element = getattr(self, field + 'Text')
        field_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "textarea").near(field_element))[0]
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_element)
        return field_input.getAttribute("value")

    def set_acknowledgement(self, name, affiliation):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.addAcknowledgementNameSpan)
        name_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "input").
            near(self.addAcknowledgementNameSpan))[0]
        affiliation_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "input").
            near(self.addAcknowledgementAffiliationSpan))[0]

        name_input.send_keys(name)
        affiliation_input.send_keys(affiliation)

    def click_save_acknowledgment_btn(self):
        self.driver.execute_script("arguments[0].click();", self.saveAcknowledgmentBtn)

    def check_acknowledgement_not_exist(self, value):
        return WebDriverWait(self.driver, self.timeout).until(
            EC.invisibility_of_element_located((By.XPATH, f'//div[text()="{value}"]'))
        )

    def get_select_element(self, field):
        if field.endswith('Select'):
            return getattr(self, field)
        text_element = getattr(self, field + "Text")
        field_select_list = self.driver.find_elements(
            locate_with(By.XPATH, "//select[@class='form-select is-invalid']").
            near(text_element))
        if not field_select_list:
            field_select_list = self.driver.find_elements(
                locate_with(By.XPATH, "//select[@class='form-select']").
                near(text_element))
        return field_select_list[0]

    def get_select_value(self, field):
        if not isinstance(field, WebElement):
            field_select = self.get_select_element(field)
        else:
            field_select = field
        all_values = field_select.get_all_list_item()
        selected_item = field_select.get_list_selected_item()
        current_value = selected_item[0] if selected_item else None
        return all_values, current_value

    def set_select_value(self, field):
        field_select = self.get_select_element(field)
        all_values, current_value = self.get_select_value(field_select)
        if field == 'source':
            all_values = self.allowed_sources
        if current_value in all_values:
            all_values.remove(current_value)
        if "" in all_values:
            all_values.remove("")
        if all_values:
            updated_value = all_values[-1]
            field_select.select_element_by_text(updated_value)
        else:
            updated_value = current_value
        return updated_value

    def click_first_edit_btn(self, element):
        first_ack_edit_btn = self.driver.find_elements(
            locate_with(By.XPATH, "//button[@class='btn pe-0 pt-0']").
            to_right_of(element))

        if not first_ack_edit_btn:
            first_ack_edit_btn = self.driver.find_elements(
                locate_with(By.XPATH, "//button[@class='btn pe-1']").
                to_right_of(element))

        self.click_button_with_js(first_ack_edit_btn[0])

    def click_first_ack_edit_btn(self):
        self.click_first_edit_btn(self.acknowledgmentCountLabel)

    def click_first_reference_edit_btn(self):
        self.click_first_edit_btn(self.referenceCountLabel)

    def click_first_ack_delete_btn(self):
        first_ack_delete_btn = self.driver.find_elements(
            locate_with(By.XPATH, "//button[@class='btn ps-1']").
            to_right_of(self.acknowledgmentCountLabel))[0]
        self.click_button_with_js(first_ack_delete_btn)

    def edit_first_ack(self, name, affiliation):
        first_ack_edit_name_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "input").
            near(self.addAcknowledgementNameSpan))[0]

        self.driver.execute_script("arguments[0].value = '';", first_ack_edit_name_input)
        first_ack_edit_name_input.send_keys(name)

        first_ack_edit_affiliation_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "input").
            near(self.addAcknowledgementAffiliationSpan))[0]

        self.driver.execute_script("arguments[0].value = '';", first_ack_edit_affiliation_input)
        first_ack_edit_affiliation_input.send_keys(affiliation)

    def set_components_field(self, value):
        field_input = self.driver.find_elements(
            locate_with(By.XPATH, "//input[@class='osim-pill-list-input no-drag']").
            to_right_of(self.componentsText))[0]

        component_element_list = self.driver.find_elements(By.XPATH, "//i[@class='bi bi-x-square ms-1']")
        for component_element in component_element_list:
            component_element.click()

        field_input.send_keys(value)

    def set_contributors_field(self, value):
        field_input = self.driver.find_elements(
            locate_with(By.XPATH, "//input[@class='osim-contributor-input']").
            to_right_of(self.componentsText))[0]

        field_input.send_keys(value)
        # click first item list in menu
        self.contributorListFirstOption.click_button()

    def get_cvssV3_score(self):
        return find_element_in_page_factory(self, "cvssV3Score").text

    def get_cvssV3_vector(self):
        r = self.driver.find_elements(By.XPATH, "//div[@class='vector-input form-control']/span[position()>1]")
        return "".join([element.text for element in r])

    def set_cvssV3_field(self):
        field_input = self.driver.find_elements(
            locate_with(By.XPATH, "//div[@class='input-wrapper col']").
            near(self.cvssV3Text))[0]

        field_input.click()
        # (//div[@class="btn-group-vertical btn-group-sm osim-factor-severity-select"])[1]/button[position()>1]
        for i in range(1, 9):
            items = self.driver.find_elements(
                By.XPATH, f'(//div[@class="btn-group-vertical btn-group-sm osim-factor-severity-select"])[{i}]/button[position()>1]')

            item = random.choice(items)
            item.click()

        return self.get_cvssV3_score()

    def set_input_field(self, field, value):
        try:
            text_element = getattr(self, field + "Text")
        except ElementNotFoundException:
            if field == "publicDate":
                text_element = self.publicDateFutureText
            else:
                raise

        # find edit button and input using relative locators
        if "Date" not in field:
            edit_btn = self.driver.find_elements(
                locate_with(By.XPATH, "//button[@class='osim-editable-text-pen input-group-text']").
                to_right_of(text_element))[0]
        else:
            edit_btn = self.driver.find_elements(
                locate_with(By.XPATH, "//button[@class='osim-editable-date-pen input-group-text']").
                to_right_of(text_element))[0]

        self.click_button_with_js(edit_btn)

        field_input_list = self.driver.find_elements(
            locate_with(By.XPATH, "//input[@class='form-control']").near(text_element))
        if not field_input_list:
            field_input_list = self.driver.find_elements(
                locate_with(By.XPATH, "//input[@class='form-control is-invalid']").
                near(text_element))

        field_input = field_input_list[0]

        if value == '':
            field_input.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)
        else:
            self.driver.execute_script("arguments[0].value = '';", field_input)
        field_input.send_keys(value)

    def get_input_value(self, field):
        field_value = getattr(self, field + 'Value')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_value)
        return field_value.get_text()

    def check_value_not_exist(self, value):
        return WebDriverWait(self.driver, self.timeout).until(
            EC.invisibility_of_element_located((By.XPATH, f'//span[contains(text(), "{value}")]'))
        )

    def get_text_value(self, field):
        field_value = getattr(self, field + 'Text')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_value)
        return field_value.get_text()

    def delete_all_reference(self):
        """
        delete all reference elements
        """
        try:
            reference_list = find_elements_in_page_factory(self, "referenceList")
        except NoSuchElementException:
            # reference not exist, no-op
            pass
        else:
            # delete all reference
            reference_count = len(reference_list)
            for i in range(reference_count):
                if i == 0:
                    self.click_reference_dropdown_button()
                del_btn_xpath = f"(//div[@class='ps-3 border-start'])[6]/div/div[1]/div/div/div[3]/button[2]"
                del_btn = self.driver.find_element(By.XPATH, del_btn_xpath)
                self.driver.execute_script("arguments[0].scrollIntoView(true);", del_btn)
                self.driver.execute_script("arguments[0].click();", del_btn)
                self.referenceDelConfirmBtn.click_button()
                self.wait_msg("referenceDeletedMsg")
                self.close_all_toast_msg()
                time.sleep(2)

    def add_reference_select_external_type(self):
        try:
            self.driver.execute_script("arguments[0].style.visibility='hidden'", self.bottomBar)
            self.driver.execute_script("arguments[0].style.visibility='hidden'", self.bottomFooter)
        except ElementNotVisibleException:
            pass

        add_reference_select = self.driver.find_elements(
            locate_with(By.TAG_NAME, "select").
            below(self.referenceCountLabel))[0]

        select = Select(add_reference_select)

        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable(
            (By.XPATH, "//select[@value='ARTICLE']//option[contains(.,'External')]")))

        self.driver.execute_script(
            "arguments[0].scrollIntoView({behavior: 'auto',block: 'center',inline: 'center'});",
            add_reference_select)

        time.sleep(2)

        select.select_by_visible_text("External")

    def add_reference_set_link_url(self, value):
        add_reference_link_url_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "input").
            near(self.addReferenceLinkUrlSpan))[0]

        self.clear_text_with_js(add_reference_link_url_input)

        self.driver.execute_script("arguments[0].scrollIntoView(true);", add_reference_link_url_input)
        add_reference_link_url_input.send_keys(value)

    def add_reference_set_description(self, value):
        add_reference_description_input = self.driver.find_elements(
            locate_with(By.TAG_NAME, "textarea").
            below(self.referenceCountLabel))[0]

        self.clear_text_with_js(add_reference_description_input)

        self.driver.execute_script("arguments[0].scrollIntoView(true);", add_reference_description_input)
        add_reference_description_input.send_keys(value)

    def click_reference_dropdown_button(self):
        v = self.referenceCountLabel.get_text()
        reference_count = int(v.split(": ")[1])
        if reference_count > 0:
            reference_dropdown_btn = self.driver.find_elements(
                locate_with(By.XPATH, "//button[@class='me-2 osim-collapsible-toggle']").
                near(self.referenceCountLabel))[0]
            self.click_button_with_js(reference_dropdown_btn)

    def click_first_reference_delete_btn(self):
        first_ack_delete_btn = self.driver.find_elements(
            locate_with(By.XPATH, "//button[@class='btn ps-1']").
            below(self.referenceCountLabel))[0]

        self.click_button_with_js(first_ack_delete_btn)

    def click_acknowledgments_dropdown_btn(self):
        v = self.acknowledgmentCountLabel.get_text()
        reference_count = int(v.split(": ")[1])
        if reference_count > 0:
            reference_dropdown_btn = self.driver.find_elements(
                locate_with(By.XPATH, "//button[@class='me-2 osim-collapsible-toggle']").
                near(self.acknowledgmentCountLabel))[0]
            self.click_button_with_js(reference_dropdown_btn)

    def set_affect_fields(self, module, component, affectedness, resolution, row=1):
        """
        set specified affect field value
        """
        # find specified affect field elements
        try:
            affect_edit_btn = self.driver.find_element(
                By.XPATH, f"(//tbody)[1]/tr[{row}]/td[last()]/button[@title='Edit affect']")
        except NoSuchElementException:
            pass
        else:
            self.click_button_with_js(affect_edit_btn)

        commit_edit_btn = self.driver.find_element(
            By.XPATH, f"(//tbody)[1]/tr[{row}]/td[last()]/button[@title='Commit edit']")
        module_input = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[3]/input")
        component_input = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[4]/input")
        affectedness_select = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[5]/select")
        resolution_select = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[6]/select")
        impact_select = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[7]/select")
        cvss_calculator_icon = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[8]/div/i")
        erase_cvss_button = self.driver.find_element(
            By.XPATH, f"(//tbody)[1]/tr[{row}]/td[8]/div/div/div/div/button[@class='erase-button input-group-text']")

        # Set new affect inputs: PS module, PS component, CVSSv3
        self.clear_text_with_js(module_input)
        module_input.send_keys(module)

        self.clear_text_with_js(component_input)
        component_input.send_keys(component)

        # Set select value for Affectedness, Resolution and Impact
        self.driver.execute_script(
            "arguments[0].scrollIntoView({behavior: 'auto',block: 'center',inline: 'center'});", affectedness_select)

        affectedness_select_element = Select(affectedness_select)
        affectedness_select_element.select_by_value(affectedness)

        resolution_select_element = Select(resolution_select)
        resolution_select_element.select_by_value(resolution)

        impact_select_element = Select(impact_select)
        select_items = [item.text for item in impact_select_element.all_selected_options]
        list_item = [item.text for item in impact_select_element.options if item.text not in select_items]
        impact_select_element.select_by_value(random.choice(list_item))

        # set CVSS field
        self.click_button_with_js(cvss_calculator_icon)
        self.click_button_with_js(erase_cvss_button)
        for i in range(1, 9):
            #
            items = self.driver.find_elements(
                By.XPATH, f'(//div[@class="btn-group-vertical btn-group-sm osim-factor-severity-select"])[{8+i}]/button[position()>1]')

            item = random.choice(items)
            self.click_button_with_js(item)

        # commit edit
        self.click_button_with_js(commit_edit_btn)

    def get_affect_value(self, row=1):
        module = f"(//tbody)[1]/tr[{row}]/td[3]/span"
        component = f"(//tbody)[1]/tr[{row}]/td[4]/span"
        affectedness = f"(//tbody)[1]/tr[{row}]/td[5]/span"
        resolution = f"(//tbody)[1]/tr[{row}]/td[6]/span"
        impact = f"(//tbody)[1]/tr[{row}]/td[7]/span"
        cvss = f"(//tbody)[1]/tr[{row}]/td[8]/span"

        affect = Affect(
            module=self.driver.find_element(By.XPATH, module).get_text(),
            component=self.driver.find_element(By.XPATH, component).get_text(),
            affectedness=self.driver.find_element(By.XPATH, affectedness).get_text(),
            resolution=self.driver.find_element(By.XPATH, resolution).get_text(),
            impact=self.driver.find_element(By.XPATH, impact).get_text(),
            cvss=self.driver.find_element(By.XPATH, cvss).get_text()
        )

        return affect

    def add_new_affect(self, affectedness_value='NEW', random_component=True, save=True):
        from features.utils import generate_random_text
        self.click_button_with_js('addNewAffectBtn')

        module = random.choice(list(AFFECTS_MODULE_COMPONENT_PAIR.keys()))
        component = generate_random_text() if random_component else\
            random.choice(AFFECTS_MODULE_COMPONENT_PAIR[module])

        if affectedness_value == 'NEW' or affectedness_value == 'NOTAFFECTED':
            resolution = ''
        else:
            affectedness_value = 'AFFECTED'
            resolution = 'DELEGATED'

        self.set_affect_fields(
            module=module, component=component, affectedness=affectedness_value,
            resolution=resolution
        )

        # Save all the updates
        if save:
            self.click_btn('saveBtn')
            self.wait_msg('flawSavedMsg')
            self.wait_msg("affectCreatedMsg")
            self.check_element_exists(By.XPATH, "//div[text()='1 CVSS score(s) saved on 1 affect(s).']")

        return component

    def get_an_available_ps_module(self, affect_module):
        # Get the suitable ps_modules for update
        # The modules which under data/community_projects, except fedora-all,
        # have no limitation
        # https://gitlab.cee.redhat.com/prodsec/product-definitions/
        # n = affect_module.split('-')[-1]
        # num = random.randint(11, 40)
        # while True:
        #    if str(num) == n:
        #        num = random.randint(11, 40)
        #    else:
        #        break
        #ps_module = "fedora-" + str(num)
        module_list = list(AFFECTS_MODULE_COMPONENT_PAIR.keys())
        module_list.remove(affect_module)

        return random.choice(module_list)

    def set_select_specific_value(self, field, value):
        select_element = getattr(self, field)
        if not field.endswith('Select'):
            select_element = self.driver.find_elements(
                locate_with(By.XPATH, "//select[@class='form-select']").near(select_element))[0]

        bottom_footer = find_elements_in_page_factory(self, 'bottomFooter')[0]
        bottom_bar = find_elements_in_page_factory(self, 'bottomBar')[0]
        self.switch_element_visibility(bottom_footer, 'hidden')
        self.switch_element_visibility(bottom_bar, 'hidden')

        time.sleep(2)

        select_element.execute_script("arguments[0].scrollIntoView(true);")
        self.close_all_toast_msg()
        select_element.select_element_by_value(value)
        self.switch_element_visibility(bottom_footer, 'visible')
        self.switch_element_visibility(bottom_bar, 'visible')

    def get_field_value_using_relative_locator(self, field, path):
        element = getattr(self, field)
        state_element = self.driver.find_elements(
            locate_with(By.XPATH, path).near(element))[0]
        return state_element.get_text()

    def get_input_field_value_using_relative_locator(self, field):
        return self.get_field_value_using_relative_locator(
            field, "//span[@class='osim-editable-text-value form-control']")

    def get_displayed_affects_number(self):
        affect_rows = find_elements_in_page_factory(self, "affectRows")
        return len(affect_rows)

    def get_all_affects_number(self):
        try:
            return int(self.allAffectNumberSpan.get_text().lstrip("All affects "))
        except ElementNotFoundException:
            return 0

    def get_flaw_id_from_unembargo_warning(self):
        text = self.unembargoWarningText.get_text()
        return text.split("typing ")[1].split()[0]

    def fill_flaw_id_for_unembargo_confirm(self, flaw_id):
        field_input = self.driver.find_elements(
            locate_with(By.XPATH, "//input[@class='form-control']").
            near(self.unembargoConfirmText))[0]

        field_input.send_keys(flaw_id)

    def check_unembargo_btn_not_exist(self):
        return WebDriverWait(self.driver, self.timeout).until(
            EC.invisibility_of_element_located((By.XPATH, "//button[contains(text(), 'Unembargo')]"))
        )

    def trackers_list_count(self, trackers_list):
        if trackers_list == "checkedTrackersList":
            try:
                elements = find_elements_in_page_factory(self, "checkedTrackersList")
            except NoSuchElementException:
                return 0
        else:
            try:
                elements = find_elements_in_page_factory(self, "trackersList")
            except NoSuchElementException:
                return 0
        return len(elements)

    def set_reject_reason(self, value):
        element = getattr(self, 'rejectReasonText')
        reason_text_area = self.driver.find_elements(
            locate_with(By.TAG_NAME, "textarea").below(element))[0]
        reason_text_area.send_keys(value)

    def get_select_value_using_relative_locator(self, field):
        element = getattr(self, field)
        field_select = self.driver.find_elements(
            locate_with(By.XPATH, "//select[@class='form-select']").near(element))[0]
        selected_item = field_select.get_list_selected_item()
        current_value = selected_item[0] if selected_item else None
        return current_value

    def get_valid_search_keywords_from_created_flaw(self):
        public_flaw_result = {}

        # get public flaw search value
        self.click_acknowledgments_dropdown_btn()
        public_flaw_result["acknowledgments__name"] = self.get_field_value_using_relative_locator(
            'acknowledgmentCountLabel', "//div[@class='form-group mb-2']/div"
        ).split('from')[0].strip()
        # "affects__trackers__ps_update_stream",
        first_affect = self.get_affect_value()
        public_flaw_result["affects__affectedness"] = first_affect.affectedness
        public_flaw_result["affects__ps_component"] = first_affect.component
        public_flaw_result["affects__ps_module"] = first_affect.module
        public_flaw_result["cve_description"] = self.get_document_text_field('description')
        public_flaw_result['requires_cve_description'] = self.get_select_value('reviewStatusSelect')[1]
        public_flaw_result['cve_id'] = self.get_input_field_value_using_relative_locator("cveidText")
        public_flaw_result["source"] = self.get_select_value_using_relative_locator("sourceText")
        public_flaw_result["cvss_scores__score"] = self.get_cvssV3_score()
        public_flaw_result["cvss_scores__vector"] = self.get_cvssV3_vector()
        public_flaw_result["cwe_id"] = self.get_input_field_value_using_relative_locator("cweidText")
        public_flaw_result["embargoed"] = "true" if "Yes" in self.get_embargoed_value() else "false"
        # "affects__trackers__errata__advisory_name",
        public_flaw_result['workflow_state'] = self.get_field_value_using_relative_locator(
            'stateText', "//span[@class='form-control rounded-0']")
        public_flaw_result["impact"] = self.get_select_value_using_relative_locator("impactText")
        public_flaw_result["major_incident_state"] = self.get_select_value_using_relative_locator("incidentStateText")
        public_flaw_result["mitigation"] = self.get_document_text_field("mitigation")
        public_flaw_result['owner'] = self.get_input_field_value_using_relative_locator('ownerText')
        public_flaw_result["statement"] = self.get_document_text_field("statement")
        public_flaw_result['title'] = self.get_input_field_value_using_relative_locator('titleText')
        # "affects__trackers__external_system_id",
        # "uuid"

        return public_flaw_result

    def get_value_from_detail_page(self, field):
        if field == "cwe_id":
            return self.get_input_field_value_using_relative_locator("cweidText")
        elif field == "source":
            return self.get_select_value_using_relative_locator(field + 'Text')
        elif field == "cve_description":
            return self.get_document_text_field('description')
        elif field == "requires_cve_description":
            _, value = self.get_select_value('reviewStatusSelect')
            return value
        if field == "embargoed":
            return self.get_field_value_using_relative_locator('embargoedText', "//span[@class='form-control']")

    def check_owner_value_exist(self, value):
        return self.driver.find_element(By.XPATH, f"//span[text()='{value}']")

    def close_all_toast_msg(self):
        for toast_msg in find_elements_in_page_factory(self, 'toastMsgCloseBtn'):
            self.click_button_with_js(toast_msg)

    def set_cvss_score_explanation(self, value):
        cvss_comment_dropdown = self.driver.find_elements(
            locate_with(By.TAG_NAME, "i").near(self.cvssCommentLabel))[0]
        self.click_button_with_js(cvss_comment_dropdown)
        cvss_comment_textarea = self.driver.find_elements(
            locate_with(By.TAG_NAME, "textarea").near(self.cvssCommentLabel))[0]
        if value:
            self.driver.execute_script("arguments[0].value = '';", cvss_comment_textarea)
            cvss_comment_textarea.send_keys(value)
        else:
            cvss_comment_textarea.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)

    def get_cvss_score_explanation(self):
        cvss_comment_dropdown = self.driver.find_elements(
            locate_with(By.TAG_NAME, "i").near(self.cvssCommentLabel))[0]
        self.click_button_with_js(cvss_comment_dropdown)
        cvss_comment_textarea = self.driver.find_elements(
            locate_with(By.TAG_NAME, "textarea").near(self.cvssCommentLabel))[0]
        self.driver.execute_script("arguments[0].scrollIntoView(true);", cvss_comment_textarea)
        return cvss_comment_textarea.getAttribute("value")

    def bulk_delete_affects(self):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.newAddAffectEditBtn)
        self.click_button_with_js('allAffectsCheckBox')
        self.click_button_with_js('bulkRemoveAffectBtn')

    def select_affect_module(self):
        module_buttons1 = find_elements_in_page_factory(self, 'affectModuleWithTrackerBtn')
        module_buttons2 = find_elements_in_page_factory(self, 'affectModuleWithoutTrackerBtn')
        if module_buttons1:
            self.click_button_with_js(module_buttons1[0])
            return self.driver.find_element(
                locate_with(By.TAG_NAME, "span").near(module_buttons1[0])).get_text()
        elif module_buttons2:
            self.click_button_with_js(module_buttons2[0])
            return self.driver.find_element(
                locate_with(By.TAG_NAME, "span").near(module_buttons2[0])).get_text()
        else:
            return None

    def get_affect_filter_result(self, filter):
        affect_rows = find_elements_in_page_factory(self, "affectRows")
        filter_result = []
        for row_index in range(1, len(affect_rows) + 1):
            affect = self.get_affect_value(row_index)
            filter_result.append(getattr(affect, filter))
        return filter_result

    def bulk_update_affects(self):
        from features.utils import generate_random_text
        # get all affect
        affects = find_elements_in_page_factory(self, "affectRows")

        # get current module and affectedness
        module_list, affectedness_list = [], []
        for i in range(len(affects)):
            current_affectedness = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{i+1}]/td[5]/span").text
            affectedness_list.append(current_affectedness)
            current_module = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{i+1}]/td[3]/span").text
            module_list.append(current_module)

        self.click_button_with_js('allAffectsCheckBox')
        self.click_button_with_js("bulkEditAffectBtn")

        check_result = []

        for i in range(len(affects)):
            # Get the available (key, value) for affectedness and resolution
            if affectedness_list[i] == 'NEW':
                affectedness = 'AFFECTED'
                resolution = 'DELEGATED'
            else:
                affectedness = 'NEW'
                resolution = 'DEFER'

            # Generate the random component name to be updated
            ps_component = str(i) + generate_random_text()
            check_result.append(ps_component)

            # Update the fields with the available values
            self.set_affect_fields(
                module=self.get_an_available_ps_module(module_list[i]), component=ps_component,
                affectedness=affectedness, resolution=resolution, row=i+1)

        self.click_btn('saveBtn')
        self.wait_msg('flawSavedMsg')
        self.wait_msg('affectUpdateMsg')
        self.check_element_exists(
            By.XPATH, f"//div[text()='{len(affects)} CVSS score(s) saved on {len(affects)} affect(s).']")

        return check_result

    def collect_affect_filter_data(self, filter, value):
        filter_btn = 'affect' + filter + 'FilterBtn'
        self.click_button_with_js(filter_btn)
        if value == '':
            value = 'EMPTY'
        filter_items = self.driver.find_elements(
            locate_with(By.XPATH, "//ul[@class='dropdown-menu show']/li/a/span[text()='" + value + "']").below(
               getattr(self, filter_btn)))
        result = []
        if filter_items:
            self.click_button_with_js(filter_items[0])
            result = self.get_affect_filter_result(filter.lower())
            self.click_button_with_js(filter_items[0])
        self.click_button_with_js(filter_btn)
        return result

    def change_affect_pagination(self, page_number):
        current_page_number = int(self.affectPaginationNumberSpan.get_text().lstrip("Per page: "))
        if page_number == current_page_number:
            return

        for _ in range(abs(current_page_number - page_number)):
            if page_number < current_page_number:
                self.click_button_with_js("reduceAffectPerPage")
            else:
                self.click_button_with_js("increaseAffectPerPage")

    def get_sorted_affects(self, field):
        affect_rows = find_elements_in_page_factory(self, "affectRows")
        affects = []
        for row_index in range(1, len(affect_rows) + 1):
            affects.append(self.get_affect_value(row_index))
        return [getattr(affect, field) for affect in affects]

    def change_affect_state_for_filter(self):
        # add state
        self.click_button_with_js('addNewAffectBtn')

        # modified state
        # get original value of component field
        original_component_value = self.driver.find_element(
            By.XPATH, "(//tbody)[1]/tr[2]/td[4]/span").text

        second_affect_edit_btn = self.driver.find_element(
            By.XPATH, "(//tbody)[1]/tr[2]/td[last()]/button[@title='Edit affect']")
        self.click_button_with_js(second_affect_edit_btn)
        second_affect_commit_btn = self.driver.find_element(
            By.XPATH, "(//tbody)[1]/tr[2]/td[last()]/button[@title='Commit edit']")
        second_affect_component_input = self.driver.find_element(By.XPATH, "(//tbody)[1]/tr[2]/td[4]/input")
        self.clear_text_with_js(second_affect_component_input)
        second_affect_component_input.send_keys(original_component_value+'-update')

        self.click_button_with_js(second_affect_commit_btn)

        # edit state
        third_affect_edit_btn = self.driver.find_element(
            By.XPATH, "(//tbody)[1]/tr[3]/td[last()]/button[@title='Edit affect']")
        self.click_button_with_js(third_affect_edit_btn)

        # delete state
        fourth_affect_delete_btn = self.driver.find_element(
            By.XPATH, "(//tbody)[1]/tr[4]/td[last()]/button[@title='Remove affect']")
        self.click_button_with_js(fourth_affect_delete_btn)

        # select state
        self.click_button_with_js("firstAffectCheckbox")

    def select_affect_by_state(self):
        self.click_button_with_js("displayEditingAffect")
        assert self.get_displayed_affects_number() == 1

        self.click_button_with_js("displayModifiedAffect")
        assert self.get_displayed_affects_number() == 1

        self.click_button_with_js("displayRemovedAffect")
        assert self.get_displayed_affects_number() == 1

        self.click_button_with_js("displayNewAddedAffect")
        assert self.get_displayed_affects_number() == 1

        self.click_button_with_js("displaySelectedAffect")
        assert self.get_displayed_affects_number() == 1

    def get_embargoed_value(self):
        try:
            value = self.get_field_value_using_relative_locator(
                'embargoedText', "//span[@class='form-control has-button']")
        except IndexError:
            value = self.get_field_value_using_relative_locator(
                'embargoedText', "//span[@class='form-control']")

        return value

    def get_unfiled_tracker_number(self):
        return len(self.driver.find_elements(By.XPATH, "//div[@class='osim-tracker-list mb-2']/label"))

    def get_unfiled_tracker_product_stream(self, row=1):
        return self.driver.find_element(
            By.XPATH, f"//div[@class='osim-tracker-list mb-2']/label[{row}]/span/span[1]").get_text()

    def get_selected_tracker_number(self):
        return len(self.driver.find_elements(By.XPATH, "//div[@class='osim-tracker-list mt-2']/label"))

    def wait_trackers_loaded_in_tracker_manager(self):
        time.sleep(2)
        self.check_element_exists(By.XPATH, "//div[@class='osim-tracker-list-container ms-3 mt-2 pb-3']")
        self.check_value_not_exist("Querying available trackers…")

    def file_tracker(self, row=1):
        # get tracker's product stream
        product_stream = self.get_unfiled_tracker_product_stream(row)
        # select first tracker
        self.driver.find_element(By.XPATH, f"//div[@class='osim-tracker-list mb-2']/label[{row}]/input").click()
        # file tracker
        self.driver.find_element(By.XPATH, "//button[text()=' File 1 Trackers ']").click()
        self.wait_msg("trackersFiledMsg")
        self.close_all_toast_msg()
        # close tracker manager window
        self.click_button_with_js(self.trackerManagerCloseBtn)
        time.sleep(2)

        return product_stream

    def file_tracker_for_specific_affect(self, component):
        """
        Click plus(+) button of an affect to file tracker
        """
        plus_button = self.driver.find_element(By.XPATH, f"//span[@title='{component}']/ancestor::tr/td[9]/div/button")
        self.click_button_with_js(plus_button)
        self.wait_trackers_loaded_in_tracker_manager()
        # click deselectAll button
        self.click_button_with_js(self.deselectAllTracker)

        return self.file_tracker(row=1)

    def file_tracker_for_selected_affects(self):
        n = self.get_displayed_affects_number()
        self.click_button_with_js('allAffectsCheckBox')
        manage_tracker_btn = self.driver.find_element(
            By.XPATH, f"//button[@title='Manage trackers for {n} selected affect(s)']")
        module_component_pairs = []
        for i in range(n):
            affect = self.get_affect_value(i+1)
            module_component_pairs.append(f"{affect.module}/{affect.component}")

        self.click_button_with_js(manage_tracker_btn)
        for v in module_component_pairs:
            self.check_text_exist(v)

        self.wait_trackers_loaded_in_tracker_manager()

        # click deselectAll button
        self.click_button_with_js(self.deselectAllTracker)

        return self.file_tracker(row=1)

    def select_filter_tracker(self):
        self.click_button_with_js("showTrackerManagerBtn")
        self.wait_trackers_loaded_in_tracker_manager()
        # click deselectAll button
        self.click_button_with_js(self.deselectAllTracker)

        # get first tracker's product stream
        product_stream = self.get_unfiled_tracker_product_stream(row=1)

        self.filterModuleComponentInput.set_text(product_stream)
        self.click_button_with_js('selectFilteredTrackerBtn')

        return product_stream

    def is_tracker_selected(self, product_stream):
        self.check_element_exists(
            By.XPATH, f"//div[@class='osim-tracker-list mt-2']/label/span/span[1][text()='{product_stream}']")

        tracker_check_box = self.driver.find_element(
            By.XPATH, f"//div[@class='osim-tracker-list mt-2']/label/span/span[1][text()='{product_stream}']/../../input")

        return tracker_check_box.is_selected()

    def get_tracker_number_of_displayed_tracker_list(self):
        return len(self.driver.find_elements(
            By.XPATH, "//div[@class='osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark']/table/tbody/tr"))

    def get_tracker_value(self, row=1):
        bug_id = f"//div[@class='osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark']/table/tbody/tr[{row}]/td[1]/a"
        module = f"//div[@class='osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark']/table/tbody/tr[{row}]/td[2]"
        product_stream = f"//div[@class='osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark']/table/tbody/tr[{row}]/td[3]"
        status = f"//div[@class='osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark']/table/tbody/tr[{row}]/td[4]"
        resolution = f"//div[@class='osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark']/table/tbody/tr[{row}]/td[5]"
        created_date = f"//div[@class='osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark']/table/tbody/tr[{row}]/td[6]"
        updated_date = f"//div[@class='osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark']/table/tbody/tr[{row}]/td[7]"

        tracker = Tracker(
            bug_id=self.driver.find_element(By.XPATH, bug_id).get_attribute('href'),
            module=self.driver.find_element(By.XPATH, module).text,
            product_stream=self.driver.find_element(By.XPATH, product_stream).text,
            status=self.driver.find_element(By.XPATH, status).text,
            resolution=self.driver.find_element(By.XPATH, resolution).text,
            created_date=self.driver.find_element(By.XPATH, created_date).text,
            updated_date=self.driver.find_element(By.XPATH, updated_date).text
        )

        return tracker

    def get_value_list_of_displayed_tracker_list(self, field):
        n = self.get_tracker_number_of_displayed_tracker_list()
        return [
            getattr(self.get_tracker_value(i+1), field) for i in range(n)]
