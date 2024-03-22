Feature: Flaw list testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
      And I am on the flaw list

    Scenario: Redirect to the flaw page when click flaw link

      When I click the link of a flaw
      Then I am able to view the flaw detail

    Scenario: All flaws are selected when check-all checkbox is checked

      When I check the check-all checkbox of flaw table
      Then All flaws in flaw table are selected

    Scenario: All flaws are unselected when check-all checkbox is unchecked

      Given The check-all checkbox of flaw list is checked
      When I uncheck the check-all checkbox
      Then No flaw in flaw table is selected

    Scenario: Load more flaws
      Given Not all flaws are loaded
      When  I click the button 'Load More Flaws'
      Then More flaws are loaded into the list
