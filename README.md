# WFH + CO2 Data Story
A data visualisation project exploring the relationship between remote work trends in Scotland and CO2 emissions.

### Overview
This application uses a scroll-driven narrative (scrollytelling) to compare:

- Commuting Trends (2011–2022): Shift from car dependency to remote work.
- Carbon Emissionss: Stacked analysis of Workplace vs. Commute emissions.


## Tech Stack
React: UI framework.
- GSAP + ScrollTrigger: Narrative animation and scroll pinning.
- D3.js: Data scales and mathematical mapping.
- Lenis: Smooth scrolling engine.
- PapaParse: Client-side CSV parsing.

## Key Features
- Slope Chart: Animated SVG paths showing the percentage change in transport modes.
- Stacked Bar Chart: Dynamic bar growth representing categorized emissions (Workplace/Commute).
- Responsive Typography: Adaptive headers using clamp() for consistent impact across devices.
- Pinned Layouts: Sticky sections that lock during data transitions for a focused user experience.