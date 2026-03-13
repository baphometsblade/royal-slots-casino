# Bankroll Management Calculator

## Overview
The Bankroll Management Calculator is a responsible gambling tool that helps players understand and manage their bankroll effectively. It provides real-time calculations, bet size recommendations, and session tracking.

## Location
- **File**: `/js/bankroll-calculator.js`
- **Size**: 587 lines, ~23KB
- **Integration**: Automatically loaded in `index.html` (line 1483)

## Usage

### Opening the Calculator
From anywhere in the application, call:

```javascript
window.BankrollCalculator.show()
```

This will display a modal overlay with three main sections.

### Modal Sections

#### 1. Session Budget Calculator
Users can input:
- **Total Bankroll**: Their available funds (dynamic, auto-calculates)
- **Session Duration**: 1, 2, or 4 hours
- **Risk Level**: Conservative, Moderate, or Aggressive

The calculator outputs:
- **Recommended Bet Size**: Range from min to max for the selected risk level
- **Estimated Spins**: Based on 60 spins/hour average
- **Expected Loss (Low/High)**: Calculated using house edge percentages

**Real-time Updates**: Changes to inputs immediately recalculate all outputs.

#### 2. Bet Size Advisor
Shows recommended bet amounts for each risk level:
- **Conservative**: 0.5-1.0% of bankroll per spin
- **Moderate**: 1.0-2.0% of bankroll per spin
- **Aggressive**: 2.0-5.0% of bankroll per spin

Displays:
- Percentage range for each level
- Actual currency amounts based on current balance
- Visual warning if bankroll is running low:
  - **Critical** (red): ≤10% remaining
  - **Warning** (amber): ≤25% remaining
  - **Caution** (amber): ≤50% remaining
  - **Healthy** (green): >50% remaining

#### 3. Session Statistics
Live tracking of:
- **Starting Balance**: Captured when modal opens
- **Current Balance**: Updated from global balance state
- **Session P&L**: Profit/Loss (color-coded: green/red)
- **Spins This Session**: Total spins since session started

## House Edge Settings

The calculator uses these house edge values for expected loss calculations:
- **Conservative**: 2.5%
- **Moderate**: 3.5%
- **Aggressive**: 4.5%

Expected loss is calculated as:
```
Expected Loss = (Number of Spins × Bet Size × House Edge Percentage)
```

## Integration Points

### Data Sources
The calculator pulls data from:
1. **Balance**: `window.balance` (global) → `currentUser.balance` (fallback) → `localStorage['balance']` (final fallback)
2. **Stats**: `window.stats.totalSpins` (global) → `localStorage['sessionSpinCount']` (fallback)

### Styling
- **Theme**: Dark casino theme with gold accents
- **Colors**: 
  - Gold (#fbbf24) for primary elements
  - Dark backgrounds (#1a1a2e, #16213e)
  - Green (#10b981) for positive metrics
  - Red (#ef4444) for losses/warnings
  - Amber (#f59e0b) for cautions

- **Layout**: Responsive CSS Grid that adapts to mobile screens
- **Max Width**: 900px with 90% width on smaller screens

## Responsible Gambling Features

✓ Calculates expected losses transparently
✓ Provides risk-appropriate bet size guidance
✓ Visual warnings when bankroll runs low
✓ Session tracking for self-awareness
✓ Educational footer reminder about responsible play

## Technical Details

### IIFE Pattern
The module uses an IIFE (Immediately Invoked Function Expression) to maintain encapsulation:
```javascript
(function() {
    // All implementation is scoped inside
    window.BankrollCalculator = { show: function() { ... } };
})();
```

### No External Dependencies
- Pure vanilla JavaScript
- No jQuery, React, or other frameworks required
- Uses native DOM APIs only
- CSS-in-JS for styling

### Console Logging
- Uses `console.warn()` for all logging (never `console.error()`)
- Logs when module loads
- Logs when modal opens with current balance

## Examples

### Example 1: Basic Call
```javascript
// Open the calculator from anywhere
document.getElementById('bankrollBtn').onclick = () => {
    window.BankrollCalculator.show();
};
```

### Example 2: Integration with Menu
```javascript
// Add to game menu or settings
const btn = document.createElement('button');
btn.textContent = 'Bankroll Manager';
btn.onclick = () => window.BankrollCalculator.show();
settingsPanel.appendChild(btn);
```

## Modal Interactions

- **Close Button (×)**: Top-right corner, closes modal
- **Backdrop Click**: Clicking outside the modal closes it
- **Live Inputs**: Type in bankroll, select duration/risk level
- **Responsive**: Works on desktop and mobile devices

## Accessibility

- Semantic HTML structure
- Clear labels for all inputs
- Color-coded warnings (not relying on color alone)
- Readable font sizes and contrast
- Touch-friendly input controls

## Browser Compatibility

Works in all modern browsers supporting:
- CSS Grid
- ES6 (template literals, arrow functions)
- LocalStorage API
- Flexbox

## Future Enhancements

Potential additions:
- Multi-session tracking
- Graphical P&L charts
- CSV export of session stats
- Custom house edge settings
- Bankroll goal tracking
- Loss limit enforcement
