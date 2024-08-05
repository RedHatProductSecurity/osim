Feature: Flaw list testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      * I set the bugzilla api key and jira api key
      * I am on the flaw list

    Scenario: Redirect to the flaw page when click flaw link
      When I click the link of a flaw
      Then I am able to view the flaw detail

    Scenario: Sort flaw list on home page
      When I click the field header of flaw list table
      Then The flaw list is sorted by the field

    @skip
    Scenario: List all my issues
     Given I assgin an issue to me
      When I check 'My Issues' checkbox in index page
      Then Only my issues are listed in flaw list

    Scenario: List all open issues
      When I check 'Open Issues' checkbox of flaw list
      Then Only open issues are listed in flaw list

    Scenario: List flaws by default filter
      When I set a default filter and back to flaw list
      Then The flaw list is filtered by the default filter
