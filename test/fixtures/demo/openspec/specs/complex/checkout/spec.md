# Checkout Specification

## Purpose

Complex case: many requirements and scenarios, long AND chains, long sentences, inline code, quotes, pipes, brackets and angle brackets in the text.

## Requirements

### Requirement: Cart totals
The system SHALL compute the cart total as the sum of line items, minus discounts, plus tax and shipping.

#### Scenario: Single item
- **WHEN** the cart holds one item priced 10.00 with quantity 2
- **THEN** the subtotal is 20.00

#### Scenario: Discount code applied
- **GIVEN** a cart with a subtotal of 100.00
- **WHEN** the shopper enters the code `SAVE10`
- **AND** the code is active and not yet used by this account
- **AND** the cart contains at least one eligible item
- **THEN** the subtotal is reduced by 10%
- **AND** the discount line shows "SAVE10 (-10.00)"
- **AND** the code is marked as used only after payment succeeds

#### Scenario: Tax by region
- **WHEN** the shipping address is in a region with 21% VAT
- **THEN** tax is calculated on the discounted subtotal | not on shipping
- **AND** the tax line is rounded half-up to two decimals

### Requirement: Payment
The system MUST charge the shopper's chosen payment method exactly once per order.

#### Scenario: Successful card payment
- **WHEN** the shopper confirms an order with a valid card
- **THEN** the card is charged for the total
- **AND** the order status becomes `paid`
- **AND** a confirmation email is queued

#### Scenario: Card declined
- **WHEN** the payment provider responds with `card_declined`
- **THEN** the order stays in `pending`
- **AND** the shopper sees "Your card was declined, please try another method"
- **AND** no stock is released

#### Scenario: Duplicate submit
- **WHEN** the shopper double-clicks "Pay" and two identical requests arrive within 2 seconds
- **THEN** only the first request charges the card
- **AND** the second returns the first result (idempotent)

#### Scenario: Provider timeout
- **WHEN** the provider does not answer within 30 seconds
- **THEN** the order is flagged `needs_review`
- **AND** the shopper is told the result is unknown and not to retry

### Requirement: Stock reservation
The system SHALL reserve stock when checkout starts and release it after 15 minutes without payment.

#### Scenario: Reservation expires
- **GIVEN** an order in `pending` for 15 minutes
- **WHEN** the cleanup job runs
- **THEN** the reserved stock is returned to the pool

#### Scenario: Out of stock during checkout
- **WHEN** another shopper buys the last unit first
- **THEN** the checkout shows "Item <b>unavailable</b> [sold out]"
- **AND** the line is removed from the cart

### Requirement: Order history
Signed-in shoppers SHALL see their past orders, newest first, with status and total.

#### Scenario: Empty history
- **WHEN** a shopper without orders opens "My orders"
- **THEN** an empty-state message is displayed

#### Scenario: Many orders
- **WHEN** a shopper has more than 20 orders
- **THEN** the list is paginated 20 per page
