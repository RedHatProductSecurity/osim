Feature: Flaw filter testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      And I am on the flaw list

    Scenario: Filter the flaws with title keyword
      When I input a filter keyword "title" in the "Filter Issues/Flaws" input box
      Then I am able to view flaws matching "title keyword" and the flaws "count" is correct

    Scenario: Filter the flaws with cve_id keyword
      When I input a filter keyword "cve_id" in the "Filter Issues/Flaws" input box
      Then I am able to view flaws matching "cve_id" and the flaws "count" is correct

    Scenario: Filter the flaws with state keyword
      When I input a filter keyword "state" in the "Filter Issues/Flaws" input box
      Then I am able to view flaws matching "state" and the flaws "count" is correct

    Scenario: Filter the flaws with source keyword
      When I input a filter keyword "source" in the "Filter Issues/Flaws" input box
      Then I am able to view flaws matching "source" and the flaws "count" is correct
