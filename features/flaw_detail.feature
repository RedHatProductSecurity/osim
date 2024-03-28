Feature: Flaw detail testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      And I set the bugzilla api key and jira api key
      And I go to a flaw detail page

    Scenario: Add public comment for a flaw
      When I add a public comment to the flaw
      Then A comment is added to the flaw

    Scenario Outline: Update Document Text Fields
      When I <action> the document text fields
      Then The document text fields are updated

      Examples:
        |         action |
        |         update |
        |         delete |
        |            add |

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

    Scenario Outline: Update CWE ID
      When I <action> the CWE ID
      Then The CWE ID is updated

      Examples:
        |         action |
        |         update |
        |         delete |
        |            add |

    Scenario: Modify Reported Date
      When I update the Reported Date with a valid data
      Then The Reported Date is updated

    Scenario: Add external reference
      When I add two external references to the flaw
      Then Two external references added

    Scenario: Add RHSB reference
      When I add two RHSB references to the flaw
      Then Only one RHSB reference can be added

    Scenario: Delete reference
      When I delete a reference from a flaw
      Then The reference is deleted from this flaw

    Scenario: Reset changes
       When I update the flaw and click 'Reset Changes' button
       Then All changes are reset
