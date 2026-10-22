@onboarding
Feature: Onboarding
  As a new customer
  I want to open an account and verify my identity
  So that I can start sending money

  @smoke @critical
  Scenario: A new customer signs up and gets verified
    Given I am a new visitor
    When I sign up as "Noa Cohen"
    And I verify my identity with a passport
    Then I land on my wallet greeted as "Noa"
    And my identity shows as verified
    And my balance is $1,000.00

  Scenario: Identity verification shows progress while it runs
    Given I have signed up
    When I submit my passport for verification
    Then I see that verification is in progress
    And verification completes successfully

  Scenario Outline: Sign-up rejects an invalid email "<email>"
    Given I am a new visitor
    When I try to sign up with the email "<email>"
    Then I see the email error "Enter a valid email address"
    And I am still on the sign-up form

    Examples:
      | email        |
      | noa.cohen    |
      | noa@         |
      | noa@paydemo  |
      | @paydemo.dev |

  Scenario Outline: Sign-up enforces password rules
    Given I am a new visitor
    When I try to sign up with the password "<password>"
    Then I see the password error "<message>"

    Examples:
      | password     | message                                |
      | short1       | Password must be at least 8 characters |
      | longpassword | Password must include a number         |

  @regression
  Scenario: Fixing an invalid field clears its error right away
    Given I am a new visitor
    When I try to sign up with the email "noa.cohen"
    And I correct the email to a valid address
    Then the email error disappears without resubmitting

  Scenario: Sign-up requires a full name
    Given I am a new visitor
    When I try to sign up without a name
    Then I see the name error "Enter your full name"
