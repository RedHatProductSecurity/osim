import json
import os
import random
import requests
import urllib.parse
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
from features.page_factory_utils import find_elements_in_page_factory
from features.constants import (
    OSIDB_URL
)


class FlawDetailPage(BasePage):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "comment#0Text": ("XPATH", "//span[text()='Comment#0']"),
        "descriptionBtn": ("XPATH", "//button[contains(text(), 'Add Description')]"),
        "descriptionText": ("XPATH", "//span[contains(text(), 'Description')]"),
        "statementBtn": ("XPATH", "//button[contains(text(), 'Add Statement')]"),
        "statementText": ("XPATH", "//span[text()='Statement']"),
        "mitigationBtn": ("XPATH", "//button[contains(text(), 'Add Mitigation')]"),
        "mitigationText": ("XPATH", "//span[text()='Mitigation']"),
        "addCommentBtn": ("XPATH", "//button[contains(text(), 'Comment')]"),
        "newCommentText": ("XPATH", "//span[text()='New Public Comment']"),
        "resetBtn": ("XPATH", '//button[text()="Reset Changes"]'),
        "saveBtn": ("XPATH", '//button[text()=" Save Changes "]'),
        "flawSavedMsg": ("XPATH", "//div[text()='Flaw saved']"),
        "flawCreatedMsg": ("XPATH", "//div[text()='Flaw created']"),

        "addAcknowledgmentBtn": ("XPATH", "//button[contains(text(), 'Add Acknowledgment')]"),
        "acknowledgmentCountLabel": ("XPATH", "//label[contains(text(), 'Acknowledgments:')]"),
        "addAcknowledgementNameSpan": ("XPATH", "//span[text()='Name']"),
        "addAcknowledgementAffiliationSpan": ("XPATH", "//span[text()='Affiliation']"),
        "firstAcknowledgementValueText": ("XPATH", '(//div[contains(text(), "from")])[1]'),
        "firstAcknowledgmentEditBtnUnclick": ("XPATH", "//div[@class='osim-list-edit'][1]/div[3]/button[1]"),
        "firstAcknowledgmentEditBtnClicked": ("XPATH", "(//div[@class='osim-list-edit'])[1]/div[2]/button[1]"),
        "saveAcknowledgmentBtn": ("XPATH", '//button[contains(text(), "Save Changes to Acknowledgments")]'),
        "acknowledgmentSavedMsg": ("XPATH", '//div[text()="Acknowledgment created."]'),
        "confirmAcknowledgmentDeleteBtn": ("XPATH", '//button[contains(text(), "Confirm")]'),
        "acknowledgmentUpdatedMsg": ("XPATH", "//div[text()='Acknowledgment updated.']"),
        "acknowledgmentDeletedMsg": ("XPATH", "//div[text()='Acknowledgment deleted.']"),

        "impactSelect": ("XPATH", "(//select[@class='form-select'])[1]"),
        "sourceSelect": ("XPATH", "(//select[@class='form-select'])[2]"),

        "titleText": ("XPATH", "//span[text()='Title']"),
        "titleValue": ("XPATH", "(//span[@class='osim-editable-text-value form-control'])[1]"),

        "componentText": ("XPATH", "//span[text()='Component']"),

        "cveidText": ("XPATH", "//span[text()='CVE ID']"),
        "cveidValue": ("XPATH", "(//span[@class='osim-editable-text-value form-control'])[3]"),

        "cweidText": ("XPATH", "//span[text()='CWE ID']"),
        "cweidValue": ("XPATH", "(//span[@class='osim-editable-text-value form-control'])[5]"),

        "reportedDateText": ("XPATH", "//span[text()='Reported Date']"),
        "reportedDateValue": ("XPATH", "(//span[@class='osim-editable-date-value form-control text-start form-control'])[1]"),

        "publicDateText": ("XPATH", "//span[text()='Public Date']"),
        "publicDateValue": ("XPATH", "(//span[@class='osim-editable-date-value form-control text-start form-control'])[2]"),

        "assigneeText": ("XPATH", "//span[contains(text(), 'Assignee')]"),
        "assignee": ("XPATH", "//span[contains(text(), 'Assignee')]"),
        "selfAssignBtn": ("XPATH", "//button[contains(text(), 'Self Assign')]"),

        "referenceCountLabel": ("XPATH", '//label[contains(text(), "References:")]'),
        "addReferenceBtn": ("XPATH", "//button[contains(text(), 'Add Reference')]"),
        "saveReferenceBtn": ("XPATH", "//button[contains(text(), 'Save Changes to References')]"),
        "referenceList": ("XPATH", "(//div[@class='ps-3 border-start'])[1]/div/div"),
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
        "addNewAffectBtn": ("XPATH", "//button[contains(text(), 'Add New Affect')]"),
        "selects": ("XPATH", "//select[@class='form-select']"),
        "affectCreatedMsg": ("XPATH", "//div[text()='Affect Created.']"),
        # Affects locators
        "affectDropdownBtn": ("XPATH", "(//i[@class='bi bi-plus-square-dotted me-1'])[last()]"),
        "affects__ps_module": ("XPATH", "(//span[text()='Affected Module'])[1]"),
        "affects__ps_component": ("XPATH", "(//span[text()='Affected Component'])[1]"),
        "affects__cvss3_score": ("XPATH", "(//span[text()='CVSSv3'])[1]"),
        "affects__affectedness": ("XPATH", "(//span[text()='Affectedness'])[1]"),
        "affects__resolution": ("XPATH", "(//span[text()='Resolution'])[1]"),
        "affects__impact": ("XPATH", "(//span[text()='Impact'])[2]"),
        "affectUpdateMsg": ("XPATH", "//div[text()='Affects Updated.']"),
        "affectSaveMsg": ("XPATH", "//div[contains(text(), 'Affect 1 of 1 Saved:')]"),
        "affectDeleteTips": ("XPATH", "//h5[contains(text(), 'Affected Offerings To Be Deleted')]"),
        "affectDeleteMsg": ("XPATH", "//div[text()='Affect Deleted.']"),
        "affectAffectednessText": ("XPATH", "//span[contains(text(), 'Affectedness:')]"),
        "affectRecoverBtn": ("XPATH", "//button[@title='Recover']"),
        "affectNotSave": ("XPATH", "//span[contains(text(), 'Not Saved in OSIDB')]"),
        "affectExpandall": ("XPATH", "//button[contains(text(), 'Expand All')]"),
        "affectNoTrackerPlus": ("XPATH", "//span[contains(text(), '0 trackers')]"),
        "unembargoBtn": ("XPATH", "//button[contains(text(), 'Unembargo')]"),
        "unembargoWarningText": ("XPATH", "//div[@class='alert alert-info']"),
        "unembargoConfirmText": ("XPATH", "//span[text()='Confirm']"),
        "removeEmbargoBtn": ("XPATH", "//button[contains(text(), 'Remove Embargo')]")
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

    def add_comment_btn_exist(self):
        self.addCommentBtn.visibility_of_element_located()

    def save_button_exist(self):
        self.saveBtn.visibility_of_element_located()

    def set_comment_value(self, value):
        self.addCommentBtn.execute_script("arguments[0].scrollIntoView(true);")
        div = self.driver.find_elements(
            locate_with(By.TAG_NAME, "div").above(self.newCommentText))[0]
        comment_text_area = self.driver.find_elements(
            locate_with(By.TAG_NAME, "textarea").below(div))[0]
        comment_text_area.send_keys(value)

    def set_document_text_field(self, field, value):
        if field != 'comment#0':
            field_btn = field + 'Btn'
            if find_elements_in_page_factory(self, field_btn):
                self.driver.execute_script("arguments[0].scrollIntoView(true);", getattr(self, field_btn))
                hide_e1 = find_elements_in_page_factory(self, 'bottomFooter')[0]
                hide_e2 = find_elements_in_page_factory(self, 'bottomBar')[0]
                self.driver.execute_script("arguments[0].style.visibility='hidden'", hide_e1)
                self.driver.execute_script("arguments[0].style.visibility='hidden'", hide_e2)
                self.click_btn(field_btn)
                self.driver.execute_script("arguments[0].style.visibility='visible'", hide_e1)
                self.driver.execute_script("arguments[0].style.visibility='visible'", hide_e2)
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

    def check_acknowledgement_exist(self, value):
        e = self.driver.find_element(By.XPATH, f'//div[text()="{value}"]')
        return WebDriverWait(self.driver, self.timeout).until(
            EC.visibility_of(e)
        )

    def check_acknowledgement_not_exist(self, value):
        return WebDriverWait(self.driver, self.timeout).until(
            EC.invisibility_of_element_located((By.XPATH, f'//div[text()="{value}"]'))
        )

    def get_select_value(self, field):
        if not isinstance(field, WebElement):
            field_select = getattr(self, field + 'Select')
        else:
            field_select = field
        all_values = field_select.get_all_list_item()
        selected_item = field_select.get_list_selected_item()
        current_value = selected_item[0] if selected_item else None
        return (all_values, current_value)

    def set_select_value(self, field):
        field_select = getattr(self, field + 'Select')
        self.driver.execute_script("arguments[0].value = '';", field_select)
        all_values, current_value = self.get_select_value(field)
        if field == 'source':
            all_values = self.allowed_sources
        if current_value:
            all_values.remove(current_value)
        if all_values:
            updated_value = all_values[-1]
            field_select.select_element_by_value(updated_value)
        else:
            updated_value = current_value
        return updated_value

    def click_first_ack_edit_btn(self):
        first_ack_edit_btn = self.driver.find_elements(
            locate_with(By.XPATH, "//button[@class='btn pe-0 pt-0']").
            to_right_of(self.acknowledgmentCountLabel))

        if not first_ack_edit_btn:
            first_ack_edit_btn = self.driver.find_elements(
                locate_with(By.TAG_NAME, "button").
                to_right_of(self.acknowledgmentCountLabel))

        self.click_button_with_js(first_ack_edit_btn[0])

    def click_first_ack_delete_btn(self):
        first_ack_edit_btn = self.driver.find_elements(
            locate_with(By.TAG_NAME, "button").
            to_right_of(self.acknowledgmentCountLabel))[0]

        first_ack_delete_btn = self.driver.find_elements(
            locate_with(By.XPATH, "//button[@class='btn ps-1']").
            near(first_ack_edit_btn))[0]
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

    def set_input_field(self, field, value):
        text_element = getattr(self, field + "Text")
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

        if ("cveid" in field) or ("cweid" in field):
            field_input = self.driver.find_elements(
                locate_with(By.XPATH, "//input[@class='form-control']").
                near(text_element))[0]
        else:
            field_input = self.driver.find_elements(
                locate_with(By.XPATH, "//input[@class='form-control is-invalid']").
                near(text_element))[0]

        self.driver.execute_script("arguments[0].value = '';", field_input)
        field_input.send_keys(value)

    def get_input_value(self, field):
        field_value = getattr(self, field + 'Value')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_value)
        return field_value.get_text()

    def clear_input_field(self, field):
        field_btn = field + 'EditBtn'
        self.click_btn(field_btn)
        field_input = getattr(self, field + 'Input')
        field_input.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)

    def check_value_not_exist(self, value):
        return WebDriverWait(self.driver, self.timeout).until(
            EC.invisibility_of_element_located((By.XPATH, f'//span[contains(text(), "{value}")]'))
        )

    def get_text_value(self, field):
        field_value = getattr(self, field + 'Text')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_value)
        return field_value.get_text()

    def delete_all_reference(self):
        # edit ((//div[@class='osim-list-edit'])[n]/div[2]/button)[1]
        # delete ((//div[@class='osim-list-edit'])[n]/div[2]/button)[2]
        try:
            reference_list = find_elements_in_page_factory(self, "referenceList")
        except NoSuchElementException:
            # reference not exist, no-op
            pass
        else:
            # delete all reference
            reference_count = len(reference_list)
            for i in range(1, reference_count+1):
                del_btn_xpath = f"//div[@class='ps-3 border-start']/div/div[{i}]/div/div/div[3]/button[2]"
                del_btn = self.driver.find_element(By.XPATH, del_btn_xpath)
                self.driver.execute_script("arguments[0].scrollIntoView(true);", del_btn)
                self.driver.execute_script("arguments[0].click();", del_btn)
                self.referenceDelConfirmBtn.click_button()
                self.wait_msg("referenceDeletedMsg")
                self.toastMsgCloseBtn.click_button()

    def add_reference_select_external_type(self):
        self.driver.execute_script(
            "arguments[0].scrollIntoView({behavior: 'auto',block: 'center',inline: 'center'});",
            self.saveReferenceBtn)
        try:
            self.driver.execute_script("arguments[0].style.visibility='hidden'", self.bottomBar)
            self.driver.execute_script("arguments[0].style.visibility='hidden'", self.bottomFooter)
        except ElementNotVisibleException:
            pass

        add_reference_select = self.driver.find_elements(
            locate_with(By.TAG_NAME, "select").
            below(self.referenceCountLabel))[0]

        select = Select(add_reference_select)
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

    def set_new_affect_inputs(self, external_system = 'jira', affectedness = 'NEW'):
        from features.utils import generate_random_text
        self.click_button_with_js('addNewAffectBtn')
        self.click_plusdropdown_btn('affectNotSave')

        # Set new affect inputs: PS module, PS component, CVSSv3
        if external_system == 'jira':
            self.set_field_value('affects__ps_module', 'rhel-8')
        else:
            self.set_field_value('affects__ps_module', 'fedora-39')
        ps_component_value = generate_random_text()
        self.set_field_value('affects__ps_component', ps_component_value)
        self.set_field_value('affects__cvss3_score', '4.3')

        # Set select value for Affectedness, Resolution and Impact
        selects = find_elements_in_page_factory(self, 'selects')
        (affectedness, resolution, impact) = selects[-3:]
        affectedness_select = Select(affectedness)
        if affectedness == 'NEW':
            affectedness_select.select_by_value('NEW')
            resolution_select = Select(resolution)
            resolution_select.select_by_value('')
        else:
            affectedness_select.select_by_value('AFFECTED')
            resolution_select = Select(resolution)
            resolution_select.select_by_value('DELEGATED')
        impact.execute_script("arguments[0].scrollIntoView(true);")

        hide_bar = find_elements_in_page_factory(self, 'bottomBar')[0]
        self.driver.execute_script("arguments[0].style.visibility='hidden'", hide_bar)
        impact_select = Select(impact)
        impact_select.select_by_value('LOW')
        self.driver.execute_script("arguments[0].style.visibility='visible'", hide_bar)
        self.click_btn('saveBtn')
        self.wait_msg('affectCreatedMsg')
        return ps_component_value
  
    def get_an_available_ps_module(self, affect_module):
        # Get the suitable ps_modules for update
        # The modules which under data/community_projects, except fedora-all,
        # have no limitation
        # https://gitlab.cee.redhat.com/prodsec/product-definitions/
        n = affect_module.split('-')[-1]
        num = random.randint(11, 40)
        while True:
            if str(num) == n:
                num = random.randint(11, 40)
            else:
                break
        ps_module = "fedora-" + str(num)
        return ps_module

    def set_select_specific_value(self, field, value):
        field_element = getattr(self, field)
        select_element = self.driver.find_elements(
            locate_with(By.XPATH, "//select[@class='form-select']").near(field_element))[0]
        try:
            self.driver.execute_script("arguments[0].style.visibility='hidden'", self.bottomBar)
            self.driver.execute_script("arguments[0].style.visibility='hidden'", self.bottomFooter)
        except ElementNotVisibleException:
            pass
        select_element.execute_script("arguments[0].scrollIntoView(true);")
        select_element.select_element_by_value(value)

    def load_affects_results_from_osidb(self, token):
        url = urllib.parse.urljoin(OSIDB_URL, "osidb/api/v1/flaws")
        headers = {"Authorization": f"Bearer {token}"}
        cve_id = os.getenv("FLAW_ID")
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

    def set_field_value(self, field, value):
        field_element = getattr(self, field)
        # Get the pen element of the field and click it
        pen_element = self.driver.find_elements(
            locate_with(By.XPATH, "//button[@class='osim-editable-text-pen input-group-text']").to_right_of(field_element))[0]
        self.driver.execute_script("arguments[0].click();", pen_element)
        # Get the input field and set the value
        input_element = self.driver.find_elements(
            locate_with(By.XPATH, "//input[@class='form-control']").near(field_element))[0]
        if value:
            self.driver.execute_script("arguments[0].value = '';", input_element)
            input_element.send_keys(value)
        else:
            input_element.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)
        # In affects, if we won't click the CheckMark for module and go to
        # component, the affects will be hidden
        if "affects" in field:
            field_savebtn = self.driver.find_elements(
                locate_with(By.XPATH, "//i[@class='bi bi-check']").near(input_element))[0]
            self.driver.execute_script("arguments[0].click();", field_savebtn)

    def delete_affect(self, field):
        affect_affectedness_element = getattr(self, field)
        # Get the delete element via the affectedness element and click it
        delete_element = self.driver.find_elements(
            locate_with(By.XPATH, "//button[@class='btn btn-white btn-outline-black btn-sm']").near(affect_affectedness_element))[0]
        self.driver.execute_script("arguments[0].click();", delete_element)

    def click_affect_delete_btn(self):
        """
        Go to a affect detail, delete the affect and return the current module
        and component value.
        """
        # Click the first affect component dropdown button
        self.click_button_with_js("affectExpandall")
        # Click the second affect component dropdown button
        self.click_button_with_js("affectDropdownBtn")
        # Get the current value of the affect ps_component
        ps_component = self.get_current_value_of_field('affects__ps_component')
        ps_module = self.get_current_value_of_field('affects__ps_module')
        # Click the delete button of the affect
        self.delete_affect('affectAffectednessText')
        return ps_module, ps_component

    def get_affect_module_component_values(self, token, component_value):
        osidb_token = token
        flaw_info = self.load_affects_results_from_osidb(osidb_token)
        # Get the module values according to the component_value
        module_component = []
        for affect in flaw_info.get('affects'):
            if affect.get('ps_component') == component_value:
                module_value = affect.get('ps_module')
                module_component.append((module_value, component_value))
        return module_component

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
        self.click_btn('affectDropdownBtn')
