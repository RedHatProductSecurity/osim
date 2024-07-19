from .flaw_detail_page import FlawDetailPage


class FlawCreatePage(FlawDetailPage):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "flawCreatedMsg": ("XPATH", "//div[text()='Flaw created']"),

        "bottomBar": ("XPATH", "//div[@class='osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end']"),
        "bottomFooter": ("XPATH", "//footer[@class='fixed-bottom osim-status-bar']"),

        "createNewFlawBtn": ("XPATH", '//button[contains(text(), "Create New Flaw")]'),
        "createFlawLink": ("LINK_TEXT", "Create Flaw"),
        "embargeodCheckBox": ("XPATH", "//input[@class='form-check-input']"),

        "comment#0Text": ("XPATH", "//span[text()=' Comment#0']"),
        "descriptionBtn": ("XPATH", "//button[contains(text(), 'Add Description')]"),
        "descriptionText": ("XPATH", "//span[contains(text(), 'Description')]"),
        "statementBtn": ("XPATH", "//button[contains(text(), 'Add Statement')]"),
        "statementText": ("XPATH", "//span[contains(text(), 'Statement')]"),

        "impactText": ("XPATH", "//span[text()='Impact']"),
        "sourceText": ("XPATH", "//span[text()='CVE Source']"),
        "titleText": ("XPATH", "//span[text()='Title']"),
        "componentsText": ("XPATH", "//span[text()='Components']"),
        "cveidText": ("XPATH", "//span[text()='CVE ID']"),
        "cweidText": ("XPATH", "//span[text()='CWE ID']"),
        "publicDateText": ("XPATH", "//span[text()='Public Date']")
    }
