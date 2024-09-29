import json
import random
import time
import urllib.parse
from collections import namedtuple

import requests
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
from features.constants import (
    OSIDB_URL,
    AFFECTED_MODULE_BZ,
    AFFECTED_MODULE_JR
)
from features.common_utils import get_flaw_id, generate_cvss3_vector_string


Affect = namedtuple(
    'Affect',
    ["module", "component", "affectedness", "resolution", "impact", "cvss"])


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
        "descriptionText": ("XPATH", "//span[contains(text(), 'Description')]"),
        "reviewStatusSelect": ("XPATH", "//select[@class='form-select col-3 osim-description-required']"),
        "statementBtn": ("XPATH", "//button[contains(text(), 'Add Statement')]"),
        "statementText": ("XPATH", "//span[contains(text(), 'Statement')]"),
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

        "cvssV3Text": ("XPATH", "//span[text()=' CVSSv3 ']"),
        "cvssV3Score": ("XPATH", "//span[@class='osim-cvss-score']"),
        "cvssV3EraseButton": ("XPATH", "//button[@class='erase-button input-group-text']"),
        "cvssV3SavedMsg": ("XPATH", "//div[text()='Saved CVSS Scores']"),
        "cvssV3DeleteMsg": ("XPATH", "//div[text()='CVSS score deleted.']"),

        "reportedDateText": ("XPATH", "//span[text()='Reported Date']"),
        "reportedDateValue": ("XPATH", "(//span[@class='osim-editable-date-value form-control text-start form-control'])[1]"),
        "publicDateText": ("XPATH", "//span[text()='Public Date']"),
        "publicDateFutureText": ("XPATH", "//span[text()='Public Date [FUTURE]']"),
        "publicDateValue": ("XPATH", "(//span[@class='osim-editable-date-value form-control text-start form-control'])[2]"),

        "ownerText": ("XPATH", "//span[contains(text(), 'Owner')]"),
        "owner": ("XPATH", "//span[contains(text(), 'Owner')]"),
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
        "addNewAffectBtn": ("XPATH", "//button[contains(text(), 'Add New Affect')]"),
        "selects": ("XPATH", "//select[@class='form-select']"),
        "affectCreatedMsg": ("XPATH", "//div[text()='Affects Created.']"),

        # Affects locators
        "newAddAffectEditBtn": ("XPATH", "(//tbody)[1]/tr[1]/td[last()]/button[@title='Edit affect']"),
        "newAddAffectCommitBtn": ("XPATH", "//button[@title='Commit edit']"),
        "newAddAffectModuleInput": ("XPATH", "(//tbody)[1]/tr[1]/td[3]/input"),
        "newAddAffectComponentInput": ("XPATH", "(//tbody)[1]/tr[1]/td[4]/input"),
        "newAddAffectAffectednessSelect": ("XPATH", "(//tbody)[1]/tr[1]/td[5]/select"),
        "newAddAffectResolutionSelect": ("XPATH", "(//tbody)[1]/tr[1]/td[6]/select"),
        "newAddAffectImpactSelect": ("XPATH", "(//tbody)[1]/tr[1]/td[7]/select"),
        "newAddAffectCVSSInput": ("XPATH", "(//tbody)[1]/tr[1]/td[8]/input"),
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

        "affectDropdownBtn": ("XPATH", "(//i[@class='bi bi-plus-square-dotted me-1'])[last()]"),
        "affectUpdateMsg": ("XPATH", "//div[text()='Affects Updated.']"),
        "affectScoreSaveMsg": ("XPATH", "//div[text()='Affects CVSS scores saved.']"),
        "affectSaveMsg": ("XPATH", "//div[contains(text(), 'Affect 1 of 1 Saved:')]"),
        "affectDeleteTips": ("XPATH", "//h5[contains(text(), 'Affected Offerings To Be Deleted')]"),
        "affectDeleteMsg": ("XPATH", "//div[text()='1 Affect(s) Deleted.']"),
        "affectAffectednessText": ("XPATH", "//span[contains(text(), 'Affectedness:')]"),
        "affectRecoverBtn": ("XPATH", "//button[@title='Recover']"),
        "affectExpandall": ("XPATH", "//button[contains(text(), 'Expand All Affects')]"),
        "affectNoTrackerPlus": ("XPATH", "//span[contains(text(), '0 trackers')]"),
        "firstAffectItem": ("XPATH", "(//span[contains(text(), '1 affected')])[1]"),
        "ManageTrackers": ("XPATH", "//button[contains(text(), 'Manage Trackers')]"),
        "affectUpstreamCheckbox": ("XPATH", "(//div[@class='osim-tracker-selections mb-2']/label)[1]"),
        "fileSelectedTrackers": ("XPATH", "//button[contains(text(), 'File Selected Trackers')]"),
        "trackersFiledMsg": ("XPATH", "//div[contains(text(), 'trackers filed')]"),
        "disabledfileSelectTrackers": ("XPATH", "//button[contains(text(), 'File Selected Trackers') and @disabled='']"),
        "filedTrackers": ("XPATH", "(//div[@class='osim-tracker-selections mb-2']//input[@disabled='' and @checked=''])[1]"),
        "trackerJiraSummary": ("XPATH", "//summary[contains(text(), AFFECTED_MODULE_JR)][1]"),
        "trackerBzSummary": ("XPATH", "//summary[contains(text(), AFFECTED_MODULE_BZ)][1]"),
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
        'stateText': ("XPATH", "(//span[contains(text(), 'State')])[1]"),
        'embargoedText': ("XPATH", "//span[contains(text(), 'Embargo')]"),
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
        'VENDORSEC',
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
            field_select.select_element_by_value(updated_value)
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
            (By.XPATH, "//select[@class='form-select mb-2 osim-reference-types']//option[contains(.,'External')]")))

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

    def set_affect_fields(self, module, component, affectedness, resolution, cvss_vector, row=1):
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

        module_input = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[3]/input")
        component_input = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[4]/input")
        affectedness_select = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[5]/select")
        resolution_select = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[6]/select")
        impact_select = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[7]/select")
        cvss_input = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{row}]/td[8]/input")

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
        cvss_input.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)
        cvss_input.send_keys(cvss_vector)

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

    def add_new_affect(self, external_system='jira', affectedness_value='NEW', save=True):
        from features.utils import generate_random_text
        self.click_button_with_js('addNewAffectBtn')

        module = AFFECTED_MODULE_JR if external_system == 'jira' else AFFECTED_MODULE_BZ
        component = generate_random_text()

        if affectedness_value == 'NEW' or affectedness_value == 'NOTAFFECTED':
            resolution = ''
        else:
            affectedness_value = 'AFFECTED'
            resolution = 'DELEGATED'

        cvss_vector = generate_cvss3_vector_string()

        self.set_affect_fields(
            module=module, component=component, affectedness=affectedness_value,
            resolution=resolution, cvss_vector=cvss_vector
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
        if affect_module == AFFECTED_MODULE_BZ:
            return AFFECTED_MODULE_JR
        else:
            return AFFECTED_MODULE_BZ

    def set_select_specific_value(self, field, value):
        select_element = getattr(self, field)
        if not field.endswith('Select'):
            select_element = self.driver.find_elements(
                locate_with(By.XPATH, "//select[@class='form-select']").near(select_element))[0]
        self.close_all_toast_msg()

        bottom_footer = find_elements_in_page_factory(self, 'bottomFooter')[0]
        bottom_bar = find_elements_in_page_factory(self, 'bottomBar')[0]
        self.switch_element_visibility(bottom_footer, 'hidden')
        self.switch_element_visibility(bottom_bar, 'hidden')

        time.sleep(2)

        select_element.execute_script("arguments[0].scrollIntoView(true);")
        select_element.select_element_by_value(value)
        self.switch_element_visibility(bottom_footer, 'visible')
        self.switch_element_visibility(bottom_bar, 'visible')

    def load_affects_results_from_osidb(self, token):
        url = urllib.parse.urljoin(OSIDB_URL, "osidb/api/v1/flaws")
        headers = {"Authorization": f"Bearer {token}"}
        cve_id = get_flaw_id()
        if cve_id.startswith("CVE-"):
            params = {"cve_id": cve_id}
        else:
            params = {"uuid": cve_id}
        r = requests.get(url, params=params, headers=headers)
        return json.loads(r.text).get('results')[0]

    def get_affect_values(self, fields, token, component_value):
        osidb_token = token
        flaw_info = self.load_affects_results_from_osidb(osidb_token)
        # Get the field value dict that related to the updated affect
        field_value_dict = {}
        for affect in flaw_info.get('affects'):
            # One module and one module combination should be unique.
            # One unique component is associated one affect in affect list
            if affect.get('ps_component') == component_value:
                for field in fields:
                    if affect.get(field):
                        field_value = affect.get(field)
                        field_value_dict[field] = field_value
                    else:
                        field_value_dict[field] = ''
        return field_value_dict

    def set_select_value_for_affect(self, field):
        field_element = getattr(self, field)
        select_element = self.driver.find_elements(
            locate_with(By.XPATH, "//select[@class='form-select']").near(field_element))[0]
        select_element.execute_script("arguments[0].scrollIntoView(true);")
        if 'affects' in field:
            hide_bar = find_elements_in_page_factory(self, 'bottomBar')[0]
            self.driver.execute_script("arguments[0].style.visibility='hidden'", hide_bar)
        select_list = select_element.get_all_list_item()
        selected_list = select_element.get_list_selected_item()
        if selected_list[0] in select_list:
            select_list.remove(selected_list[0])
        updated_value = random.choice(select_list)
        select_element.execute_script("arguments[0].scrollIntoView(true);")
        select_element.select_element_by_value(updated_value)
        if 'affects' in field:
            self.driver.execute_script("arguments[0].style.visibility='visible'", hide_bar)
        return updated_value

    def get_selected_value_for_affect(self, field):
        field_element = getattr(self, field)
        select_element = self.driver.find_elements(
            locate_with(By.XPATH, "//select[@class='form-select']").near(field_element))[0]
        select = Select(select_element)
        current_value = select.first_selected_option.text
        return current_value

    def get_current_value_of_field(self, field):
        field_element = getattr(self, field)
        input_element = self.driver.find_elements(
            locate_with(By.XPATH, "//span[@class='osim-editable-text-value form-control']").near(field_element))[0]
        current_value = input_element.get_text()
        return current_value

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

    def click_plusdropdown_btn(self, field):
        element = getattr(self, field)
        dropdown_btn = self.driver.find_elements(
            locate_with(By.XPATH, "//button[@class='me-2 osim-collapsible-toggle']").near(element))[0]
        self.driver.execute_script("arguments[0].click();", dropdown_btn)

    def display_affect_detail(self):
        self.click_button_with_js("affectExpandall")
        self.click_button_with_js('affectDropdownBtn')

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

    def get_select_element_value(self, field):
        element = getattr(self, field)
        field_select = self.driver.find_elements(
            locate_with(By.XPATH, "//select[@class='form-select']").near(element))[0]
        selected_item = field_select.get_list_selected_item()
        current_value = selected_item[0] if selected_item else None
        return current_value

    def get_field_value(self, field,  path):
        element = getattr(self, field)
        state_element = self.driver.find_elements(
            locate_with(By.XPATH, path).near(element))[0]
        return state_element.get_text()

    def get_valid_search_keywords_from_created_flaw(self, fields):
        result = {}
        for field in fields:
            if field == 'cve_id':
                result[field] = self.get_current_value_of_field("cveidText")
            elif field == "cwe_id":
                result[field] = self.get_current_value_of_field("cweidText")
            elif field in ['title', 'owner']:
                result[field] = self.get_current_value_of_field(field+'Text')
            elif field in ["impact", "source"]:
                result[field] = self.get_select_element_value(field + 'Text')
            elif field == "workflow_state":
                result[field] = self.get_field_value('stateText', "//span[@class='form-control rounded-0']")
            elif field == "cve_description":
                 result[field] = self.get_document_text_field('description')
            elif field == "requires_cve_description":
                _,result[field] = self.get_select_value('reviewStatusSelect')
            elif field == "embargoed":
                result[field] = 'false'
        return(result)

    def get_value_from_detail_page(self, field):
        if field == "cwe_id":
            return self.get_current_value_of_field("cweidText")
        elif field == "source":
            return self.get_select_element_value(field + 'Text')
        elif field == "cve_description":
            return self.get_document_text_field('description')
        elif field == "requires_cve_description":
            _, value = self.get_select_value('reviewStatusSelect')
            return value
        if field == "embargoed":
            return self.get_field_value('embargoedText', "//span[@class='form-control']")

    def check_owner_value_exist(self, value):
        return self.driver.find_element(By.XPATH, f"//span[text()='{value}']")

    def close_all_toast_msg(self):
        for toast_msg in find_elements_in_page_factory(self, 'toastMsgCloseBtn'):
            self.click_button_with_js(toast_msg)

    def set_cvss_score_explanation(self, value):
        cvss_comment_dropdown  = self.driver.find_elements(
            locate_with(By.TAG_NAME, "i").near(self.cvssCommentLabel))[0]
        self.click_button_with_js(cvss_comment_dropdown)
        cvss_comment_textarea  = self.driver.find_elements(
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
        affectedness_list = []
        for i in range(len(affects)):
            current_affectedness = self.driver.find_element(By.XPATH, f"(//tbody)[1]/tr[{i+1}]/td[5]/span").text
            affectedness_list.append(current_affectedness)

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
                resolution = ''

            # Generate the random component name to be updated
            ps_component = str(i) + generate_random_text()
            check_result.append(ps_component)

            # Update the fields with the available values
            cvss = generate_cvss3_vector_string()
            check_result.append(cvss)

            self.set_affect_fields(
                module=AFFECTED_MODULE_JR, component=ps_component, affectedness=affectedness,
                resolution=resolution, cvss_vector=cvss, row=i+1)

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
