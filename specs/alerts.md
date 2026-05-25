# Alerts

## Overview

The admin app needs a generic alerts registry so different features can publish actionable in-app alerts that link users back to the owning item.

This first pass is shell-driven and in-app only.

## Rules

1. Every alert must include a source type, source ID, title, and href.
2. Alerts must be able to link back to the owning item through `href`.
3. Alerts use one of three severities: `info`, `warning`, `critical`.
4. Alerts use one of three statuses: `active`, `dismissed`, `resolved`.
5. The root admin shell shows alerts through a dropdown icon that changes visual state when active alerts exist.

## Current Usage

The first feature integrated with alerts is `Tasks`.

Future domains such as Monitoring or other tools can register alerts against the same store by providing their own source identifiers and target hrefs.