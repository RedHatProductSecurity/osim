Feature: Flaw detail testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      And I set the bugzilla api key and jira api key
      And I go to a flaw detail page

    Scenario: Add public comment for a flaw
      When I add a public comment to the flaw
      Then A comment is added to the flaw

    Scenario Outline: Update Document Text Fields
      When I update the document text of <field> to "<value>"
      Then The document text of <field> is updated

      Examples:
        |         field |              value |
        |       summary |       edit summary |
        |     statement |     edit statement |
        |     statement |                    |
        |     statement |      add statement |
        |    mitigation |    edit mitigation |
        |    mitigation |                    |
        |    mitigation |     add mitigation |

    Scenario Outline: Update dropdown options
      When I update the dropdown <field> value
      Then The dropdown <field> value is updated

      Examples:
        |         field |
        |        impact |
        |        source |

    Scenario: Add acknowledgement
      When I add an acknowledgment to the flaw
      Then A new acknowledgement added to the flaw


    Scenario: Modify acknowledgement
      When I edit the first acknowledgement in correct format
      Then Acknowledgement is changed

    Scenario: Remove acknowledgement
      When I delete an acknowledgement from acknowledgement list
      Then Acknowledgement is removed from flaw

    Scenario: Update editable random input fields
      When I update the random input fields
        |         field |
        |         title |
        |     component |
        |      assignee |
        |        teamid |
      Then The random input fields are updated

    Scenario: Update CVE ID
      When I update the CVE ID with a valid data
      Then The CVE ID is updated
