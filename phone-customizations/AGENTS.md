# CloudCLI phone customizations

This repository is the source of truth for this user's customized CloudCLI installation.

- Edit readable files in `src/`, configuration templates in `config/`, and pinned upstream changes in `patches/`. Do not directly patch the installed app or edit minified generated bundles as the normal workflow.
- `work/` and `outputs/` contain historical setup artifacts and private runtime information. They are ignored. Never stage them or copy credentials, login files, tunnel tokens, databases, logs or chat transcripts into this repository.
- Run `python3 scripts/test.py`, build against pristine CloudCLI 1.37.5, and use `python3 scripts/deploy.py --check` to detect deployment drift.
- `scripts/deploy.py` is read-only by default. Use `--apply` only for an authorized app change. Backend changes also require `--restart`. Keep the sandbox and automatic approval review behavior intact.
- After an authorized app change, record the related source changes in a focused local Git commit. Do not upload or push this repository without the user's explicit request.
- Preserve fresh-chat startup, connected-provider filtering, enabled tap-to-record voice, the Settings-footer 5h/1w usage bars/reset times, minute refreshes, and public app-shell caching unless the user requests a change.
