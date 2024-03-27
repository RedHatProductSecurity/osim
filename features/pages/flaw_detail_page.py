from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from seleniumpagefactory.Pagefactory import PageFactory
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.relative_locator import locate_with
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import NoSuchElementException
from seleniumpagefactory.Pagefactory import ElementNotVisibleException

from features.page_factory_utils import find_elements_in_page_factory


class FlawDetailPage(PageFactory):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "createFlawLink": ("LINK_TEXT", "Create Flaw"),
        "summaryBtn": ("XPATH", "//button[contains(text(), 'Add Summary')]"),
        "summaryText": ("XPATH", "//span[text()='Summary']"),
        "descriptionBtn": ("XPATH", "//button[contains(text(), 'Add Description')]"),
        "descriptionText": ("XPATH", "//span[text()='Description']"),
        "statementBtn": ("XPATH", "//button[contains(text(), 'Add Statement')]"),
        "statementText": ("XPATH", "//span[text()='Statement']"),
        "mitigationBtn": ("XPATH", "//button[contains(text(), 'Add Mitigation')]"),
        "mitigationText": ("XPATH", "//span[text()='Mitigation']"),
        "addCommentBtn": ("XPATH", "//button[contains(text(), 'Comment')]"),
        "commentTextWindow": ("XPATH", "(//textarea[@class='form-control col-9 d-inline-block'])[5]"),
        "saveBtn": ("XPATH", '//button[text()=" Save Changes "]'),
        "createNewFlawBtn": ("XPATH", '//button[text()="Create New Flaw"]'),
        "flawSavedMsg": ("XPATH", "//div[text()='Flaw saved']"),
        "flawCreatedMsg": ("XPATH", "//div[text()='Flaw created']"),
        "documentTextFieldsDropDownBtn": ("XPATH", "(//button[@class='me-2'])[1]"),
        "acknowledgmentsDropDownBtn": ("XPATH", "(//button[@class='me-2'])[3]"),
        "addAcknowledgmentBtn": ("XPATH", "//button[contains(text(), 'Add Acknowledgment')]"),
        "addAcknowledgmentInputLeft": ("XPATH", "(//div[@class='osim-list-create']/div/div/input)[1]"),
        "addAcknowledgmentInputRight": ("XPATH", "(//div[@class='osim-list-create']/div/div/input)[2]"),
        "saveAcknowledgmentBtn": ("XPATH", '//button[contains(text(), "Save Changes to Acknowledgments")]'),
        "acknowledgmentSavedMsg": ("XPATH", '//div[text()="Acknowledgment created."]'),
        "impactSelect": ("XPATH", "(//select[@class='form-select'])[1]"),
        "sourceSelect": ("XPATH", "(//select[@class='form-select'])[2]"),
        "firstAcknowledgmentEditBtn": ("XPATH", "(//div[@class='osim-list-edit']/div[2]/button)[1]"),
        "firstAcknowledgmentDeleteBtn": ("XPATH", "(//div[@class='osim-list-edit']/div[2]/button)[2]"),
        "firstAcknowledgmentValue": ("XPATH", "(//div[@class='osim-list-edit']/div/div)[1]"),
        "firstAcknowledgmentEditInputLeft": ("XPATH", "(//div[@class='osim-list-edit']/div[1]/div/input)[1]"),
        "firstAcknowledgmentEditInputRight": ("XPATH", "(//div[@class='osim-list-edit']/div[1]/div/input)[2]"),
        "confirmAcknowledgmentDeleteBtn": ("XPATH", '//button[contains(text(), "Confirm")]'),
        "acknowledgmentUpdatedMsg": ("XPATH", "//div[text()='Acknowledgment updated.']"),
        "acknowledgmentDeletedMsg": ("XPATH", "//div[text()='Acknowledgment deleted.']"),
        "assigneeEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[6]"),
        "assigneeInput": ("XPATH", "(//input[@class='form-control'])[8]"),
        "titleEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[1]"),
        "titleInput": ("XPATH", "(//input[@class='form-control'])[2]"),
        "titleValue": ("XPATH", "//span[@class='osim-editable-text-value form-control']"),
        "componentEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[2]"),
        "componentInput": ("XPATH", "(//input[@class='form-control'])[3]"),
        "teamidEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[7]"),
        "teamidInput": ("XPATH", "(//input[@class='form-control'])[9]"),
        "embargoedText": ("XPATH", "(//span[@class='form-control'])[3]"),
        "embargeodCheckBox": ("XPATH", "//input[@class='form-check-input']"),
        "cveidEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[3]"),
        "cveidInput": ("XPATH", "(//input[@class='form-control'])[4]"),
        "cveidValue": ("XPATH", "(//span[@class='osim-editable-text-value form-control'])[3]"),
        "cweidEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[5]"),
        "cweidInput": ("XPATH", "(//input[@class='form-control'])[7]"),
        "cweidValue": ("XPATH", "(//span[@class='osim-editable-text-value form-control'])[5]"),
        "reportedDateEditBtn": ("XPATH", "(//button[@class='osim-editable-date-pen input-group-text'])[1]"),
        "reportedDateInput": ("XPATH", "(//input[@class='form-control'])[8]"),
        "reportedDateValue": ("XPATH", "(//span[@class='osim-editable-date-value form-control text-start form-control'])[1]"),
        "publicDateEditBtn": ("XPATH", "(//button[@class='osim-editable-date-pen input-group-text'])[2]"),
        "publicDateInput": ("XPATH", "(//input[@class='form-control'])[8]"),

        "referenceDropdownBtn": ("XPATH", "(//button[@class='me-2'])[2]"),
        "addReferenceBtn": ("XPATH", "//button[contains(text(), 'Add Reference')]"),
        "saveReferenceBtn": ("XPATH", "//button[contains(text(), 'Save Changes to References')]"),
        "referenceList": ("XPATH", "(//div[@class='ps-3 border-start'])[2]/div/div"),
        "referenceCreatedMsg": ("XPATH", "//div[text()='Reference created.']"),
        "referenceDelConfirmBtn": ("XPATH", '//button[contains(text(), "Confirm")]'),
        "referenceDeletedMsg": ("XPATH", "//div[text()='Reference deleted.']"),
        "addReferenceSelect": ("XPATH", "//select[@class='form-select mb-3 osim-reference-types']"),
        'addReferenceLinkUrlInput': ("XPATH", "(//input[@class='form-control' and @type='text'])[9]"),
        "addReferenceDescriptionInput": ("XPATH", "(//textarea[@class='form-control col-9 d-inline-block'])[5]"),
        "addMultipleRHSBReferenceErrorMsg": ("XPATH", "//div[contains(text(),'A flaw has 2 article links, but only 1 is allowed.')]"),
        "addReferenceDescriptionText": ("XPATH", "(//span[text()='Description'])[2]"),

        "bottomBar": ("XPATH", "//div[@class='osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end']"),
        "bottomFooter": ("XPATH", "//footer[@class='fixed-bottom osim-status-bar']"),
        "toastMsgCloseBtn": ("XPATH", "//button[@class='osim-toast-close-btn btn-close']")
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

    def set_comment_value(self, value):
        self.commentTextWindow.set_text(value)

    def set_document_text_field(self, field, value):
        field_btn = field + 'Btn'
        if find_elements_in_page_factory(self, field_btn):
            self.driver.execute_script("arguments[0].scrollIntoView(true);", getattr(self, field_btn))
            hide_e1 = self.driver.find_elements(
                locate_with(By.XPATH, "//footer[@class='fixed-bottom osim-status-bar']"))[0]
            hide_e2 = self.driver.find_elements(
                locate_with(By.XPATH, "//div[@class='osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end']"))[0]
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
        field_btn = field + 'Btn'
        if find_elements_in_page_factory(self, field_btn):
            return ''
        else:
            field_element = getattr(self, field + 'Text')
            field_input = self.driver.find_elements(
                locate_with(By.TAG_NAME, "textarea").near(field_element))[0]
            self.driver.execute_script("arguments[0].scrollIntoView(true);", field_element)
            return field_input.getAttribute("value")

    def set_acknowledgement(self, left_value, right_value):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.addAcknowledgmentInputLeft)
        self.addAcknowledgmentInputLeft.set_text(left_value)
        self.addAcknowledgmentInputRight.set_text(right_value)

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
        field_select = getattr(self, field + 'Select')
        all_values = field_select.get_all_list_item()
        selected_item = field_select.get_list_selected_item()
        current_value = selected_item[0] if selected_item else None
        return (all_values, current_value)

    def set_select_value(self, field):
        field_select = getattr(self, field + 'Select')
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

    def click_btn(self, btn_element):
        element = getattr(self, btn_element)
        element.click_button()

    def wait_msg(self, msg_element):
        element = getattr(self, msg_element)
        element.visibility_of_element_located()

    def click_first_ack_edit_btn(self):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.firstAcknowledgmentEditBtn)
        self.firstAcknowledgmentEditBtn.click_button()

    def edit_first_ack(self, left_v, right_v):
        self.driver.execute_script("arguments[0].value = '';", self.firstAcknowledgmentEditInputLeft)
        self.firstAcknowledgmentEditInputLeft.set_text(left_v)

        self.driver.execute_script("arguments[0].value = '';", self.firstAcknowledgmentEditInputRight)
        self.firstAcknowledgmentEditInputRight.set_text(right_v)

    def get_first_ack_value(self):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.firstAcknowledgmentValue)
        return self.firstAcknowledgmentValue.get_text()

    def set_input_field(self, field, value):
        field_btn = field + 'EditBtn'
        self.click_btn(field_btn)
        field_input = getattr(self, field + 'Input')
        self.driver.execute_script("arguments[0].value = '';", field_input)
        field_input.set_text(value)

    def get_input_value(self, field):
        field_value = getattr(self, field + 'Value')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_value)
        return field_value.get_text()

    def clear_input_field(self, field):
        field_btn = field + 'EditBtn'
        self.click_btn(field_btn)
        field_input = getattr(self, field + 'Input')
        field_input.send_keys(Keys.CONTROL + 'a', Keys.BACKSPACE)

    def check_value_exist(self, value):
        e = self.driver.find_element(By.XPATH, f'//span[contains(text(), "{value}")]')
        return WebDriverWait(self.driver, self.timeout).until(
            EC.visibility_of(e)
        )

    def check_value_not_exist(self, value):
        return WebDriverWait(self.driver, self.timeout).until(
            EC.invisibility_of_element_located((By.XPATH, f'//span[contains(text(), "{value}")]'))
        )

    def get_text_value(self, field):
        field_value = getattr(self, field + 'Text')
        self.driver.execute_script("arguments[0].scrollIntoView(true);", field_value)
        return field_value.get_text()

    def click_button_with_js(self, btn_element):
        element = getattr(self, btn_element)
        element.execute_script("arguments[0].scrollIntoView(true);")
        element.execute_script("arguments[0].click();")

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
                del_btn_xpath = f"((//div[@class='osim-list-edit'])[{i}]/div[2]/button)[2]"
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

        self.addReferenceSelect.select_element_by_text("External")

    def add_reference_set_link_url(self, value):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.addReferenceLinkUrlInput)
        self.addReferenceLinkUrlInput.set_text(value)

    def add_reference_set_description(self, value):
        self.driver.execute_script("arguments[0].scrollIntoView(true);", self.addReferenceDescriptionText)
        self.addReferenceDescriptionInput.set_text(value)
