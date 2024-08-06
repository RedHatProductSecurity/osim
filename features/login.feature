Feature: Check login and logout

    Scenario: Login with the valid credential
      Given I am an analyst AND want to log into OSIM
      Then I am able to log into OSIM

    Scenario: Can successfully log out
      Given I am an analyst AND I am logged into OSIM
      When  I click the Logout button from the account dropdown
      Then I log out and am redirected to the login page
