Feature: Logout after successfully logged in

  Scenario: Can successfully log out
    Given I am an analyst AND I am logged into OSIM
    When  I click the Logout button from the account dropdown
    Then I log out and am redirected to the login page
