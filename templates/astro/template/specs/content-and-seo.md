# Content And SEO

## Required before launch

- Final site title and meta description
- Canonical site URL configured in `astro.config.mjs`
- Open Graph title, description, and image plan
- Robots and sitemap strategy
- Analytics and privacy requirements clarified
- `PUBLIC_SWETRIX_PROJECT_ID` configured (if analytics is required)

## Content rules

- Each page should have one clear primary action or informational goal.
- Marketing copy should be specific and outcome-driven.
- Avoid placeholder content in production branches.

## Accessibility rules

- Headings must remain hierarchical.
- Interactive elements must be keyboard reachable.
- Color choices must maintain readable contrast.

## Analytics rules

- Keep analytics provider ids in environment variables only.
- Verify a no-JavaScript fallback path is present for page view tracking when required.