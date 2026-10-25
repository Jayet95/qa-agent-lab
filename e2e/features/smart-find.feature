@smart-find
Feature: Smart find and self-healing locators
  Tests should describe elements the way a person would, and survive
  cosmetic changes like a renamed test ID — while telling us what to fix.

  Scenario: Elements are found from plain descriptions
    Given I am a new visitor
    When I use smart find on "Get started button"
    And I use smart find on "Email field"
    And I use smart find on "Password"
    And I use smart find on "Creat acount button"
    Then smart find used these strategies:
      | description         | strategy |
      | Get started button  | role     |
      | Email field         | role     |
      | Password            | label    |
      | Creat acount button | fuzzy    |

  @critical
  Scenario: A renamed test ID is healed at runtime and reported
    Given the app ships with renamed test IDs
    And I am a new visitor
    When I sign up as "Noa Cohen"
    Then 2 locators were healed by smart find
    And each healed locator suggests a stable replacement selector
