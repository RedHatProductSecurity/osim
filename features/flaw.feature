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

    Scenario: Load more flaws
      Given I am an analyst AND I am logged into OSIM
      Given Not all flaws are loaded
      When  I click the button 'Load More Flaws'
      Then More flaws are loaded into the list

    Scenario: Add Public Comment for a flaw
      Given I am an analyst AND I am logged into OSIM
      Given I set the bugzilla api key and jira api key
      Given I go to a flaw detail page
      When I add a public comment to the flaw
      Then A comment is added to the flaw

    Scenario: List all flaws
      Given I am an analyst AND I am logged into OSIM
      When I am searching for all flaws
      Then I get a list of all flaws

    Scenario: Modify statement
      Given I am an analyst AND I am logged into OSIM
      Given I set the bugzilla api key and jira api key
      Given I go to a flaw detail page
      And Edit statement field leaves it in correct format
      Then The statement field information is changed
