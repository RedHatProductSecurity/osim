Feature: Check background color of the OSIM page

  Scenario: The background color of the OSIM local development page is as expected
    Given the OSIM dev server is running
    Given I am on the OSIM local development page
    When I retrieve the background color of the page
    Then the background color should be the expected color
