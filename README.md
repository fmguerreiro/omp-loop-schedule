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

Stop active schedule:

```text
/loop-schedule off
```
