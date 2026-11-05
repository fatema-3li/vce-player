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

Features include single/multiple-choice questions, section/count/range selection, marking, pause, local session save/resume, answer explanations in every exam mode, automatic submission at timeout, scores out of 1000 (700 to pass by default; native VCE threshold retained), section breakdowns, filtered review and retakes, history, and printable reports. Browser local storage retains exams, sessions, and up to 50 reports. Data stays in the current browser; clearing browser data deletes it. The timer runs while the page is open and unpaused; this is a practice tool, not a proctored exam system.

## Import format

Use Add to import a native `.vce` format 3.1 text-choice exam or a JSON file. Native import happens locally in the browser, with no upload service or conversion step. Format 3.1 support has been validated against the user-supplied 40-question Introduction exam, including three multiple-answer questions and explanations. Other VCE versions, images, interactive question types, named sections, case-study groups, and unsupported document structures are rejected explicitly; this is not universal VCE compatibility. Native exams retain their passing threshold on the 1000-point scale. Sample JSON downloads an example of the optional JSON format.

Format reference: [VCE format research](https://github.com/jgt87/vce-player/blob/main/docs/VCE-FILE-FORMAT.md). The browser reader is independently implemented from the documented field framing and observed file structure. Private exam files are not included in the repository. Set `VCE_TEST_FILE` to the local Introduction fixture path to run its compatibility test.

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

The optional `scripts/browser-regression.mjs` checks History after reload and Show/Hide Answer in standard mode on a phone-sized viewport. With the server running and Playwright installed separately, run `node scripts/browser-regression.mjs`. Set `PLAYWRIGHT_MODULE` to an external Playwright module path if needed, `CHROMIUM_PATH` to your Chromium executable, and `APP_URL` to override the default local server address.

On iPhone/iPad the file picker intentionally allows all file types because iOS can disable unfamiliar `.vce` extensions when an HTML accept filter is set. Select a `.vce` or `.json` file; the app validates its contents after selection.
