Feature: Check flaw

    Scenario: Redirect to the flaw page when click flaw link

      Given I am an analyst AND I am logged into OSIM
        And I am on the flaw list
       When I click the link of a flaw
       Then I am able to view the flaw detail

    Scenario: All flaws are selected when check-all checkbox is checked

      Given I am an analyst AND I am logged into OSIM
       When I check the check-all checkbox of flaw table
       Then All flaws in flaw table are selected

    Scenario: All flaws are unselected when check-all checkbox is unchecked

      Given I am an analyst AND I am logged into OSIM
        And The check-all checkbox of flaw list is checked
       When I uncheck the check-all checkbox
       Then No flaw in flaw table is selected
