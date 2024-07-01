# Created by axuan at 2024/6/4

Feature: Flaw detail testing on public flaw

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      And I set the bugzilla api key and jira api key
      And I go to a public flaw detail page

    Scenario Outline: Add new comment to a flaw
      When I add a <comment_type> comment to the flaw
      Then A <comment_type> comment is added to the flaw

      Examples:
        |         comment_type |
        |               Public |
        |              Private |
        |             Internal |

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
        |    components |
        |         owner |
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

    Scenario: Assign flaw to self
      When I click self assign button and save changes
      Then The flaw is assigned to me

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
      When I click 'delete' button of an affect
      Then I could 'recover' the affect that I tried to delete above

    Scenario Outline: Create tracker
      When I delete an affect of the flaw
      When I add a new affect to <external_system> supported module and selected <affectedness_value>
      When I select the affect above and file a tracker
      Then The tracker is created for <external_system>

      Examples:
          |external_system|  affectedness_value|
      # The jira prod, e.g., rhel-8 can't added
      #    |           jira|           AFFECTED|
      #    |           jira|                NEW|
          |       bugzilla|            AFFECTED|
          |       bugzilla|                 NEW|

    Scenario Outline: Can't create tracker
      When I delete an affect of the flaw
      When I add a new affect to <external_system> supported module and selected <affectedness_value>
      Then I can't file a tracker

      Examples:
          |external_system|  affectedness_value|
          |       bugzilla|         NOTAFFECTED|
      #    |           jira|        NOTAFFECTED|
