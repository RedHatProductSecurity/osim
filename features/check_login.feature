Feature: Check login with valid credential

    Scenario: Login with the valid credential
      Given I am an analyst with valid credential
      When I attempt to log into OSIM
      Then I am able to log into OSIM
