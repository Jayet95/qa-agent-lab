@deposits
Feature: Adding money
  As a verified customer
  I want to top up my wallet from my card
  So I have money to send

  @smoke @critical
  Scenario: Add money to the wallet
    Given I am a verified customer with $1,000.00
    When I add $250 to my wallet
    Then I see the confirmation "Added $250.00 to your wallet"
    And my balance is $1,250.00
    And my latest transaction is a deposit of $250.00

  Scenario: Pick a quick amount
    Given I am a verified customer with $1,000.00
    When I add the $100 quick amount to my wallet
    Then my balance is $1,100.00

  @critical
  Scenario: Deposits don't use up the daily send limit
    Given I am a verified customer with $1,000.00
    When I add $300 to my wallet
    Then I have $500.00 left to send today

  @critical
  Scenario Outline: Invalid deposits are rejected ("<amount>")
    Given I am a verified customer with $1,000.00
    When I try to add "<amount>" to my wallet
    Then the deposit is rejected with "<message>"
    And my balance is still $1,000.00

    Examples:
      | amount  | message                                 |
      | abc     | Enter a valid number, like 25 or 25.50  |
      | 0       | Enter an amount greater than $0         |
      | -20     | Enter an amount greater than $0         |
      | 5000.01 | You can add up to $5,000.00 at a time   |

  Scenario: Unverified customers cannot add money
    Given I am a customer who has not verified their identity
    When I try to add $10 to my wallet
    Then the deposit is rejected with "Verify your identity before adding money"
