Feature: Load more flaws


  Scenario: Not all flaws loaded
    Given I am an analyst AND I am logged into OSIM
    Given Not all flaws are loaded
    When  I click the button 'Load More Flaws'
    Then More flaws are loaded into the list
