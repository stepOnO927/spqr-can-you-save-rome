# Release blockers and decision

## Repository gates

A release package is acceptable for **platform inspection** only after the fast, browser and Poki package workflows all pass on the same branch head. A failed later run supersedes an earlier success. The latest run IDs and precise scope are in [TEST_RESULTS.md](TEST_RESULTS.md).

## External Poki submission gates

1. Upload the validated **`spqr-poki-package` artifact**, never the public GitHub Pages source tree. The dedicated package contains local map code and assets and the Poki bridge.
2. Run the uploaded build in the official Poki Inspector. Check first-input `gameplayStart`, `gameplayStop` on menus/pause/end, and resumed play after `commercialBreak`; review the network log on the platform. The current cloud test uses a mock SDK.
3. Supply and review Poki store assets, including the required static and animated thumbnails. These are not part of the repository build.
4. Confirm owner-controlled legal/privacy text and any outbound historical-source link behavior against Poki's submission requirements. The code routes links through the SDK, but the audit cannot authorize legal content or platform policy acceptance.
5. Perform real-device playtesting for readability and pace, including tutorials, long battles and campaign endings. Cloud Chromium touch tests verify functional tap paths at the required frame sizes, not a complete human usability study.

## Technical verdict

The known P0/P1 source failures from this audit have code corrections and cloud regression coverage. Broad gameplay areas in [FEATURE_MATRIX.md](FEATURE_MATRIX.md) remain PARTIAL or NOT TESTED and must not be described as certified. The source may be merged after all repository gates pass; Poki listing remains blocked until the platform and owner-controlled checks above are complete.
