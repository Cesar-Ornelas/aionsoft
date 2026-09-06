# Customer-Requested Project Pause Workflow

Use this internal workflow when a customer asks to pause an active project while development, testing, or delivery remains incomplete.

> The signed agreement controls notice periods, payment, ownership, delivery, suspension, and termination. A pause does not automatically require the team to complete unfinished work after the effective date. Escalate contractual disputes and unclear obligations for legal review.

## 1. Confirm the Request

Obtain written confirmation of:

- The requested pause date
- Whether the request is a pause, cancellation, or reduction in scope
- Whether hosting, support, maintenance, licenses, or monitoring should continue
- The customer's reason for pausing, when relevant
- The customer contact authorized to approve the pause

Confirm receipt without immediately accepting terms that conflict with the agreement.

## 2. Review the Agreement

Before committing to a cutoff plan, confirm:

- Required notice period
- Retainer and reserved-capacity treatment
- Payment due through the pause date
- Rules for prepaid or unused hours
- Ownership and delivery rights for work in progress
- Suspension, termination, and restart provisions
- Ongoing third-party or infrastructure costs

Do not create credits, refunds, rollover balances, or free completion obligations unless they are required by the agreement or approved as a documented exception.

## 3. Assess Work in Progress

Classify every active feature before the pause date.

| Status | Meaning | Normal action |
| --- | --- | --- |
| Complete and tested | Meets the agreed acceptance criteria | Prepare for approved delivery or deployment |
| Complete but untested | Development is complete but validation is pending | Preserve safely and document required testing |
| Partially complete | Implementation has started but is not ready for use | Keep isolated, disabled, or unreleased |
| Not started | No implementation has begun | Record as remaining scope |

Do not represent unfinished or untested work as production-ready. Do not deploy incomplete features merely to meet the pause date.

## 4. Propose the Cutoff Plan

Prepare a written plan showing:

- Work that can be completed safely before the pause date
- Work that will remain unfinished or untested
- Tasks required to leave systems stable and secure
- Customer decisions or testing needed before the cutoff
- Hours or capacity available before the pause
- Work that requires separate authorization or a later restart

If the customer expects all unfinished features to be completed, propose a revised pause date, a transition period, or separately authorized work.

## 5. Document Status and Financials

- Record billable, included, and additional-investment hours through the pause date.
- Identify invoices, approved expenses, and third-party costs still due.
- Explain the treatment of the current retainer according to the agreement.
- Record any approved refund, credit, or rollover as a commercial exception.
- Use the [Project Activity & Value Report](../templates/customer-reports/project-activity-and-value-report.md) to summarize effort and outcomes.
- Use the [Project Dependency & Schedule Impact Notice](../templates/customer-reports/project-dependency-and-schedule-impact-notice.md) when customer actions also affected the timeline.

## 6. Preserve the Project

Before the effective pause date:

1. Commit and preserve source code in the authorized repository.
2. Record the deployed version and the state of each environment.
3. Back up required data and configuration according to policy.
4. Document incomplete work, known defects, decisions, and next steps.
5. Preserve relevant designs, tickets, testing evidence, and communications.
6. Rotate, revoke, or retain credentials according to the agreed support state.
7. Disable unfinished features or feature flags that are unsafe for users.
8. Confirm ownership of ongoing hosting, monitoring, security, and renewals.

Do not delete customer assets or disable production services unless authorized by the agreement and confirmed in writing.

## 7. Send the Pause Confirmation

The written confirmation should include:

- Effective pause date
- Completed, incomplete, and untested work
- Deliverables or access being provided
- Known risks and unresolved dependencies
- Billing and ongoing service treatment
- Responsibilities that continue during the pause
- Conditions and contact process for restarting
- A request for acknowledgement or corrections

## 8. Pause and Close Internal Work

On the effective date:

1. Stop unauthorized development work.
2. Update project tracking to show the project as paused.
3. Release reserved capacity when permitted by the agreement.
4. Store the status report, approval, and supporting records together.
5. Assign an owner for any services or obligations that continue.
6. Record the earliest date on which follow-up is appropriate.

## 9. Restart and Rebaseline

Do not promise immediate restart after capacity has been released. Before resuming:

1. Obtain written authorization to restart.
2. Confirm scope, budget, billing, and customer responsibilities.
3. Review team availability and provide a new start date.
4. Reassess dependencies, security, versions, and unfinished work.
5. Estimate any revalidation or remobilization effort.
6. Issue revised milestones and obtain written acknowledgement.

## Internal Record

**Customer:** [Customer name]  
**Project:** [Project name]  
**Request received:** [Date]  
**Requested pause date:** [Date]  
**Approved pause date:** [Date]  
**Agreement reviewed by:** [Name]  
**Technical cutoff approved by:** [Name]  
**Customer acknowledgement received:** [Date or pending]  
**Ongoing services:** [Details or none]  
**Outstanding balance or costs:** [Details or none]  
**Restart conditions:** [Details]