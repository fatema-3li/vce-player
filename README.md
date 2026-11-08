# VCE Player

A browser-based exam practice player inspired by the supplied desktop screenshots. No external dependencies or accounts are required.

## Run

Use Node.js 24+ for tests and Python 3 for the static development server:

```
cd /workspace/vce-player
npm test
npm start
```

The server listens on port 3000. Open the app in a browser. Add your exam, select it, and click Start to configure your candidate name, question selection, training mode, and timer.

Features include single/multiple-choice questions, section/count/range selection, marking, pause, local session save/resume, answer explanations in every exam mode, automatic submission at timeout, scores out of 1000 (700 to pass by default; native VCE threshold retained), section breakdowns, filtered review and retakes, history, and printable reports. Browser local storage retains exams, sessions, and up to 50 reports. Data stays in the current browser; clearing browser data deletes it. The timer runs while the page is open and unpaused; this is a practice tool, not a proctored exam system.

## Import format

Use Add to import a native `.vce` format 3.1 text-choice exam or a JSON file. Native import happens locally in the browser, with no upload service or conversion step. Format 3.1 support has been validated against the user-supplied 40-question Introduction exam, including three multiple-answer questions and explanations. Quoted text-format fields, embedded PNG/JPEG diagrams, and paragraph controls are also supported and tested with the 95-question Agile file. Agile question 7 stores explicit matching pairs as text and blank choices; it is now converted into a matching exercise with draggable cards, row-specific grading, and explanations hidden until Show Answer. Other VCE versions, interactive question types, named sections, case-study groups, and unsupported document structures are rejected explicitly; this is not universal VCE compatibility. Native exams retain their passing threshold on the 1000-point scale.

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

Answer indexes start at zero. Multiple answer indexes create a multiple-choice checkbox question; all correct options and no incorrect options must be selected to earn credit. Every question has equal weight. Imported content is rendered as text, not HTML. The sample module is used only by development tests; it is not added to the user library.

## Validation

`npm test` checks grading, exact-match multiple-answer scoring, section totals, unanswered questions, and import validation. The application has no build step.

The optional `scripts/browser-regression.mjs` checks History after reload and Show/Hide Answer in standard mode on a phone-sized viewport. With the server running and Playwright installed separately, run `node scripts/browser-regression.mjs`. Set `PLAYWRIGHT_MODULE` to an external Playwright module path if needed, `CHROMIUM_PATH` to your Chromium executable, and `APP_URL` to override the default local server address.

On iPhone/iPad the file picker intentionally allows all file types because iOS can disable unfamiliar `.vce` extensions when an HTML accept filter is set. Select a `.vce` or `.json` file; the app validates its contents after selection.

Set `VCE_AGILE_TEST_FILE` to a local Agile fixture path to run its compatibility test. Both private fixture files remain outside Git.

Questions may carry optional `caseStudy` and `caseStudyTitle` text fields. A View Case Study button opens the content without changing answers; it also works during review and after session resume. The format-31 reader preserves inline case-study documents when the choice metadata enables them, using strict document-count validation. Introduction and Agile do not enable that field. Inline case-study layout is now validated with Risk questions 77 and 78, including lists and diagrams. Case-study exam groups remain unsupported. `scripts/case-study-regression.mjs` tests the viewer using original JSON content with the same external Playwright setup as the other browser check.

Save Session pauses and saves the current exam, then returns to the library. Resume session restores candidate, answers, marks, current question/filter, and remaining time. One saved-session slot is kept per browser profile. Snapshot metadata omits the duplicate full exam question list to reduce storage use. Page-hide and visibility events also save progress for mobile navigation; backgrounding pauses the active exam. Explicit Save Session reports storage failures and keeps the exam open if saving fails.

The site link is public. Imported files, saved sessions, and history stay in local browser storage, rather than being uploaded or shared between visitors. Different browsers/devices have separate data and no synchronization. People using the same browser profile share its data; clearing site data or ending a private-browsing session can remove it. `scripts/session-regression.mjs` verifies reopening a saved exam in a new tab, filtered position, timer preservation, and separate browser contexts.

The built-in sample and sample download button are removed; migration removes only the reserved built-in sample ID, preserving personal imports and saved progress. The Saved sessions table shows the current saved exam, candidate, answered count, and time with Resume and Delete actions. Diagrams fit the available width without cropping and can be tapped to open a scrollable full-resolution view. Display zoom cannot repair corruption already present in extracted or source image bytes; diagnosing a damaged diagram requires its original VCE file. `scripts/library-regression.mjs` covers these library and viewer behaviors.

Explicit `>>>>>>>` text matching workarounds with blank choices are recovered conservatively. Each subject gets a drop target; every pair must be correct for credit, and incomplete rows remain incomplete. Existing personal exams migrate on load; old placeholder answers for converted matching questions in saved sessions are cleared rather than interpreted as valid pair selections. Actual native drag-and-drop types remain outside this text-recovery feature. `scripts/matching-regression.mjs` tests the private Agile fixture, resume/review, and legacy migration.

Matching uses pointer-based dragging for touch, mouse, and pen. Cards can also be selected by tap or keyboard, then placed by activating a target. Clear removes a placement. Cards are reusable for schemas that assign the same ceremony more than once. Near screen edges, dragging scrolls the page. Review disables placement; Show Answer preserves learner selections. Existing matching answer arrays and scoring are unchanged. The mobile browser regression sends real touch events and checks drag placement, clearing, keyboard placement, tap placement, resume, and scoring.

New exams default to Take selected exam with the timer unchecked; timed practice is opt-in. Saved sessions appear above the exam library. Refresh app navigates to a fresh page URL without clearing browser storage. Before publishing frontend changes, run `node scripts/stamp-release.mjs <new-release-tag>` to update the stylesheet, entry module, and relative module import URLs together. This avoids a mix of old and new cached assets. A previously cached HTML page may still require the fresh release link or a browser hard refresh once. `scripts/defaults-regression.mjs` verifies desktop and phone defaults, session placement, coherent asset versions, and refresh persistence.

Reading controls A− / percentage reset / A+ enlarge question, choice, explanation, and case-study text from 100% to 200% in 10% steps. The preference is retained in the current browser and does not change exam answers. The inactive window decoration icons are removed. Calculator now provides an editable expression display, a touch keypad, keyboard Enter evaluation, parentheses and operation precedence, decimal arithmetic, sign change, square root, square, percent, clear, and backspace. Percent is a mathematical postfix (10% = 0.1); e.g. 100 × 10% = 10. Arithmetic uses a bounded parser, not eval; results use 12 significant digits. Calculator errors do not close the exam. `scripts/reading-calculator-regression.mjs` checks both PC and phone layouts, persistent font size, calculator input/results, and answer preservation.

Calculator opens as a movable, nonmodal panel, so the question remains scrollable and answer controls remain usable. Drag its title handle with mouse/touch/pen, or focus the handle and use arrow keys (Shift for larger steps). Minimize/Expand preserves the expression; Close/reopen preserves it during the current page visit. Resize and mobile visual-viewport changes keep the panel within screen bounds. Only one calculator panel opens at a time; it does not force the phone keyboard to appear. `scripts/movable-calculator-regression.mjs` validates mouse/touch dragging, background interaction, keyboard movement, retained calculation, minimizing, and orientation/viewport changes.

Risk and Governance compatibility: observed RichView list-item controls (`-11 0 0 0 0 0 [01] 0 1 [01]`) are rendered as bullet items, preserving following Unicode text and embedded diagrams. Other unrecognized negative styles still fail explicitly. Private fixture tests validate all 90 Risk and 95 Governance questions, answer keys, complete case-study list items and images, and truncated-input rejection. Set `VCE_RISK_TEST_FILE` and `VCE_GOVERNANCE_TEST_FILE` to private local paths; these files are not tracked. `scripts/rich-content-regression.mjs` checks both imports, mobile case-study rendering, loaded diagrams, and save/resume.
