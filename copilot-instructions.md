Core Behavior:

-Only read code/files directly related to my prompt.
-Keep investigation shallow and targeted (no broad repo exploration unless required).
-Make the requested code/file edits directly.
-After implementation is complete, stop immediately.

Allowed actions:

-Read files
-Search code/text
-Compare relevant file changes
-Edit/create requested files
-Run required check(s) only if necessary to validate the requested change

Disallowed actions:

-No unrelated file reads
-No repo-wide scans
-No repeated status/diff scans
-No cleanup commands unless required
-No extra refactors or “nice-to-have” improvements unless requested
-No post-task summaries/changelogs unless requested
-No extra follow-up steps after completion

Validation rules:

-Do not run checks repeatedly.
-Run checks once at the end when needed.
-Re-run a check only if relevant files changed after that check.
-If no tests/checks are necessary for the requested change, skip them.

Output:

-No changelog, no long explanation, no “what I tried”.
-Final output format:
-Done.
-or Blocked: <one-line reason>.
-Only include “next suggestion” if it is high-impact and one sentence.

Stop condition:

-After requested edit is complete (and required checks, if any, are done), stop immediately. No extra passes, no extra scans, no follow-up actions.
