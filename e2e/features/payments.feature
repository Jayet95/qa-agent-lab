@payments
Feature: Sending money
  As a verified customer
  I want to send money to other people
  Within the regulatory daily limit of $500

  @smoke @critical
  Scenario: Send money within the daily limit
    Given I am a verified customer with $1,000.00
    When I send $120.50 to "friend@example.com"
    Then I see the confirmation "Payment of $120.50 approved"
    And my balance is $879.50
    And my latest transaction is $120.50 to "friend@example.com"

  @critical
  Scenario: A payment exactly at the daily limit is allowed
    Given I am a verified customer with $1,000.00
    When I send $500 to "landlord@example.com"
    Then I see the confirmation "Payment of $500.00 approved"
    And my balance is $500.00
    And I have $0.00 left to send today

  @critical
  Scenario Outline: Payments over the daily limit are rejected ($<amount>)
    Given I am a verified customer with $1,000.00
    When I try to send $<amount> to "friend@example.com"
    Then the payment is rejected with "Amount exceeds your daily limit of $500.00. You can send up to $500.00 right now."
    And my balance is still $1,000.00

    Examples:
      | amount |
      | 500.01 |
      | 550    |
      | 900    |

  @critical
  Scenario: The daily limit counts every payment made today
    Given I am a verified customer with $1,000.00
    And I have already sent $400 today
    When I try to send $150 to "friend@example.com"
    Then the payment is rejected with "Amount exceeds your daily limit of $500.00. You can send up to $100.00 right now."

  Scenario Outline: Invalid payment details are rejected
    Given I am a verified customer with $1,000.00
    When I try to send $<amount> to "<recipient>"
    Then the payment is rejected with "<message>"

    Examples:
      | recipient          | amount | message                         |
      | not-an-email       | 10     | Enter a valid recipient email   |
      | friend@example.com | 0      | Enter an amount greater than $0 |
      | friend@example.com | -5     | Enter an amount greater than $0 |

  Scenario Outline: Amounts that are not plain numbers are rejected ("<amount>")
    Given I am a verified customer with $1,000.00
    When I try to send "<amount>" to "friend@example.com"
    Then the payment is rejected with "<message>"
    And my balance is still $1,000.00

    Examples:
      | amount | message                                 |
      | abc    | Enter a valid number, like 25 or 25.50  |
      | 12abc  | Enter a valid number, like 25 or 25.50  |
      | #@!    | Enter a valid number, like 25 or 25.50  |
      | 1e3    | Enter a valid number, like 25 or 25.50  |
      | 10.555 | Use at most 2 decimal places            |

  @regression
  Scenario: The amount field warns while typing and clears once fixed
    Given I am a verified customer with $1,000.00
    When I open the send screen
    And I type "25x" as the amount
    Then the amount field warns "Enter a valid number, like 25 or 25.50"
    When I type "25" as the amount
    Then the amount field shows no warning

  @critical
  Scenario: The send screen says how much I can send right now
    Given I am a verified customer with $1,000.00
    And I have already sent $350 today
    When I open the send screen
    Then I am told I can send up to $150.00 right now
    When I choose to send the maximum
    Then the amount is "150.00"

  @regression
  Scenario: Editing the payment clears the previous rejection
    Given I am a verified customer with $1,000.00
    When I try to send $900 to "friend@example.com"
    And I change the amount to $100
    Then the rejection message disappears

  Scenario: Unverified customers cannot send money
    Given I am a customer who has not verified their identity
    When I try to send $10 to "friend@example.com"
    Then the payment is rejected with "Verify your identity before sending money"
