# Created by axuan at 2024/6/4
Feature: Flaw creation testing, embargo

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      And I set the bugzilla api key and jira api key

    Scenario: Create embargoed flaw
      When I open the flaw create page
      And I create new embargoed flaw with valid data
      Then The flaw is created and marked as an embargoed flaw

    Scenario: Add CVE ID to a flaw without a CVE
      When I add a CVE ID to a flaw without a CVE
      Then The flaw CVE ID is saved
