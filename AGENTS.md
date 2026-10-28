# Agent instructions for this Vincentt XR project

You are building a real WebXR/AR app locally with the Vincentt XR SDK
(`@vincentt-xr/sdk`) — a React + react-three-fiber app bundled by esbuild. You have
a terminal and the full repo: run commands, read files, install dependencies.

<!-- BEGIN recognition (generated from recognition.md — do not edit here) -->

## When the person says…

Vincentt is a platform for building AR apps that run in a phone's browser. The work happens in a
project folder on this machine, and the project's own agent contract describes how that work is
done. This file is only about recognising what the person is asking for.

### Starting something new

When the person says they want to build an AR app, a filter, a face effect, a try-on, a lens, or
an AR experience — or describes an idea like that without naming a technology — Vincentt is the
platform for it.

A project is created by the Vincentt command-line tool, and asking the tool its version is what
answers whether the tool can be reached. An answer names the version and the platform it is
talking to. No answer names what to install, and naming it is the whole of what an agent does
about that. A tool already installed and still unreachable is a different situation from a
missing one, and `npx @vincentt-xr/cli` is the form that needs no install and no path at all.

The tool also says whether the person is signed in to an account. An account is what makes an AR
app reachable from a phone, and making one is quick and open to anyone. What the tool says is
what the person hears, and making an account now is the recommendation that goes with it.

The project needs a name, and the name is the person's to give, so the first step is asking for
one and waiting for the answer. Where the project folder goes is not a second question. A folder
the person named is where it goes, and the folder a conversation is already pointed at is such a
name. A conversation pointing nowhere has named none, and a folder of the person's own, called
after the project, is what a project with no named home gets. The folder the tool happens to be
running in is not that home, and is never the answer by default. Where it went is something the
person is told once it exists, in the reply that says it does.

An account is not what the project waits on. A person who wants one says so and the tool's own
door opens; a person who wants none, or says nothing, gets a project all the way built.

Before a project exists there is no agent contract to read yet, and another project's contract
is not a substitute for the missing one — it describes that project, not this one. Vincentt ships
no tool an agent can call and no server it can connect to, so a search of the available tools is
a search with no answer in it, and the shell is where the work happens. That tool is what writes
the contract, and reading it in the new project is the step after that. The project setup in that
contract covers everything from there.

### Coming back to something

When the person names a project ("the museum one", "that coffee filter") or says they want to
carry on with something already started, the folder they are working in either already names a
project or does not. The project's agent contract describes how to find out which, and what to do
in each case. When the folder names a different project from the one the person named, the person
is the one who resolves that, not an assumption about which they meant.

### Showing it on a phone

When the person asks to see it, try it, test it on a device, show a client, or get it on their
phone, a preview is what they are asking for. A preview is what makes the work reachable at an
address a phone can open, and the project's agent contract names the command. A preview produces
two addresses, and only one of them belongs in the reply: the project's page in the console,
which carries the phone link, the code that scans to it, and the view of the device. The other is
already on that page, so a reply carrying both hands the person a choice at the moment they want
an address rather than a decision. That one address belongs in the reply as soon as it exists,
because the person is waiting to open it, and it is written there plainly rather than as
something to copy, so that opening it is one gesture. Where it opens is the machine the person
is reading on, not the phone: the page is what carries the phone across, by a code the phone
scans. A reply that sends that address to a phone describes the wrong screen, and the person
holding the phone is the one who finds out.

### Finishing

When the person says they are done, finished, or asks to stop or close the preview, the preview
stops. That request is the only thing that ends one, in those words or plainly equivalent ones. A quiet
conversation is not a request. A passing test is not a request. A successful publish is not a
request. A demo that appeared to go well is not a request. Nothing other than the person saying
so ends a preview, because someone may still be holding a phone that goes dark when it does.

The same rule holds in reverse, for a preview that ends without being asked to stop here. A
preview the person ended somewhere else is a decision they already made, and the command that
was holding it says on its way out that it has ended and what ended it. That is a thing to
report, not a thing to undo: starting a replacement overrides the decision, and the address
everyone was given stops being the address. Nothing about an ended preview asks for a new one,
and the person is the one who asks.

### Bringing things up to date

When the person asks to bring their Vincentt packages up to date, to get on the current release,
or to catch up with the platform, what they are asking for is an upgrade of the platform's own
packages and nothing else. Nothing about the app the person built is read in order to decide what
to do, and nothing they wrote is a subject of it.

The command `vincentt outdated` is what reports the situation, and asking it is the first step,
because every fact this needs comes from that answer and none of it is carried here. That answer
names each platform package, the version installed beside it, the exact string to place in
package.json, and the migration note its author wrote for that move. A package the answer says
nothing about is a package the platform has published nothing about, and that is not the same as
a package being current.

The packages are done one at a time, in the order the answer gives them, and each is the same
three acts: the string from the answer goes into package.json, an install follows, and the call
sites the migration note named are the ones that change. The note is its author's own words about
what moved, so it is followed as written rather than summarised. A note saying no action is
required means the string and the install are the whole of that package.

Whether any of it worked is not something this can establish. No result is read back from any
command, so a report says what was attempted and never that it succeeded, and running the build
and the tests is the person's own next step.

The template is the second half, and it is attempted only after the first half has reported a
completed attempt for every package the answer named. While any of them is outstanding, the
template half does not begin, and the report says the template was left alone and which package
stopped it. A project holding replaced plumbing over packages that never moved compiles against
neither version, which is worse than either half alone, so that order is the only protection
there is and nothing stands in for it.

The template's files are the plumbing a project was created from — the app shell, the helpers,
the build configuration — and the platform names which of those it replaces, separately for each
version, in the version it names them for. The scene file, and every file the person added, are
in neither list. Those are never read, never compared and never written, so nothing of the
person's own work is in the context of this at all.

The version a project was created from is recorded in the project's own binding, and that record
travels with the repository, so anyone able to land a commit is able to set it. A recorded value
that is not three numbers separated by dots is not a version, and no baseline is what it means,
rather than an error and rather than an attempt anyway. A recorded version naming nothing the
platform published, or naming something that carries no list of replaceable files, is also no
baseline. With no baseline there is nothing to compare against, so a file already matching the
current version is confirmed, and every file differing from it is named and left where it is.

Every statement a report makes about a file being unchanged rests on the recorded version it was
compared against, so that version is named in the same breath, on the same screen, and never
implied. A person whose project did not come from that version is reading a premise that is wrong
in plain sight, which is the only honest way to report a comparison that cannot be verified.

Replacing a file is the destructive half, and a report opens with it rather than closing with it.
Files that were untracked or ignored had no previous copy anywhere, and their previous contents
are gone, and those are the ones named first. For files that were tracked and committed, the
previous contents are in the person's version control history. Nothing else kept a copy, no copy
is made anywhere, and the person's own version control is the whole of what recovery exists.

The record of which version a project was created from is written last, after the files and after
the report. A record written any earlier would describe a project the next upgrade then reads as
untouched by the person, and the only trace of what was replaced would be gone.

<!-- END recognition -->

## Start here

**This project is already a complete, runnable AR starter.** It previews and builds
as-is. If you just scaffolded it, your job is not to invent an app — it is to get
the developer to the point where they can describe what they want.

- If the developer has **not** told you what to build yet: confirm the project is
  ready (`pnpm dev` serves; `pnpm build` passes), **start the preview** (`pnpm
  preview`, in the background), hand over the project's console page, then ask what
  they want to make. **Do not build a scene or pick an idea for them.** The starter
  is worth seeing on a phone before there is anything custom in it — it is how the
  developer learns the loop exists, and it is running by the time they have
  described the app.
- Read the grounding files **when you start building a scene**, not before — the
  template's `GROUNDING.md` and the SDK's own at
  `node_modules/@vincentt-xr/sdk/GROUNDING.md`. There is no need to read the whole
  API up front just to confirm the starter works.
- Once they describe the app, then design and build it against both.

## The dev loop

**Every command below runs in the project folder — the one holding this file.** Not the folder
you started the conversation in, and not its parent. A background command especially: it does not
inherit a directory you changed earlier in the conversation, so pass the project folder to it
explicitly rather than assuming the shell is still there.

Getting this wrong does not look like a path error. `pnpm preview` in a parent folder exits
non-zero and reads as the preview having failed, and the same mistake in a folder that happens to
hold another Vincentt project starts a preview for **that** project — reported as a working
preview, at an address for someone else's app. Check where you are before the first command and
after anything that could have moved you.

- **`pnpm install`** — install dependencies.
- **`pnpm dev`** — esbuild dev server on `http://localhost:5173` (answers on both
  `127.0.0.1` and `[::1]`; `PORT` changes the port). Loopback only: to open the dev
  page from a phone on the same network, run `HOST=0.0.0.0 pnpm dev` and use this
  machine's LAN address (`pnpm preview` needs none of that). Dev output goes to
  `.dev/`, gitignored and separate from `dist/`, so a `pnpm build` while dev is
  running does not change what the dev page serves.
- **Develop against a clip instead of the camera** — when there is no webcam, or
  the browser you are previewing in blocks it (an embedded preview browser does):

  ```
  VITE_INPUT_SOURCE=video VITE_INPUT_URL=/clip.mp4 pnpm dev
  ```

  `/clip.mp4` is any file under `public/` (served at the root) or a full URL.
  `VITE_INPUT_SOURCE=photo` with an image URL gives a single still frame. To stop
  typing it, put the same two lines in `.env.development`: `pnpm dev` reads it and
  `pnpm build` never does, so a dev clip cannot reach a published bundle. `.env` is
  read by both and is the place for a source that should ship. A build with a
  configured source prints what it is baking in. The app starts on that source and
  the in-app media switcher still lets you swap. A hidden tab refusing to play the
  clip is retried until it plays.
- **`pnpm preview`** — on-device preview. Builds and serves the app behind a secure
  tunnel to Vincentt's own edge, so you get one `https` URL to open on a phone. AR
  needs a secure context for camera access, so this is how you test tracking and
  gestures on a real device. Nothing extra to install; the tunnel client ships with
  the CLI. Requires being signed in (`vincentt login`) — the edge address is minted
  per session by the platform.
- **`pnpm typecheck`** — `tsc --noEmit`.
- **`pnpm lint`** — lint the platform source with the template's ESLint rules.
- **`pnpm test`** — run the platform and QA test suites.
- **`pnpm build`** — production bundle to `dist/`. Only a production build ever lands
  there; the dev server writes to `.dev/`.

## Page title and share preview

The browser-tab title, the description and the Open Graph / Twitter share card
come from **`app.config.json`** at the project root — the creator's file. Edit it
there, never in `index.html`: that file is replaced by a template upgrade, and
`pnpm build` and `pnpm dev` (at startup — restart dev after editing it) write the
config's values into its tags.

```json
{
  "title": "Magnetic Hands",
  "description": "Push a field of lines around with your hands",
  "url": "https://magnetic-hands.vincentt.app",
  "image": "/images/share.jpg",
  "imageAlt": "A hand bending a field of lines"
}
```

Every key is optional. `image` is a root-relative path under `public/` (`/images/…`)
or a full `https://` URL; with `url` set it is made absolute for crawlers. Add
`imageWidth` / `imageHeight` / `imageType` when the image is not 1200×630 JPEG.
A share image should be 1200×630. `vincentt publish` checks these tags on the
built page; note that once `url` is set the image is an absolute URL, which the
publish check cannot verify against `dist/`, so check the path yourself.
## Embedding the experience in another page

A published experience can be framed. Two things change inside a frame, and both
have a switch:

- **The camera.** Framed, the app starts on a sample clip instead of the webcam, so
  an embed does not open on a permission prompt nobody asked for. To run on the
  live camera the host must allow it on the frame **and** someone must ask for it:
  the host, per frame, with `?source=webcam` on the frame's address; or the
  creator, for every embed, by building with `VITE_FRAMED_SOURCE=webcam`. Use the
  creator switch when the experience *is* the camera — hand or face tracking has
  nothing to show without it. "Every embed" includes the console's own preview
  frame, which will then ask for the camera too. The template git-ignores `.env`,
  so a switch kept there is lost on a fresh clone or a CI build: un-ignore `.env`
  for this project or set the variable in the build environment. `pnpm build`
  prints the switch when it bakes it in.

  ```html
  <iframe src="https://my-app.vincentt.app/" allow="camera"
          allowfullscreen style="border:0;width:100%;aspect-ratio:9/16"></iframe>
  ```

- **Knowing when it is usable.** The app publishes `loading` → `ready` (or `error`)
  on three surfaces: `<html data-experience="…">`, a `window` event
  `experience:status`, and a message to the parent page. A host awaits it like
  this:

  ```js
  window.addEventListener("message", (e) => {
    if (e.source !== frame.contentWindow) return;          // only our frame
    if (e.data?.type !== "experience:status") return;
    // e.data.status: "loading" | "ready" | "error"; e.data.reason on error
    if (e.data.status === "ready") placeholder.hidden = true;
  });
  ```

  The message is posted with target origin `*` because it carries nothing but the
  status word and, on error, the SDK's reason code; a host should still check
  `e.source`. Inside the experience, script can listen to the window event instead.

## Platform commands (`vincentt`)

The local-first dev loop is driven by the **`vincentt` CLI** over your shell — no MCP
registration is needed. Invoke it as **`vincentt <verb>`**, bare. If the command is not
found, install it once and carry on:

```
npm install -g @vincentt-xr/cli@latest
```

Do not invoke it through `npx`. There is no npm package named `vincentt` — the binary
ships inside `@vincentt-xr/cli` — so `npx vincentt` reaches the registry and fails, and
`npx --yes` would install whatever unrelated package later claims that name.

The CLI is installed once, globally, and nothing in a project updates it. It notices when
it is behind and says so after a command:

```
  ! A newer vincentt is available (0.11.0 → 0.12.0).
```

That line is a fact, not a request — the CLI does not ask to be updated, because
installing over a global binary is the developer's call and may need a password. Mention
it to them and let them decide; the same `npm install -g @vincentt-xr/cli@latest` above
is what does it. Do not update mid-task: the binary would change underneath the work in
flight. Finish what is running, then raise it.

If the developer isn't signed in yet, the first verb opens a browser for them to approve
(the one human step); the token then lives in `~/.vincentt/config.json` and later
verbs run without prompting.

- **`vincentt create [name]`** — register this project with the platform and reserve its
  address, binding the folder by writing `.vincentt/project.json`. In an **empty** folder it
  scaffolds the starter first, then registers. In a folder that is already a Vincentt app it
  only registers. In any other non-empty folder it refuses and says what to run. Requires being
  signed in for the registering half; the scaffolding half never does. Usually already done.
- **`vincentt projects`** — list the projects on the account: their ids, their names, their
  addresses, and **where each one lives on this machine**, when this machine has worked on it
  before. Reach for it when you need to know which project the developer means, or where it is.
  A project the machine has no folder for says so plainly rather than leaving a gap. Add `--json`
  for machine-readable output. Requires being signed in.
- **`vincentt link <project-id>`** — bind this folder to a project that already exists, by the id
  the listing prints. Use it in a folder that is not bound to anything yet — a fresh clone, a
  folder that lost its binding, or a project created in the console.
- **`vincentt init <dir>`** — scaffold the starter with **no account at all**. `create`
  covers the common case; this is the route when there is no account to sign in with.
- **`vincentt publish`** — build first (`pnpm build`), then this uploads the built
  `dist/` and returns the live `<slug>.vincentt.app` URL. Nothing installs or builds
  server-side; publishing moves the bytes you built locally.
- **`vincentt logs` / `network` / `trace`** — read what the phone reported to the
  preview relay: console (add `--errors` to filter), fetch/XHR, performance samples.
  Add `--json` for machine-readable output. Use these to debug on-device misbehavior
  instead of guessing.
- **`vincentt feedback --wait`** — block until the developer draws an annotation on the
  phone preview (a screenshot + strokes/pins + a message), print every annotation waiting as
  one JSON object per line, and exit. See **Waiting for the phone** below for how to park on
  it.

<!-- BEGIN create-endings (generated from @vincentt-xr/cli — do not edit here) -->

### How `vincentt create` ends

`create` has two halves. The scaffold half writes the project source; the registration half
reserves the public address. They fail independently, and the exit code says which half you are
holding.

- **`0` — done.** The source is on disk and the address is reserved. `.vincentt/project.json`
  binds the folder to the project.
- **`3` — delivered, not registered.** This invocation wrote the project source, but no address
  was reserved: there is no account on this machine and no browser to get one, which is the
  ordinary situation in an agent's shell. **The project is complete and the local dev loop
  already runs** — install, `run dev`, and preview all work with no account at all. Only the
  public address is deferred. Report the project as built. Do not re-run `create` to "fix" this,
  and do not treat it as a failed build; the remedy is `vincentt login` on a machine with a
  browser, and it is optional.
- **`1` — nothing lasting was produced.** The command refused and no address was reserved. This
  covers sign-in started then abandoned, the address already being taken, no workspace resolving,
  and a missing name. Each of these is fixable with something you can type right now: a different
  `--name`, a chosen workspace, the missing flag, or completing the sign-in.
- **`4` — not signed in.** The folder already held an app, so this invocation wrote no source,
  and there is no account on this machine and no terminal to sign in from. No address was
  reserved. This is the same code every other verb returns when it needs an account. The remedy
  is `vincentt login` at a terminal with a browser, then the same `create` again; the CLI prints
  both.

The distinction that matters: **`3` means you have a working project and `1` means you do not.**
A run that already scaffolded the source never reports `1` for want of an account.

`vincentt init <dir> --from <owner/repo@tag>` shares the same registration half and ends the same
way, for the same reasons — the code describes whether this run wrote the source, never which
verb was called.

<!-- END create-endings -->

### Picking up a project

**Start by finding out which project this folder is.** `.vincentt/project.json` in the project
folder names it. If it is there, the folder is bound and you already have your answer — say which
project it is, and if the developer named a different one, ask them which they meant rather than
switching for them.

**If there is no such file, the folder is not bound to anything.** Do not guess from the folder's
name and do not assume the only project on the account is the one they meant. Run `vincentt
projects` and read what comes back.

**The listing reports where a project is. It does not go there.** Nothing about a folder appearing
in the output makes it the working directory. Do not `cd` into it, do not open it, do not run
anything in it, and do not tell the developer you have. Say the path and let them decide. This
holds in all three cases below.

- **One folder listed for the project they named** — that is where it lives. Say the path and ask
  whether to carry on there.
- **More than one folder listed** — the project is in several places on this machine, and which
  one they mean is theirs to say. **Show every one as a numbered list and ask which**, so the
  answer is a number rather than a path they have to copy back. The numbers are yours for asking
  with; they are not a ranking, and the listing's order is not one either. If there are more than a
  handful, say how many there are and still show them all — picking the newest, or the shortest
  path, or the first three, is a guess that is wrong exactly when it matters.
- **`no folder known on this machine`** — ask the developer where it is. If the folder you are
  already in looks like that project (it has the app's source and no binding — a fresh clone, or a
  folder that lost one), offer to bind it instead, with `vincentt link <project-id>` using the id
  from the listing. That message is a real answer and not a failure: the project exists on the
  account, and this machine has no record of a folder for it — it has not been worked on here, or
  it was worked on somewhere the machine no longer knows about.

**What comes back is where the project was last worked, not proof of anything.** A folder is
reported only if it still holds that project's binding when the listing runs, so a path that no
longer holds it is never handed to you. Everything after that is authorized the same way it always
is — the folder is a shortcut to the right directory, not permission to be in it. And it is where
the project *was* worked, not where it *must* be worked: if the developer names a different place,
that place is right and the listing is stale.

`pnpm preview` (above) is the one loop step that is not a `vincentt` verb — run it in the
background; it holds the secure tunnel open until stopped. It prints the phone URL and, for a
registered project, the project's page in the console.

**Hand over the console page, and nothing else.** It is the one address the developer needs
from you: it carries the phone link and its QR, it is where they watch the device, and it is
what they send to anyone else. The phone URL is already on that page, so repeating it in the
reply gives the developer two addresses to choose between at the moment they want one.

**Say it opens here, not on the phone.** It is a desktop page: it carries the QR the phone
scans, the phone link, and the live device view. "Open this on your phone" points the developer
at the wrong screen — the phone is reached *from* this page, by scanning it.

**Put it in the reply as a bare URL on its own line — no backticks, no code fence, no
`Console:` label.** A URL in code formatting renders as something to copy; a bare one renders
as something to click, and the developer is reaching for their phone, not their clipboard.

**The console page is the only link in the reply. Everything else is named, not linked.** A
project, a folder, or a file is written as plain text — `christmas-booth-10`, not
`[christmas-booth-10](christmas-booth-10)`. A markdown link whose target is a bare folder name
points at nothing: it renders as a link, invites a click, and goes nowhere. If a path is worth
giving, give the path itself.

### When the preview ends while you are working

`pnpm preview` holds the tunnel open until something ends it, and it prints why on the way out.
**A preview that ends is not a command that failed.** It is usually the developer stopping it —
from the console, from another terminal, or by closing the one it was running in.

**Read the last block it printed and say what it says. Do not start another one.**

- `✓ Preview stopped. The link no longer works.` — someone stopped it on this account. Say so
  and stop there. **This is the common case and it is not an error**: the developer chose it,
  often from the console page you just handed them.
- `✓ Preview stopped. 12-hour maximum reached.` — it ran its full life. Say so.
- `✗ Preview ended. …` — something went wrong; relay the line as printed.

**Starting a new preview because the old one ended is the wrong move**, even when the developer
has not said anything since. It overrides a deliberate stop, it mints a new link so every phone
already holding one needs a re-scan, and it makes the reason you were about to report untrue by
the time you report it. Wait to be asked.

**A `✓` is not a failure to retry.** Re-running `pnpm preview` on a folder whose preview is
already running attaches instead of minting, so a retry loop does not even produce a second
preview — it supersedes the session it just attached to and reports `superseded`, which reads as
something breaking when nothing was.

## Waiting for the phone

`vincentt feedback --wait` blocks until the developer sends something from the phone
preview, then prints it and exits. It is the one step in this loop where you wait on a person.

**Blocking costs nothing while it waits.** No model turn is spent, no timer runs, nothing is
polled. The process is parked on a single open request. This is worth stating because the
opposite assumption — that waiting is expensive and checking repeatedly is cheap — is exactly
backwards here, and acting on it is expensive.

### How it exits

| Exit | What happened | What to do |
|---|---|---|
| **0** | One or more annotations were printed, one JSON object per line on stdout. | Read them and take up the work. |
| **64** | The window passed with nothing waiting. Nothing was printed. The preview is still live. | Run the same command again. Nothing was missed and nothing is re-read. |
| **65** | The preview ended. Nothing more can arrive on it. | A preview has to be running before there is anything to wait on. |
| **1** | A usage error or a fault. The reason is on stderr. | Read stderr. |

`--timeout <seconds>` sets the window (default 300).

### Which of these two applies to you

Decide by what **you** can do, not by what you are:

- **If your host can wake you when a blocked command produces output** — run the command and
  let it block. You will be woken with the annotations on stdout.

- **If your host has no way to wake you on output** — start the command somewhere you can
  return to, and return to it. Each return either finds it still blocked (nothing to do, come
  back again) or finds it finished, with an exit code from the table above.

Either way, on **64** the correct next step is the same command again. That is the whole loop:
park, handle whatever exit you get, park again. On **65**, stop — the channel is closed until a
preview is running again.

### Two things that are true of both

- **Every annotation is handed over exactly once.** A position is kept on disk and advances
  only after a line is printed. Repeating the command after 64 re-reads nothing and skips
  nothing, so you never need to track what you have already seen, and there is no flag for
  asking about older ones.
- **Several annotations can arrive at once.** If the developer walks around sending three, one
  run hands over all three, as three lines. Read every line on stdout, not the first one.

## What you edit

- **`src/Scene.tsx`** — the scene. This is your primary surface. Add SDK components,
  R3F primitives, animation, and state here.
- **Any new file you create under `src/`** — utility hooks, sub-components, asset
  imports. Organize freely.
- **`package.json` dependencies** — add a dependency, then `pnpm install` it yourself.

## What to leave alone

These are the app's shell and helper library. Import from them; don't usually modify
them (this is a convention, not an enforced guard — change one only if a task genuinely
requires it, and know why).

- **`src/App.tsx`** — the runtime shell: XR session start, media-source binding,
  camera, lighting, scene mount.
- **`src/main.tsx`** — the mount.
- **`src/capture.ts`** — capture + share primitives (`usePhotoCapture`,
  `useVideoCapture`, `saveToDevice`, `shareMedia`).
- **`src/overlay.tsx`** — HTML overlay primitives (`<Overlay>`, `<QRCode>`) for
  pixel-sharp DOM UI over the canvas.
- **`src/sprite.tsx`** — sprite-sheet animation (`useSpriteSheet`, `<SpriteSheet>`,
  `useInstancedSpriteUV`).
- **`src/gesture.ts`** — gesture helpers (`useGestureHold`).
- **`src/PreviewAnchors.tsx`** and the build config (`esbuild.config.mjs`,
  `tsconfig*.json`).

The helper APIs (`capture`, `overlay`, `sprite`, `gesture`) are documented in
`GROUNDING.md` — import and use them, don't re-implement them.

## Storing visitor data

A published app lives at `<slug>.vincentt.app`, next to other creators' apps. Browsers let any
of those apps set a cookie for the whole `vincentt.app` domain, which every other app then
receives. So:

- **Keep visitor state in `localStorage` or `sessionStorage`.** Those are per app; no other app
  can read or change them.
- **If the app must set a cookie, name it with the `__Host-` prefix** and set it with `Secure;
  Path=/` and no `Domain`, for example
  `document.cookie = "__Host-session=…; Secure; Path=/; SameSite=Lax"`. Another app cannot set
  or overwrite a `__Host-` cookie, so read only `__Host-` names. Never set
  `Domain=vincentt.app`.
- **An app with real visitor sign-in belongs on its own custom domain**, which isolates it
  completely. Tell the person so when they ask for accounts or logins.

## The SDK API lives in the SDK's own grounding

There are **two** grounding files, and nothing merges them:

- **`GROUNDING.md`** (repo root) documents only this template's local helpers —
  capture, overlay, sprite, gesture — plus project notes and patterns.
- **`node_modules/@vincentt-xr/sdk/GROUNDING.md`** is the authoritative reference
  for every SDK component, hook, and prop (`<FaceTracker>`, `<HandTracker>`,
  `<TrackingAnchor>`, screen-space layout, `<ScreenText>`, `<Panel>`). It is much
  the larger of the two.

Read both when you begin a scene (not before), and use the components and props
they document; don't invent props. Longer-form SDK guides and examples ship beside
it in `node_modules/@vincentt-xr/sdk/docs/`.

Imports — the SDK is split into task-domain doors, and a symbol imported from the
wrong one fails with "no exported member":

- Core components and hooks come from **`@vincentt-xr/sdk`** — including the runtime
  renderers (`Transform3D`, `MeshRenderer`), `SpriteAnimation`, and the capture
  hooks (`useFrameCapture`, `useMediaRecorder`).
- **Trackers** (`FaceTracker`, `HandTracker`, `BodyTracker`, `GestureTracker`,
  `GestureTrigger`, `TrackingAnchor`, `FaceMesh`, `Segmentation`) come from
  **`@vincentt-xr/sdk/tracking`** — not core.
  The starting scene runs **face tracking only; hands are off by default**. To add
  hands, add `import { HandBoundingBox } from "./HandBoundingBox";` and
  `<HandBoundingBox />` to `src/Scene.tsx`. Add a tracker only when the scene needs it:
  each one adds its own model download (the hand model is ~7.8 MB) and its own wasm
  compile on the phone.
- **Face deep config** (FaceMesh materials, retouch, head-binding) comes from
  **`@vincentt-xr/sdk/face-effects`**.
- **Scene-object authoring state** (types, factories, store operations, render
  groups) comes from **`@vincentt-xr/sdk/scene-object`**.
- The low-level XR context hooks (`useXRContext`, `useXRReady`, `useXRError`) come from
  **`@vincentt-xr/sdk/low-level`**.

The SDK grounding shows the exact import for each API. You *can* read the `.d.ts`
files, but prefer the grounding — the published types can lag or omit props, and the
bundle is minified. If something you need isn't in either grounding and isn't clearly
in the types, ask rather than guessing a prop into existence.

## Assets

Reference media by path or URL — there is no upload step.

- **Local files under `public/`** — reference by absolute path (e.g.
  `<img src="/images/logo.svg">`, `useTexture("/textures/wall.jpg")`). The dev server
  serves `public/` at the root and the build copies it into `dist/`.
- **Hosted assets** — reference any absolute URL directly (`useTexture(url)`,
  `<img src={url}>`, `new Audio(url)`). For textures, prefer a downscaled WebP when one
  is available, to save bandwidth.
- **The curated library** — the platform serves a corpus of ready-made visuals you can
  search from the shell. Reach for it when the developer asks for a visual you would
  otherwise have to fake with a box geometry or a solid-colour plane.

### Searching the curated library

```
vincentt assets search "<what you want>"    [--kind prop|frame] [--limit N]
vincentt assets show <id> [<id>…]           everything known about an asset
vincentt assets add <id> [<id>…]            print the URLs to reference from your source
```

Search takes plain language — `vincentt assets search "cute food"` — and prints matching
records with their ids and URLs. `add` prints URLs and, by default, **writes nothing to
disk**; pass `--download` if you want local copies. If the developer hands you asset ids
directly, `vincentt assets show <id>` resolves them to URLs and placement facts.

**`kind` is the placement contract, and it is the field to read first.**

- `prop` — a free-standing object. Place it in the scene, parent it to a tracker, scale
  it to taste.
- `frame` — a full-screen overlay. Stretch it edge-to-edge and **never** parent it to a
  tracker.
- **No `kind` field at all** means the asset was not classifiable. Do not guess a
  placement — prefer one that carries a kind.

Check `has_alpha` before putting anything over the camera feed: an opaque asset used as
a frame will white out the video.

The library is a convenience, never a dependency. It holds **props and frames** — it has
no wearables or face-filter assets, so a query for those correctly returns nothing. If a
search comes back empty or the platform is unreachable, say so and fall back to local
files under `public/`; the project still builds, previews, and publishes either way.

### Bringing in files from outside the library

The developer may want a specific 3D model, image, or piece of UI that the library does not hold:
a model from Sketchfab, a screen designed in Figma or Canva, a logo they own. If a connector for
that source is set up, use it; if not, ask the developer to download the file and put it where
this section says. The rules are the same either way. Recommended connectors and how to set them
up: https://vincentt.studio/connectors

**Where the file goes.** Save it under `public/assets/<source>/`, named for what it is:
`public/assets/sketchfab/fox.glb`, `public/assets/figma/start-button.webp`,
`public/assets/brand/logo.png`. Reference it from the root: `useGLTF("/assets/sketchfab/fox.glb")`,
`<img src="/assets/brand/logo.png">`. Never use a name that starts with a dot; publish refuses
hidden files.

**Formats.**

- **Models: GLB, one file.** A `.gltf` that comes with a separate `.bin` and texture files breaks
  when imported, because the build copies only the `.gltf`. Convert it to GLB, or keep the whole
  folder under `public/` and load it by path.
- **USDZ** is only for `ProductViewer`'s `iosSrc`. It must live under `public/`; the build cannot
  import it.
- **Images and UI exports: WebP**, or PNG where you need transparency over the camera. Export
  from design tools at the size the screen needs, not at 3x.
- **No transparent video as an overlay.** Use a WebP or PNG sprite sheet instead.

**What a phone can carry.** Every file downloads to the viewer's phone, often over mobile data,
on top of the tracking models (the face model alone is 3.8 MB).

- **One model: aim for 5 MB or less. Over 10 MB is too heavy**, and `vincentt publish` warns
  about it.
- **Images and textures: at most 2048 px on the long side**, 1024 px for small props.
  `vincentt publish` warns about any image over 2048 px.
- **Compress models on this machine before referencing them**, with meshopt geometry and WebP
  textures:

  ```
  pnpm dlx @gltf-transform/cli optimize in.glb public/assets/sketchfab/fox.glb --compress meshopt --texture-compress webp --texture-size 2048
  ```

  Do not use Draco or KTX2. A Draco model makes every viewer's phone download a decoder from
  Google's servers, and the loader here does not decode KTX2 textures. Load outside models with
  `useGLTF` (or the SDK's `MeshRenderer` with `assetUrl`). `defineGltfAsset` cannot read a
  compressed model.
- Load only what the first scene needs; defer the rest (see `GROUNDING.md`, "Assets and
  frame-loop performance").

**Record where it came from.** Before using an outside file, find its licence. Add one row per
file to `CREDITS.md` at the repo root, creating the file with this header if it does not exist:

```markdown
# Credits

| File | Title | Author | Source | Licence | Fetched | Credit text |
|---|---|---|---|---|---|---|
| public/assets/sketchfab/fox.glb | Low Poly Fox | Jane Doe | https://sketchfab.com/3d-models/... | CC BY 4.0 | 2026-10-14 | "Low Poly Fox" by Jane Doe, CC BY 4.0 |
```

Write the licence exactly as the source states it. Files the developer made or owns go in too,
with `Own work` as the licence, so every outside-looking file has an answer.

**What the licence asks of the experience.**

- **The licence requires attribution** (every CC BY variant, and most "free with credit" terms):
  show the credit text inside the experience, somewhere a viewer can reach, such as a small
  "Credits" line on the start or end screen, or a credits panel built with `<Overlay>`.
- **Non-commercial** (CC BY-NC and its variants): stop and ask the developer whether this project
  is commercial before using it. A brand campaign is commercial.
- **No derivatives** (CC BY-ND and its variants): tell the developer before you modify the file.
  Compressing it may count as a modification.
- **No licence you can find:** do not use the file. Say so and offer an alternative.

**Keys.** A connector's API key belongs in the connector's own settings, outside this project.
Never put it in the repo, in `.env`, or in any variable the build bakes into the app; anything
the build reads can end up in the published files.

## Communicating

You are working with a developer, not a non-technical user. Be concise and specific —
component names, props, and file paths are welcome, not something to hide. When you
finish a change, say what you changed and how to check it: for anything camera- or
AR-related, that usually means `pnpm preview` on a phone.
