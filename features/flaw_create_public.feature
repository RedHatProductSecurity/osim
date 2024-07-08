Feature: Flaw creation testing, public

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      * I set the bugzilla api key and jira api key

    Scenario: Create a flaw with valid mandatory and additional data
      When I open the flaw create page
      * I create flaw with valid data including optional fields
      Then A new flaw is created
