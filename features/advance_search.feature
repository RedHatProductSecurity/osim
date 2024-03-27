Feature: Flaw advance search testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      Given I go to the advanced search page

    Scenario: List all flaws
      When I am searching for all flaws
      Then I get a list of all flaws

    Scenario: Search flaws with selected field and value
      Then I select the field and value to search flaws and I am able to view flaws matching the search
        |                                    field |                                        value |
        |                    acknowledgments__name |                                         test |
        |                    affects__ps_component |                                          ssh |
        |                       affects__ps_module |                    openshift-enterprise-3.11 |
        | affects__trackers__errata__advisory_name |                               RHSA-2012:0006 |
        |    affects__trackers__external_system_id |                                      1985352 |
        |      affects__trackers__ps_update_stream |                                     rhel-9.0 |
        |                                component |                                          ssh |
        |                                   cve_id |                                CVE-2016-5566 |
        |                       cvss_scores__score |                                          4.3 |
        |                      cvss_scores__vector | CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:L |
        |                                   cwe_id |                                       CWE-81 |
        |                                    owner |                              test@redhat.com |
        |                                   source |                                     CUSTOMER |
        |                                  team_id |                                       teamid |
        |                                    title |                                 sample title |
        |                                     type |                                VULNERABILITY |
        |                                     uuid |         3025ba93-b962-4553-b785-c9da27c9dec7 |
        |                           workflow_state |                                          NEW |
        |                                embargoed |                                         true |

    Scenario: Search flaws with two fields
      When I am searching flaws with two fields and two values
      Then I am able to view flaws matching the search with two selected fileds
