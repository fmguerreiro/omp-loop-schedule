# Oh My Pi loop schedule

Oh My Pi extension adding `/loop-schedule`, which sends a prompt immediately and repeats it on an interval, or sends it on a cron schedule when Oh My Pi is idle with no pending messages.

## Install

```sh
git clone https://github.com/fmguerreiro/omp-loop-schedule.git ~/omp-loop-schedule
cd ~/omp-loop-schedule
npm ci
```

Add repository's absolute path to `~/.omp/agent/config.yml`:

```yaml
extensions:
  - /absolute/path/to/omp-loop-schedule
```

Restart Oh My Pi. For one session instead, run `omp --extension "$PWD"`.

## Commands

Interval command (runs now, then repeats):

```text
/loop-schedule <number>s|m|h|d <prompt>
```

Examples:

```text
/loop-schedule 30m Check progress and continue useful work.
/loop-schedule 2h Review open tasks.
```

Cron command:

```text
/loop-schedule --cron "<minute> <hour> <day-of-month> <month> <day-of-week>" --timezone <IANA timezone> [--run-on-start] <prompt>
```

The cron expression must have exactly five fields. `--timezone` is required and must be an IANA time zone, such as `Europe/Lisbon` or `America/New_York`.

```text
/loop-schedule --cron "0 9 * * 1-5" --timezone Europe/Lisbon Check priorities for today.
```

`--run-on-start` runs the prompt immediately only when command time matches the cron schedule's current minute. Otherwise, the first run is the next cron occurrence.

While a schedule is active, a right-aligned `↻ last run …` indicator shows below the editor, updating roughly every 30s.

## Context between iterations

The first run of each schedule sends the prompt as-is. Every run after that
applies Oh My Pi's `loop.mode` setting first, same as the builtin `/loop`
command: `prompt` (default) sends as-is, `compact` compacts context first,
`reset` starts a new session first. `reset` means each iteration after the
first runs in a fresh session with no memory of prior runs.

## Session transfers

Active schedules are stored with the session and restored when Oh My Pi opens a transferred session. With `loop.mode: reset`, every iteration after the first creates a fresh session and sends the scheduled prompt there. `/loop-schedule off` records that no schedule is active.

Stop active schedule:

```text
/loop-schedule off
```
