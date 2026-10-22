@kyc @ocr
Feature: Reading identity documents (OCR)
  As a new customer verifying my identity
  I want my details read automatically from my document
  So that I only need to check and correct them, not type them

  Background:
    Given I have signed up as "Noa Cohen"

  @smoke @critical
  Scenario: Details are read from my passport for review
    When I scan my passport
    Then I see these details read from my document:
      | field           | value      |
      | full name       | NOA COHEN  |
      | date of birth   | 1992-04-17 |
      | nationality     | Israeli    |
      | document number | P4183920   |
      | expiry date     | 2031-08-30 |
    And no field is flagged as low confidence
    When I confirm the details
    Then verification completes successfully

  @critical
  Scenario: A misread name is flagged and must be corrected
    When I scan my ID card
    Then the full name is flagged as low confidence
    When I confirm the details
    Then I see the full name error "Name must match your account (Noa Cohen)"
    When I change the full name to "Noa Cohen"
    Then the full name error disappears
    When I confirm the details
    Then verification completes successfully

  @critical
  Scenario Outline: Invalid document details are rejected (<field>: <value>)
    When I scan my passport
    And I change the <field> to "<value>"
    And I confirm the details
    Then I see the <field> error "<message>"
    And my identity is not submitted for verification

    Examples:
      | field           | value      | message                           |
      | expiry date     | 2020-01-31 | This document has expired         |
      | date of birth   | 2015-06-01 | You must be at least 18 years old |
      | date of birth   | 17/04/1992 | Use the format YYYY-MM-DD         |
      | expiry date     | 2031-02-31 | Use the format YYYY-MM-DD         |
      | nationality     |            | Enter your nationality            |
      | document number | AB-12      | Enter a valid document number     |
