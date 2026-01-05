# Momentum

A personal productivity tool that helps track progress toward long-term goals through incremental daily/weekly check-ins.

## Overview

Momentum is inspired by Jira/scrum workflows but adapted for solo use, with behavioral science principles from Atomic Habits and Tim Urban's work on procrastination. The app makes progress visible and reduces friction, surfacing what's being neglected and what has momentum.

## Features

- **Epics & Directives**: Organize large goals (epics) with recurring activities (directives)
- **Days Invested Tracking**: Primary metric is "did I touch this today?" not hours worked
- **Visual Progress**: GitHub-style commit graphs and activity density metrics
- **Suggested Actions**: AI-powered recommendations mixing neglected and high-momentum items
- **Low Friction Check-ins**: Quick logging with optional details
- **Wellness Aesthetic**: Warm, premium UI that feels like self-care

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Data Storage

Currently uses localStorage for data persistence. All data is stored locally in your browser.

## Project Structure

```
/src
  /components     - React components (EpicCard, DirectiveRow, etc.)
  /hooks          - Custom React hooks (useMomentumData)
  /lib            - Core logic and utilities
    types.ts            - TypeScript type definitions
    computeDerivedData.ts - Data calculations and seed data
  /styles         - Global CSS
  App.tsx         - Main application component
  main.tsx        - Application entry point
```

## Key Concepts

- **Epics**: Large, overarching goals (e.g., "Launch lighting business")
- **Directives**: Recurring activities within epics with check-in intervals
- **Activity Types**: build, learn, train, research, plan, arrange
- **Phases**: exploring, building, active, refining, paused
- **Days Invested**: Count of unique days with activity (not hours)

## Future Enhancements

- Google Drive integration for data sync
- AI parsing of natural language check-ins
- Weekly report view
- Voice/phone call check-ins
- Photo attachments
- Offline support with sync

## License

MIT
