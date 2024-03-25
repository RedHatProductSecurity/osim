Feature: Flaw creation testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      And I set the bugzilla api key and jira api key
      And I open the flaw create page

    Scenario: Create a flaw with valid mandatory data
      When I fill flaw form with valid data and click create new flaw
      Then A new flaw is created
