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
    Then the payment is rejected with "Amount exceeds your daily limit of $500.00"
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
    Then the payment is rejected with "Amount exceeds your daily limit of $500.00"

  Scenario Outline: Invalid payment details are rejected
    Given I am a verified customer with $1,000.00
    When I try to send $<amount> to "<recipient>"
    Then the payment is rejected with "<message>"

    Examples:
      | recipient          | amount | message                         |
      | not-an-email       | 10     | Enter a valid recipient email   |
      | friend@example.com | 0      | Enter an amount greater than $0 |
      | friend@example.com | -5     | Enter an amount greater than $0 |

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
