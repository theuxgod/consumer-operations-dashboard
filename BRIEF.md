#Consumer Operations Dashboard - 301

## What is this?

Build a desktop-first operational dashboard for a Blue Radio Audio Labs, a fictional consumer audio company that designs, manufactures, distributes, and sells professional audio products including amplifiers, speakers, audio monitors, headphones, and accessories.

The primary user is the Director of Product & Commercial Operations.

The dashboard should help this user quickly understand the current health of the product business, identify products or operational issues that require attention, understand why those issues matter, and determine where to investigate or act next.

Think Shopify admin or Google ANalytics view.

**“How is the product business performing, and where do I need to intervene?**

This is an operational dashboard, not simply a reporting dashboard. It should prioritize actionable information, exceptions, risks, and changes over large amounts of raw data.

A user should be able to understand overall business health and identify the most important issues within approximately 30 seconds.

## Primary User

### Director of Product and Commercial Operations

This person is responsible for monitoring  the performance of the company’s product portfolio across:
 
- Sales
- Product Performance
- Inventory
- Distribution
- Product Launches
- Customer returns and repairs

The user regularly needs to identify situations that may require intervention, such as:

- Products selling below forecast
- Products selling significantly above forecast
- Inventory shortages
- Products at risk of going out of stock
- Revenue at risk because of inventory problems
- Unexpected increases in product returns or repairs
- Regional performance differences
- Emerging product performance issues

## User Goals

The dashboard should allow the user to:

- Understand the overall business health quickly
- Determine whether sales are performing against target.
- Identify products that require immediate attention.
- Detect inventory risks before products go out of stock.
- Understand how much revenue may be at risk.
- Identify unusual increases in returns or repairs.
- Compare product performance.
- Understand important trends over time.
- Filter the business by relevant dimensions such as date and region.
- Determine what should be investigated next without digging through a spreadsheet.

## Key Questions

The dashboard should help answer:

- How much revenue	 are we generating?
- Are we ahead of or behind our sales target?
- How many units are we selling?
- Which products are performing above or below expectations?
- Which product are at inventory risk?
- How much revenue is potentially at risk?
- Are any return or repairs rates unusually high?
- Which operations issues require attention right now?
- Are there meaningful differences between regions?
- How is performances changing over time?

## Information Hierarchy 

Organize the dashboard around the following hierarchy

**STATUS, PROBLEM, EXPLANATION, ACTION**

The page should first establish overall business health, then surface problems requiring attention, then provide supporting in formation that helps the user understand those problems.

The visual hierarchy should be:

- Global navigation and filters
- Overall business health / key metrics
- Needs Attention operational exceptions
- Performance trends
- Product level details

## Key metrics
Display four primary metric cards near the top of the dashboard.

### Revenue
- current revenue
- Percentage change compared with the previous comparable period
- Performance against target when appropriate

### Units Sold
- Total units sold
- Percentage change compared with the previous comparable period

### Inventory Risk
- Number of products currently at risk of running out of inventory
- Indicate whether the number of at-risk products has increased or decreased

### Revenue at Risk
- Estimated revenue potentially affected by inventory shortages or other operational issues
- Show change when useful

The metrics should provide context rather that showing isolated numbers.

## Needs Attention

Create a prominent **Need Attention** section.

This should be one of the most important parts of the dashboard.

Surface operational exceptions such as:

- A product has fewer than 7 days of inventory remaining.
- A product is selling significantly below forecast.
- A product is selling faster than expected and may run out of inventory.
- Return rates have increased significantly.
- A region is substantially underperforming.
- A product has an unusual increase in repairs.

Each alert should communicate:

- Severity
- Product affected
- What happened
- Why it matters
- Magnitude of the issue
- Relevant supporting information

Use clear severity levels such as:

- Critical
- Warning
- Informational

Red should be reserved for critical conditions.

Amber/orange should represent warnings.

Do not use warning colors decoratively.

## Sales Performance

Include a visualization showing sales performance over time.

The visualization should make it easy to understand:

- Current performance
- Overall trend
- Changes over tine
- Performance relative to target when useful

## Product performance

Include a product level performance section using a table or similarly scannable structure.

Include information such as:

- Product name
- Product category
- Revenue
- Units Sold
- Sales vs. target
- Current inventory
- Days of supply
- Return rate
- Operational status

Numeric values should be easy to compare.

Products with significant operational risks should be visually identifiable without overwhelming the table.

## Data

Create a fictional but realistic dataset for a professional consumer audio company.

Store the mock data in:

`src/data/metrics.json

Include approximately 15-25 fictional products across categories such as:

Bass instrument amplifiers
Speakers
Studio monitors
Headphones
Accessories

Do not use real company or product names.

The dataset should contain enough variation to create meaningful operational scenarios.

Product level data should include fields such as:

- Product ID
- Product name
- Category
- Region
- Revenue
- Units sold
- Sales target
- Sales vs. target
- Inventory quantity
- Days of supply
- Return rate
- Repair Rate
- Revenue at risk
- Operational status

Include multiple regions:

- Global
- North America
- Europe
- Asia Pacific

Include realistic examples of:

Healthy products
High performing products
Underperforming products
Low inventory products
Products with unusually high return rates
Products with unusually high repair rates

Numbers should be internally consistent and believable.

For example, products with strong sales and very low inventory may generate inventory risk alerts.

## Layout

Build a desktop first responsive dashboard.

Use a clear grid and strong visual hierarchy.

Suggested structure:

### Header
Include:
- Dashboard / product name
- Simple navigation if appropriate
- Date range filter
- Region filter

### Key Metrics
Display the four primary KPI cards in a single row on larger screens.

### Need Attention
Position this prominently below the primary metrics.

This section should have greater visual importance than secondary analytics.

### Performance Trends
Display sales/performance visualizations below operational alerts.

### Product Performance 
Place the detailed product table below the trend visualization.

The interface should feel information rich but not crowded.

### Interactions

The dashboard must include interactive functionality.

### Date Range Filter

Allow the user to select:

- Last 7 days
- Last 30 days
- Quarter
- Year to Date

Changing the date range should update relevant dashboard metrics and data.

### Region Filter

Allow the user to select:

- Global
- North America
- Europe
- Asia Pacific

Changing the region should update relevant metrics, alerts, charts, and product information.

Filters should be easy to find and should not dominate the interface.

If necessary for the training scope, prioritize making at least one filter fully functional before implementing additional interactions.

## Design and Style

The dashboard should feel like a polished modern enterprise operations product.

It should feel:

- Professional
- Confident
- Clean
- Modern
- Data driven
- Operational rather than promotional
- Information dense without feeling cluttered
- Dark theme by default 
- Minimal - lots of white space
- Charts should use cohesive color palette - not rainbow

### Design Principles

Establish strong visual hierarchy.
Prioritize actionable information.
Use generous but efficient spacing.
Make information easy to scan.
Keep decorative elements minimal.
Use typography intentionally to establish hierarchy.
Use color primarily to communicate meaning and status.
Avoid excessive shadows, gradients, or decorative effects.
Avoid making every card visually dominant.
Charts should exist only when they improve understanding.
Tables should prioritize scalability.
Right align numeric table values where appropriate.
Use consistent spacing and component patterns throughout the interface.

##Style


The Needs Attention section should visually command more attention than secondary analytics.

### Components

Use Vuetify components where appropriate instead of hand coding common interface patterns.

Create at least one reusable custom component.

### MetricCard

Create a reusable `MetricCard for the primary dashboard metrics.

It should support variable properties such as:

- Label
- Value
- Trend value
- Trend direction
- Optional Status


Use the same component for Revenue, Units Sold, Inventory Risk, and Revenue at Risk.

Additional reusable components may be created if they clearly improve the structure of the application, but avoid unnecessary abstraction.

## Tech

- Vue 3 + TypeScript + Vuetify 3
- Chart. js via vue-chartjs for all charts
- Fakedata from a local JSON file (no API calls)
- Single page - no routing needed for this app

Do not add unnecessary dependencies.

Store mock dashboard data in:

`src/data/metrics.json

Keep components organized and reusable.

## Responsive Design Intent

The dashboard is optimized for desktop operational use but should remain usable across common screen sizes.

At narrower widths:

- KPI cards should wrap into fewer columns.
- Filters may suck or wrap without overlapping.
- Needs attention items should remain fully readable.
- Charts should resize to their containers
- The product table may scroll horizontally rather than compressing data until it becomes unreadable.
- No Content should overlap or become inaccessible.

The information heierarchy should remain consistent regardless of screen size.

## Accessibility

Use reasonable accessibility practices.

- Maintain readable text contrast.
- Do not communicate status through color alone.
- Use clear labels for filters.
- Maintain readable font sizes.
- Use semantic components where possible.
- Interactive elements should have clear states.

## Nice to haves

- Product category filter
- Sales channel filter
- Sort products by risk
- Product detail view
- Chart tooltips
- Additional hover states
- More detailed alert explanations
- Ability to dismiss or acknowledge an operational alert

These are secondary to the core dashboard.

## Definition of Success

The dashboard is successful if the Director of Product & Commercial Operations can open it and quickly answer:

How is the business performing?
Is anything wrong?
What needs my attention first?
Where should I investigate or act next?

## Edge Cases and Empty States

The dashboard should handle incomplete or filtered data gracefully.

If a selected region or date range contains no operational alerts, display a clear positive empty state rather than leaving the section blank.

Example:

“No products currently require immediate attention. There are no critical inventory , sales, or quality exceptions for this selection.”

If no product records match a filter, explain that no products math the current filters and allow the user change or rest them.

Missing values should display a clear neutral state such as ”-“ rather than causing layout or rendering problems.

Filters should never leave the dashboard in a broken or confusing state.
