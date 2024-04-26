from .flaw_detail_page import FlawDetailPage


class FlawCreatePage(FlawDetailPage):

    def __init__(self, driver):
        self.driver = driver
        self.timeout = 15

    locators = {
        "flawCreatedMsg": ("XPATH", "//div[text()='Flaw created']"),

        "bottomBar": ("XPATH", "//div[@class='osim-action-buttons sticky-bottom d-grid gap-2 d-flex justify-content-end']"),
        "bottomFooter": ("XPATH", "//footer[@class='fixed-bottom osim-status-bar']"),

        "createNewFlawBtn": ("XPATH", '//button[text()="Create New Flaw"]'),
        "createFlawLink": ("LINK_TEXT", "Create Flaw"),
        "embargeodCheckBox": ("XPATH", "//input[@class='form-check-input']"),

        "comment#0Text": ("XPATH", "//span[text()='Comment#0']"),
        "descriptionBtn": ("XPATH", "//button[contains(text(), 'Add Description')]"),
        "descriptionText": ("XPATH", "//span[text()='Description']"),
        "statementBtn": ("XPATH", "//button[contains(text(), 'Add Statement')]"),
        "statementText": ("XPATH", "//span[text()='Statement']"),

        "impactSelect": ("XPATH", "(//select[@class='form-select is-invalid'])[1]"),
        "sourceSelect": ("XPATH", "(//select[@class='form-select is-invalid'])[1]"),

        "titleEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[1]"),
        "titleInput": ("XPATH", "(//input[@class='form-control is-invalid'])[1]"),

        "componentEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[2]"),
        "componentInput": ("XPATH", "(//input[@class='form-control is-invalid'])[1]"),

        "cveidEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[3]"),
        "cveidInput": ("XPATH", "(//input[@class='form-control'])[4]"),

        "reportedDateEditBtn": ("XPATH", "(//button[@class='osim-editable-date-pen input-group-text'])[1]"),
        "reportedDateInput": ("XPATH", "(//input[@class='form-control is-invalid'])[1]"),

        "publicDateEditBtn": ("XPATH", "(//button[@class='osim-editable-date-pen input-group-text'])[2]"),
        "publicDateInput": ("XPATH", "(//input[@class='form-control is-invalid'])[1]"),

        "cweidEditBtn": ("XPATH", "(//button[@class='osim-editable-text-pen input-group-text'])[5]"),
        "cweidInput": ("XPATH", "(//input[@class='form-control'])[6]"),
    }
