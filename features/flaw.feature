Feature: Check flaw

    Scenario: Redirect to the flaw page when click flaw link

      Given I am an analyst AND I am logged into OSIM
        And I am on the flaw list
       When I click the link of a flaw
       Then I am able to view the flaw detail

