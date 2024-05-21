Feature: Flaw detail testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      And I set the bugzilla api key and jira api key

    Scenario: Add public comment for a flaw
      Given I go to a public flaw detail page
      When I add a public comment to the flaw
      Then A comment is added to the flaw

    Scenario Outline: Update Document Text Fields
      Given I go to a public flaw detail page
      When I <action> the document text fields
      Then The document text fields are updated

      Examples:
        |         action |
        |         update |
        |         delete |
        |            add |

    Scenario Outline: Update dropdown options
      Given I go to a public flaw detail page
      When I update the dropdown <field> value
      Then The dropdown <field> value is updated

      Examples:
        |         field |
        |        impact |
        |        source |

    Scenario: Add acknowledgement
      Given I go to a public flaw detail page
      When I add an acknowledgment to the flaw
      Then A new acknowledgement added to the flaw

    Scenario: Modify acknowledgement
      Given I go to a public flaw detail page
      When I edit the first acknowledgement in correct format
      Then Acknowledgement is changed

    Scenario: Remove acknowledgement
      Given I go to a public flaw detail page
      When I delete an acknowledgement from acknowledgement list
      Then Acknowledgement is removed from flaw

    Scenario: Update editable random input fields
      Given I go to a public flaw detail page
      When I update the random input fields
        |         field |
        |         title |
        |     component |
        |      assignee |
        |        teamid |
      Then The random input fields are updated

    Scenario Outline: Update CWE ID
      Given I go to a public flaw detail page
      When I <action> the CWE ID
      Then The CWE ID is updated

      Examples:
        |         action |
        |         update |
        |         delete |
        |            add |

    Scenario: Modify Reported Date
      Given I go to a public flaw detail page
      When I update the Reported Date with a valid data
      Then The Reported Date is updated

    Scenario: Assign flaw to self
      Given I go to a public flaw detail page
      When I click self assign button and save changes
      Then The flaw is assigned to me

    Scenario: Add external reference
      Given I go to a public flaw detail page
      When I add two external references to the flaw
      Then Two external references added

    Scenario: Add RHSB reference
      Given I go to a public flaw detail page
      When I add two RHSB references to the flaw
      Then Only one RHSB reference can be added

    Scenario: Delete reference
      Given I go to a public flaw detail page
      When I delete a reference from a flaw
      Then The reference is deleted from this flaw

    Scenario: Modify reference
      Given I go to a public flaw detail page
      When I edit a internal/external reference
      Then The reference information is changed

    Scenario: Add RHSB reference with incorrect link
      Given I go to a public flaw detail page
      When I add a RHSB reference to the flaw with incorrect link
      Then I got an error message and no RHSB reference added to the flaw

    Scenario: Reset changes
      Given I go to a public flaw detail page
      When I update the flaw and click 'Reset Changes' button
      Then All changes are reset

    Scenario: Modify embargoed flaw with past public date
      Given I go to an embargoed flaw detail page
      When I update the embargoed flaw with a past public date
      Then The embargoed flaw update is failed

    Scenario: Modify embargoed flaw with future public date
      Given I go to an embargoed flaw detail page
      When I update the embargoed flaw with a future public date
      Then The embargoed flaw is updated

    Scenario: Update affects for public flaw
      Given I go to a public flaw detail page
      When I update the affects of the flaw and click 'Save Changes' button
      Then All changes are saved

    Scenario: Update affects for embargoed flaw
      Given I go to an embargoed flaw detail page
      When I update the affects of the flaw and click 'Save Changes' button
      Then All changes are saved

    Scenario: Add new affect to flaw
      Given I go to a public flaw detail page
      When I add a new affect with valid data
      Then The affect is added
    
    Scenario: Delete an affect from  a flaw
      Given I go to a public flaw detail page
      When I delete an affect of the flaw
      Then The affect is deleted