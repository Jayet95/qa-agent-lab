@health
Feature: App health
  Cross-cutting checks that every release must pass

  @smoke
  Scenario: The app loads cleanly
    Given I am a new visitor
    Then the welcome screen is shown
    And no errors were logged in the browser
    And bug mode is off
