# SPQR development handoff

- Until the owner says the ongoing gameplay updates are finished, `stepOnO927/spqr-can-you-save-rome/main` is the authoritative game source. Never overwrite it from the older private vault.
- After a requested code change, commit and push the work to a reviewable branch. Use GitHub-hosted Actions for builds, browser tests and release checks. Do not run the game build or browser tests on the owner's computer.
- After cloud checks pass, complete the authorized review/merge flow and verify the beta release. Report exact commit and release URLs. Never claim uncommitted local work was automatically released.
- The private vault's release workflow owns the staging distribution. The original repository name, visibility and site URL must not change until the owner explicitly says the updates are complete and authorizes the final transfer.
- Never commit credentials, private keys, save files or internal archives to the public distribution.
