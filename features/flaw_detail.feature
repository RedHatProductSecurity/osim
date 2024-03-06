Feature: Flaw detail testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      And I set the bugzilla api key and jira api key
      And I go to a flaw detail page

    Scenario: Add Public Comment for a flaw
      When I add a public comment to the flaw
      Then A comment is added to the flaw

    Scenario Outline: Modify document text fields
      When I set the text <field> value to "<value>"
      Then The text <field> value is changed

      Examples:
        |        field  |              value |
        |       summary |       edit summary |
        |     statement |     edit statement |
        |     statement |                    |
        |     statement |      add statement |
        |    mitigation |    edit mitigation |
        |    mitigation |                    |
        |    mitigation |     add mitigation |
