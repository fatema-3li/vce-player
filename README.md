# VCE Player

A browser-based exam practice player inspired by the supplied desktop screenshots. No external dependencies or accounts are required.

## Run

Use Node.js 24+ for tests and Python 3 for the static development server:

```
cd /workspace/vce-player
npm test
npm start
```

The server listens on port 3000. Open the app in a browser. Select Exam Sample and Start to configure your candidate name, question selection, training mode, and timer.

Features include single/multiple-choice questions, section/count/range selection, marking, pause, local session save/resume, training explanations, automatic submission at timeout, scores out of 1000 (700 to pass), section breakdowns, filtered review and retakes, history, and printable reports. Browser local storage retains exams, sessions, and up to 50 reports. Data stays in the current browser; clearing browser data deletes it. The timer runs while the page is open and unpaused; this is a practice tool, not a proctored exam system.

## Import format

Use Add to import a JSON file, or Sample JSON to download an example. Proprietary binary `.vce` files are **not supported**; screenshots do not provide their format. Convert/export question content to this documented format first. A native VCE importer requires format documentation and representative files.

```json
{
  "title": "My exam",
  "number": "001",
  "questions": [{
    "id": "q1",
    "section": "Networking",
    "prompt": "Which protocol resolves domain names?",
    "options": ["DNS", "DHCP"],
    "answers": [0],
    "explanation": "DNS resolves names to addresses."
  }]
}
```

Answer indexes start at zero. Multiple answer indexes create a multiple-choice checkbox question; all correct options and no incorrect options must be selected to earn credit. Every question has equal weight. Imported content is rendered as text, not HTML. The sample contains illustrative practice material rather than a complete certification question bank.

## Validation

`npm test` checks grading, exact-match multiple-answer scoring, section totals, unanswered questions, and import validation. The application has no build step.
