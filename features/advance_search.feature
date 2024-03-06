Feature: Flaw advance search testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM

    Scenario: List all flaws
      When I am searching for all flaws
      Then I get a list of all flaws
