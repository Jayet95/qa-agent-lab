@dynamic
Feature: Dynamic registration across markets
  Registration forms differ per market — fields, labels, languages and
  formats — and many fields have no test IDs. Instead of hand-coding
  selectors per market, the dynamic DOM reader reads the live form,
  resolves each field (catalog → fuzzy → semantic map → type), fills it
  with valid generated data and writes a field report.

  @critical
  Scenario Outline: Register in <market> without hand-written selectors
    Given I open sign-up for the "<market>" market
    When the dynamic DOM reader completes the form
    Then registration is accepted
    And every field was resolved
    And no form drift is detected

    Examples:
      | market |
      | us     |
      | il     |
      | uk     |
      | de     |

  Scenario: What the reader learns is reused from the catalog
    Given I open sign-up for the "de" market
    When the dynamic DOM reader inspects the form
    And the dynamic DOM reader inspects the form again
    Then every field is resolved from the catalog on the second pass

  Scenario: A changed form is reported as drift
    Given the "us" sign-up form has changed in a new release
    When the dynamic DOM reader inspects the form
    # "\|" escapes the pipe inside a field signature (kind|label)
    Then drift is reported with these new fields:
      | numeric\|postal zip code |
      | text\|referral code      |
    And drift is reported with these removed fields:
      | numeric\|zip code |
