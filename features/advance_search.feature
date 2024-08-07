Feature: Flaw advance search testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      *  I set the bugzilla api key and jira api key

    Scenario: List all flaws
      Given I go to the advanced search page
      When I am searching for all flaws
      Then I get a list of all flaws

    Scenario: Search flaws with selected field and value
      Given I go to a public flaw detail page
      When I prepare the advance search keywords
      Given I go to the advanced search page
      Then I use keywords to search flaws and I am able to view flaws matching the search keywords

    Scenario: Search flaws with two fields
      Given I go to the advanced search page
      When I am searching flaws with two fields and two values
      Then I am able to view flaws matching the search with two selected fileds
