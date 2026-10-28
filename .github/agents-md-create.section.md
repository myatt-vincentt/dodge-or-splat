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
