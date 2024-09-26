# Created by axuan at 2024/6/4

Feature: Flaw detail testing on public flaw

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      * I set the bugzilla api key and jira api key
      * I go to a public flaw detail page

    Scenario: Add new comments to a flaw
      When I add new comments to the flaw
      Then The comments are added to the flaw

    Scenario Outline: Update Document Text Fields
      When I <action> the document text fields
      Then The document text fields are updated

      Examples:
        |         action |
        |         update |
        |         delete |
        |            add |

    Scenario: Update dropdown options
      When I update the dropdown field values
      Then The dropdown field values are updated

    Scenario: Add acknowledgement
      When I add an acknowledgment to the flaw
      Then A new acknowledgement added to the flaw

    Scenario: Modify acknowledgement
      When I edit the first acknowledgement in correct format
      Then Acknowledgement is changed

    Scenario: Remove acknowledgement
      When I delete an acknowledgement from acknowledgement list
      Then Acknowledgement is removed from flaw

    Scenario: Update editable input fields
      When I update the input fields
      Then The input fields are updated

    Scenario: Erase CVSSv3 field value
      When I click the erase button of CVSSv3 field
      Then The CVSSv3 field is empty

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

    Scenario: Assign flaw to self
      When I click self assign button and save changes
      Then The flaw is assigned to me

    Scenario: Modify review status
      When I update the cve review status
      Then The review status is updated

    Scenario: Add external reference
      When I add two external references to the flaw
      Then Two external references added

    Scenario: Add RHSB reference
      When I add two RHSB references to the flaw
      Then Only one RHSB reference can be added

     Scenario: Modify reference
      When I edit a internal/external reference
      Then The reference information is changed

    Scenario: Delete reference
      When I delete a reference from a flaw
      Then The reference is deleted from this flaw

    Scenario: Add RHSB reference with incorrect link
      When I add a RHSB reference to the flaw with incorrect link
      Then I got an error message and no RHSB reference added to the flaw

    Scenario: Reset changes
      When I update the flaw and click 'Reset Changes' button
      Then All changes are reset

    Scenario: Add new affect for a public flaw
      When I add a new affect with valid data
      Then The affect is added

    Scenario: Update affect for a public flaw
      When I update the affects of the flaw and click 'Save Changes' button
      Then All changes are saved

    Scenario: Recover an affect for the deleting
      When I 'delete' an affect and 'recover' it
      Then I could 'recover' the affect that I tried to delete above

    Scenario: Filter on affects modules
      When I click an affect module listed in affected offerings
      Then Only affects with this module are listed in affects table

    Scenario: Bulk update affects
      When I bulk update affects
      Then All affects are updated

    Scenario: Filter on affects table headers
      When I click a filterable field in affects table
      Then I could get the correct data filtered by the field value

    @skip
    Scenario Outline: Create tracker
      When I delete an affect of the flaw
      When I add a new affect to <external_system> supported module and selected <affectedness_value>
      When I file a <type> tracker
      Then The tracker is created

      Examples:
          |external_system|  affectedness_value| type   |
          #|           jira|           AFFECTED|  ystream|
          #|           jira|                NEW|  ystream|
          |       bugzilla|           AFFECTED|  ystream|
          |       bugzilla|                NEW|  zstream|

    @skip
    Scenario Outline: Can not create tracker
      When I delete an affect of the flaw
      When I add a new affect to <external_system> supported module and selected <affectedness_value>
      Then I can't file a tracker

      Examples:
          |external_system|  affectedness_value|
          |       bugzilla|         NOTAFFECTED|

    @skip
    Scenario: List filed trackers
      When I delete an affect of the flaw
      When I add a new affect with valid data
      When I select the affect above and file a tracker
      Then The manager trackers list the filed trackers

    @skip
    Scenario: Select/Deselect all trackers
      When I delete an affect of the flaw
      When I add a new affect with valid data
      Then I Select/Deselect all trackers and all the trackers could be Selected/Deselected

    @skip
    Scenario: Filter unfiled trackers
      When I add some affects with valid data
      Then I could filter trackers by stream or component name

    Scenario Outline: Update flaw incident state
      When I update flaw incident state to <new_state>
      Then The flaw incident state is updated to <new_state>

      Examples:
        |           new_state |
        |           REQUESTED |
        |            APPROVED |
        |       CISA_APPROVED |
        |            REJECTED |

    Scenario Outline: Update flaw state
      When I click state button to update flaw state
      Then The flaw is updated to <new_state> following workflow

      Examples:
        |                       new_state |
        |                          TRIAGE |
        |        PRE_SECONDARY_ASSESSMENT |
        |            SECONDARY_ASSESSMENT |
        # Below state can only work after tracker(s) filed
        # |                            DONE |

    Scenario Outline: Update CVSS score explanation
      When I {action} the CVSS score explanation
      Then The CVSS score explanation is updated

      Examples:
        |         action |
        |         update |
        |         delete |
        |            add |
