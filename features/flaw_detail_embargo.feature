Feature: Flaw detail testing on embargo flaw

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      * I set the bugzilla api key and jira api key
      * I go to an embargoed flaw detail page

    Scenario: Modify embargoed flaw with past public date
      When I update the embargoed flaw with a past public date
      Then The embargoed flaw update is failed

    Scenario: Modify embargoed flaw with future public date
      When I update the embargoed flaw with a future public date
      Then The embargoed flaw is updated

    Scenario: Add new affect for an embargoed flaw
      When I add a new affect with valid data
      Then The affect is added

    Scenario: Update affects for an embargoed flaw
      When I update the affects of the flaw and click 'Save Changes' button
      Then All changes are saved

    Scenario: Delete an affect from a flaw
      When I delete an affect of the flaw
      Then The affect is deleted

    Scenario: Make flaw public and add public date
      When I unembargo this flaw and add public date
      Then Flaw is unembargoed and have public date

    Scenario: Reject a flaw
      When I click reject button to reject a flaw
      Then The flaw is rejected
