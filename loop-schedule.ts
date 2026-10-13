import { Cron } from "croner";
import type { ExtensionAPI, ExtensionCommandContext } from "@oh-my-pi/pi-coding-agent";

type Timer = NodeJS.Timeout;

type IntervalSchedule = {
	kind: "interval";
	intervalMs: number;
	nextRunAt: number;
	prompt: string;
	ranOnce: boolean;
};

type CronSchedule = {
	kind: "cron";
	cron: Cron;
	nextRunAt: number;
	prompt: string;
	ranOnce: boolean;
};

type Schedule = IntervalSchedule | CronSchedule;

const USAGE =
	"Usage: /loop-schedule <number>s|m|h|d <prompt> | /loop-schedule --cron \"<minute> <hour> <day-of-month> <month> <day-of-week>\" --timezone <IANA timezone> [--run-on-start] <prompt> | /loop-schedule off";
const MAX_TIMER_MS = 2_147_483_647;
const UNITS_MS: Record<string, number> = {
	s: 1_000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000,
};

export function parseScheduleArgs(args: string): Omit<IntervalSchedule, "kind" | "nextRunAt" | "ranOnce"> | string {
	const match = /^(\d+)\s*([smhd])\s+(.+)$/i.exec(args.trim());
	if (!match) return USAGE;

	const intervalMs = Number(match[1]) * UNITS_MS[match[2].toLowerCase()];
	if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0 || intervalMs > MAX_TIMER_MS) return USAGE;

	return { intervalMs, prompt: match[3].trim() };
}

function nextCronRun(cron: Cron, from: Date): number | undefined {
	return cron.nextRun(from)?.getTime();
}
function cronMatchesNow(cron: Cron, now: Date): boolean {
	const minuteStart = new Date(now);
	minuteStart.setSeconds(0, 0);
	return nextCronRun(cron, new Date(minuteStart.getTime() - 1)) === minuteStart.getTime();
}


function parseCronArgs(args: string): Omit<CronSchedule, "kind" | "nextRunAt" | "ranOnce"> & { runOnStart: boolean } | string {
	const match =
		/^--cron\s+(?:"([^"]*)"|'([^']*)'|(\S+))\s+--timezone\s+(\S+)(\s+--run-on-start)?\s+(.+)$/s.exec(args.trim());
	if (!match) return USAGE;

	const expression = match[1] ?? match[2] ?? match[3];
	const prompt = match[6].trim();
	if (expression.trim().split(/\s+/).length !== 5 || prompt.startsWith("--")) return USAGE;

	try {
		Intl.DateTimeFormat(undefined, { timeZone: match[4] });
		const cron = new Cron(expression, { paused: true, timezone: match[4] });
		if (nextCronRun(cron, new Date()) === undefined) return USAGE;
		return { cron, prompt, runOnStart: Boolean(match[5]) };
	} catch {
		return USAGE;
	}
}

export default function loopSchedule(pi: ExtensionAPI): void {
	let schedule: Schedule | undefined;
	let timer: Timer | undefined;

	function clearTimer(ctx: ExtensionCommandContext): void {
		if (!timer) return;
		ctx.clearTimer(timer);
		timer = undefined;
	}

	async function applyLoopMode(ctx: ExtensionCommandContext): Promise<boolean> {
		try {
			// `Settings` dropped its string-path `get(id)` accessor; extensions must
			// resolve a typed descriptor via the registry and read through that.
			const { lookup } = await import("@oh-my-pi/pi-coding-agent/config/registry");
			const mode = lookup("loop.mode")?.get(pi.pi.settings) ?? "prompt";
			if (mode === "prompt") return true;
			if (mode === "compact") {
				await ctx.compact();
				return true;
			}
			const { cancelled } = await ctx.newSession();
			return !cancelled;
		} catch (err) {
			ctx.ui.notify(
				`Loop schedule: failed to apply loop.mode: ${err instanceof Error ? err.message : String(err)}`,
				"error",
			);
			return false;
		}
	}

	function arm(ctx: ExtensionCommandContext): void {
		if (!schedule) return;
		clearTimer(ctx);
		timer = ctx.setTimeout(
			() => void tick(ctx),
			Math.min(MAX_TIMER_MS, Math.max(0, schedule.nextRunAt - Date.now())),
		);
	}

	async function tick(ctx: ExtensionCommandContext): Promise<void> {
		timer = undefined;
		if (!schedule) return;

		const current = schedule;
		if (current.nextRunAt > Date.now()) {
			arm(ctx);
			return;
		}

		if (ctx.isIdle() && !ctx.hasPendingMessages()) {
			const shouldSend = current.ranOnce ? await applyLoopMode(ctx) : true;
			if (schedule !== current) return;
			if (shouldSend) {
				pi.sendUserMessage(current.prompt);
				current.ranOnce = true;
			}
		}

		if (current.kind === "interval") {
			while (current.nextRunAt <= Date.now()) current.nextRunAt += current.intervalMs;
		} else {
			const nextRunAt = nextCronRun(current.cron, new Date());
			if (nextRunAt === undefined) {
				schedule = undefined;
				ctx.ui.notify("Loop schedule stopped: no future cron occurrence.", "error");
				return;
			}
			current.nextRunAt = nextRunAt;
		}

		arm(ctx);
	}

	pi.registerCommand("loop-schedule", {
		description:
			"Run a prompt now, then every interval: /loop-schedule 3h <prompt>; or schedule cron with --cron and --timezone",
		handler: async (args, ctx) => {
			if (args.trim() === "off") {
				schedule = undefined;
				clearTimer(ctx);
				ctx.ui.notify("Loop schedule stopped.", "info");
				return;
			}

			if (args.trimStart().startsWith("--")) {
				const parsed = parseCronArgs(args);
				if (typeof parsed === "string") {
					ctx.ui.notify(parsed, "error");
					return;
				}

				const { runOnStart, ...cronSchedule } = parsed;
				const now = new Date();
				const nextRunAt =
					runOnStart && cronMatchesNow(cronSchedule.cron, now)
						? now.getTime()
						: nextCronRun(cronSchedule.cron, now);
				if (nextRunAt === undefined) {
					ctx.ui.notify(USAGE, "error");
					return;
				}
				schedule = { kind: "cron", ...cronSchedule, nextRunAt, ranOnce: false };
				arm(ctx);
				ctx.ui.notify(
					`Loop schedule started; cron ${cronSchedule.cron.getPattern()} in ${args.trim().match(/--timezone\s+(\S+)/)?.[1]}.`,
					"info",
				);
				return;
			}

			const parsed = parseScheduleArgs(args);
			if (typeof parsed === "string") {
				ctx.ui.notify(parsed, "error");
				return;
			}

			schedule = {
				kind: "interval",
				...parsed,
				nextRunAt: Date.now(),
				ranOnce: false,
			};
			arm(ctx);
			ctx.ui.notify(`Loop schedule started; repeating every ${args.trim().split(/\s+/, 1)[0]}.`, "info");
		},
	});
}
