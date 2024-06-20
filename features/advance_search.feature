Feature: Flaw advance search testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      Given I go to the advanced search page

    Scenario: List all flaws
      When I am searching for all flaws
      Then I get a list of all flaws

    Scenario: Search flaws with selected field and value
      When I prepare the advance search keywords
      Then I select the field and keyword to search flaws and I am able to view flaws matching the search


    Scenario: Search flaws with two fields
      When I am searching flaws with two fields and two values
      Then I am able to view flaws matching the search with two selected fileds
