Feature: Flaw advance search testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      *  I set the bugzilla api key and jira api key

    Scenario: List all flaws
      Given I go to the advanced search page
      When I am searching for all flaws
      Then I get a list of all flaws

    Scenario: Search flaws with selected field and value
      Given I add lacking data to the flaw which for later search
      And I go to a public flaw detail page
      When I prepare the advance search keywords
      Given I go to the advanced search page
      Then I use keywords to search flaws and I am able to view flaws matching the search keywords

    Scenario: Search flaws with two fields
      Given I go to the advanced search page
      When I am searching flaws with two fields and two values
      Then I am able to view flaws matching the search with two selected fileds

    Scenario: Search flaws with empty or nonempty value
      Given I go to the advanced search page
      Then I am able to search flaws with empty or nonempty value

    Scenario: Search flaws with single query filter
      Given I go to the advanced search page
      Then I am able to search flaws with single query filter

    Scenario: Search flaws with multiple conditions in query filter
      Given I go to the advanced search page
      Then I am able to search flaws with multiple conditions in query filter

    Scenario: Sort search result by sortable fields in result table
      Given I go to the advanced search page
      When I sort search result by sortable field
      Then I got sorted search result

    Scenario: Search flaws with osidb related models
      Given I go to the advanced search page
      Then I am able to search flaws with osidb related models in query filter

    Scenario: Sort search result by extended sortable fields
      Given I go to the advanced search page
      When I sort search result by extended sortable field
      Then I got search result sorted by extended field

    Scenario: Search flaws with both query filter and selected field
      Then I am able to search flaws with both query filter and selected field
