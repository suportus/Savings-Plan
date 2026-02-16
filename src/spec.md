# Specification

## Summary
**Goal:** Replace the first dashboard summary card (“Total Goals”) with a new “Monthly Target” card that aggregates the per-goal Monthly Target amounts shown on goal cards.

**Planned changes:**
- Update `frontend/src/components/Dashboard.tsx` to replace the first top-row summary card title/label from “Total Goals” to “Monthly Target” while keeping the existing 5-card grid layout and leaving all goal data unchanged.
- Implement a “Monthly Target” aggregate that sums the Monthly Target values for only the goals that display a Monthly Target row, using the same calculation rules as `GoalCard` (including deadline-based monthsRemaining logic and the <1 month correction).
- Format the aggregated value with the existing global currency symbol logic (EUR → €; USD → $) and display it with 2 decimal places.
- Match existing summary-card structure and styling: left icon in a 10x10 rounded wrapper; card title in default grey/dark; amount text and icon colored using the existing `text-monthly-target` blue styling; ensure the amount baseline aligns with neighboring cards.

**User-visible outcome:** The dashboard top row still shows 5 summary cards, but the first card now reads “Monthly Target” and displays the summed monthly target amount (in the correct currency/format) with consistent icon placement, color, and alignment.
