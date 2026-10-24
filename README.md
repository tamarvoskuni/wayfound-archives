# The Wayfound Archives

A companion site for *Witch & Hunter* by Tamar Voskuni (September 7, 2027). The page scrolls from a sunlit forest through sunset and moonrise to a brick wall. People who have preordered enter a shared password to open the archive behind it.

Hosted on GitHub Pages. Plain HTML, CSS and JavaScript, with no build step.

## How the password works

GitHub Pages only serves files, and this repo is public, so the archive is **locked with the password** instead of hidden.

- The archive content lives in `private/archive.html`. That folder is never committed (see `.gitignore`), so **keep a backup of it**.
- `tools/seal.py` locks it into `assets/archive.sealed.json`, which is safe to publish because it's unreadable without the password.
- In the browser, the password unlocks that file directly. Nothing is checked against a server, and the password isn't written anywhere in the code.
- The password ignores capital letters and extra spaces.

### Changing the archive or the password

```sh
python3 -m venv .venv && .venv/bin/pip install cryptography   # first time only
.venv/bin/python tools/seal.py      # asks for the password, then locks private/archive.html
git add assets/archive.sealed.json && git commit -m "Reseal archive" && git push
```

Re-running `seal.py` with a new password changes it for everyone. Readers who saved the old one will see the password box again.

## Previewing locally

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. To jump to a point in the scroll, add `?at=` with a number from 0 to 1, for example `?at=0.5` for dusk or `?at=1` for the wall.

## Editing

- **Captions:** in `index.html`. `data-in` and `data-out` set where each caption appears, from 0 (top) to 1 (the wall).
- **Colors and timing:** the sky colors are at the top of the scene section in `assets/js/main.js`. The palette is at the top of `assets/css/style.css`.
- **Image credits:** in `CREDITS.md`.
