Feature: Check login and logout

    Scenario: Can successfully log out after login
      Given I am an analyst AND I am logged into OSIM
      When  I click the Logout button from the account dropdown
      Then I log out and am redirected to the login page
