# Spec Delta

## ADDED Requirements

### Requirement: Gift wrapping
The system SHALL offer gift wrapping for a fee per order.

#### Scenario: Wrap selected
- **WHEN** the shopper ticks "Gift wrap" at checkout
- **THEN** a 3.00 fee line is added
- **AND** the packing slip hides prices

## MODIFIED Requirements

### Requirement: Payment
The system MUST charge the shopper's chosen payment method exactly once per order, and SHALL support wallets as well as cards.

#### Scenario: Successful wallet payment
- **WHEN** the shopper confirms an order paying with a wallet
- **THEN** the wallet is charged for the total
- **AND** the order status becomes `paid`

#### Scenario: Card declined
- **WHEN** the payment provider responds with `card_declined`
- **THEN** the order stays in `pending`
- **AND** the shopper is offered the wallet option

## REMOVED Requirements

### Requirement: Order history
**Reason**: Order history moves to the account area and is specified there.
**Migration**: Use the account area's "Orders" page instead of "My orders" in checkout.

## RENAMED Requirements

- FROM: `### Requirement: Stock reservation`
- TO: `### Requirement: Inventory hold`
