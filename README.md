# rekap
See exactly where you left off in any git repo.

[![](https://img.shields.io/badge/npm-@abhivarde/rekap-000?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/package/@abhivarde/rekap)
[![](https://img.shields.io/badge/npmx-@abhivarde/rekap-000?style=flat&logo=node.js&logoColor=white)](https://npmx.dev/package/@abhivarde/rekap)

<p align="center">
  <img
    src="https://github.com/user-attachments/assets/8400d839-93f3-4b4e-986e-99b28630d5fb"
    alt="rekap preview"
    width="100%"
  />
</p>

You open a project after days away. No idea what branch you were on, what you changed, whether it's clean. Instead of running `git log`, `git status`, and `git branch` separately — `rekap` shows everything in one clean view.

## Quick Start

```bash
npx @abhivarde/rekap
```

No install required. Run it inside any git repo.

## Install Globally

```bash
npm install -g @abhivarde/rekap
```

## Usage

```bash
$ rekap                     current repo
$ rekap [path]              specific repo
$ rekap --all [dir]         scan all repos in a directory
$ rekap --open              open repo in browser
$ rekap --watch             live-refresh every 3s
$ rekap --json              machine-readable output
$ rekap --help              show help
```

## What You See

| Field            | Description                                         |
| ---------------- | --------------------------------------------------- |
| `branch`         | Current branch with ↑ahead / ↓behind upstream       |
| `remote`         | Remote origin (auth tokens stripped automatically)  |
| `last`           | Time since last commit, color-coded by age          |
| `version`        | Nearest git tag                                     |
| `recent commits` | Last 5 commits with conventional commit type colors |
| `uncommitted`    | Clean or list of changed files with status          |
| `stashes`        | Number of stashed changes                           |
| `todos`          | Files containing TODO / FIXME / HACK                |
| `languages`      | Codebase breakdown with proportional bars           |
| `grade`          | A–F health score                                    |

## Health Grade

| Grade | Meaning                             |
| ----- | ----------------------------------- |
| `A`   | Clean, up-to-date                   |
| `B`   | Good shape                          |
| `C`   | Some uncommitted work or mild drift |
| `D`   | Messy or significantly behind       |
| `F`   | Needs immediate attention           |

Grade is calculated from uncommitted files, commits behind upstream, and stash count.

## Multi-Repo Scan

```bash
# See all repos under ~/Projects at once
rekap --all ~/Projects
```

Useful for a morning check across all your active projects.

## JSON Output

```bash
rekap --json
```

Pipes cleanly into `jq` or any script:

```bash
rekap --json | jq '.grade'
rekap --json | jq '.languages[0].lang'
```

## Development

```bash
git clone https://github.com/AbhiVarde/rekap
cd rekap
npm install

# Test on current repo
node index.js

# Test on a specific path
node index.js /path/to/any/repo

# Test multi-repo scan
node index.js --all ~/Projects

# Test JSON output
node index.js --json
```

Only one dependency: [chalk](https://github.com/chalk/chalk) for terminal colors.

## Contributing

1. Fork and clone the repo
2. Make changes in `index.js`
3. Test with `node index.js` inside a git repo
4. Open a pull request

## License

MIT © [Abhi Varde](https://github.com/AbhiVarde)
