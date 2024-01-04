Feature: Check login with valid credential

    Scenario: Login with the valid credential
      Given I am an analyst AND I am logged into OSIM
      Then I am able to log into OSIM
