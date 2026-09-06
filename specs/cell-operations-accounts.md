# Cell Operations Accounts

## Purpose

Operations Accounts represent the service and delivery relationship after Sales qualifies companies as customers. CRM Companies remain the source of truth for acquisition, legal identity, contacts, and lifecycle.

## Relationship model

- One Operations Account can contain many CRM Companies.
- A CRM Company can belong to zero or one Operations Account.
- The relationship is stored as an optional, non-cascading `operations_account` relation on `crm_accounts`.
- An Operations Account can be created with only a name and linked companies later.
- Linking does not change the CRM company lifecycle.

## Linking rules

- Only companies with CRM lifecycle `customer` can be linked.
- Archived companies cannot be linked.
- A company already linked to another Operations Account must be explicitly unlinked before reassignment.
- Only active Operations Accounts accept new company links.
- Unlinking preserves the company's `customer` lifecycle.

## Archive behavior

Archiving an Operations Account preserves its company links. This supports historical reporting, compliance review, and future merger or account-split workflows. Archived accounts remain readable but cannot receive new links.

## Current implementation

The initial implementation supports account create, list, edit, archive, link company, unlink company, and listing linked companies. Application-level conflict checks enforce the one-company-to-one-account rule. PocketBase does not provide the transaction boundary needed to make concurrent link attempts fully atomic; this is a documented limitation until a stronger persistence capability is introduced.

## Deferred work

- Relationship history with effective dates and audit events.
- Merger and account-split workflows.
- Account numbers and external integration identifiers.
- Account-level permissions and ownership.
- Bulk reassignment and compliance exports.
