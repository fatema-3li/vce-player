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

Use Add to import a native `.vce` format 3.1 text-choice exam or a JSON file. Native import happens locally in the browser, with no upload service or conversion step. Format 3.1 support has been validated against the user-supplied 40-question Introduction exam, including three multiple-answer questions and explanations. Quoted text-format fields, embedded PNG/JPEG diagrams, and paragraph controls are also supported and tested with the 95-question Agile file. Agile question 7 stores explicit matching pairs as text and blank choices; it is now converted into a matching exercise with dropdowns, row-specific grading, and explanations hidden until Show Answer. Other VCE versions, interactive question types, named sections, case-study groups, and unsupported document structures are rejected explicitly; this is not universal VCE compatibility. Native exams retain their passing threshold on the 1000-point scale.

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

Questions may carry optional `caseStudy` and `caseStudyTitle` text fields. A View Case Study button opens the content without changing answers; it also works during review and after session resume. The format-31 reader preserves inline case-study documents when the choice metadata enables them, using strict document-count validation. Neither private Introduction nor Agile fixture enables that field; native case-study layout still needs validation against a real case-bearing exam. Case-study exam groups remain unsupported. `scripts/case-study-regression.mjs` tests the viewer using original JSON content with the same external Playwright setup as the other browser check.

Save Session pauses and saves the current exam, then returns to the library. Resume session restores candidate, answers, marks, current question/filter, and remaining time. One saved-session slot is kept per browser profile. Snapshot metadata omits the duplicate full exam question list to reduce storage use. Page-hide and visibility events also save progress for mobile navigation; backgrounding pauses the active exam. Explicit Save Session reports storage failures and keeps the exam open if saving fails.

The site link is public. Imported files, saved sessions, and history stay in local browser storage, rather than being uploaded or shared between visitors. Different browsers/devices have separate data and no synchronization. People using the same browser profile share its data; clearing site data or ending a private-browsing session can remove it. `scripts/session-regression.mjs` verifies reopening a saved exam in a new tab, filtered position, timer preservation, and separate browser contexts.

The built-in sample and sample download button are removed; migration removes only the reserved built-in sample ID, preserving personal imports and saved progress. The Saved sessions table shows the current saved exam, candidate, answered count, and time with Resume and Delete actions. Diagrams fit the available width without cropping and can be tapped to open a scrollable full-resolution view. Display zoom cannot repair corruption already present in extracted or source image bytes; diagnosing a damaged diagram requires its original VCE file. `scripts/library-regression.mjs` covers these library and viewer behaviors.

Explicit `>>>>>>>` text matching workarounds with blank choices are recovered conservatively. Each left-hand subject gets a dropdown; every pair must be correct for credit, and incomplete rows remain incomplete. Existing personal exams migrate on load; old placeholder answers for converted matching questions in saved sessions are cleared rather than interpreted as valid pair selections. Actual native drag-and-drop types remain outside this text-recovery feature. `scripts/matching-regression.mjs` tests the private Agile fixture, resume/review, and legacy migration.
