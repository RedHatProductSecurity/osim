Feature: Flaw quick search testing

    Background: Before run scenarios
      Given I am an analyst AND I am logged into OSIM
    
    Scenario: Quick search with CVE-ID
      When I am searching the flaw with CVE-ID
      Then I will go to the flaw detail page with the CVE_ID
    
    Scenario: Quick search flaw with text
      Then I search the flaw with text and I am able to view flaws list matching the search
           | field       | text             |
           | title       | title-test-sw      |
           | description | description-test |
           | statement   | statement-test   |
           | summary     | summary-test     |
