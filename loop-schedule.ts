import { Cron } from "croner";
import { lookup } from "@oh-my-pi/pi-coding-agent/config/registry";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

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
	timezone: string;
	nextRunAt: number;
	prompt: string;
	ranOnce: boolean;
};

type Schedule = IntervalSchedule | CronSchedule;

type PersistedSchedule =
	| {
			kind: "interval";
			intervalMs: number;
			nextRunAt: number;
			prompt: string;
			ranOnce: boolean;
	  }
	| {
			kind: "cron";
			expression: string;
			timezone: string;
			nextRunAt: number;
			prompt: string;
			ranOnce: boolean;
	  };

const USAGE =
	"Usage: /loop-schedule <number>s|m|h|d <prompt> | /loop-schedule --cron \"<minute> <hour> <day-of-month> <month> <day-of-week>\" --timezone <IANA timezone> [--run-on-start] <prompt> | /loop-schedule off";
const MAX_TIMER_MS = 2_147_483_647;
const UNITS_MS: Record<string, number> = {
	s: 1_000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000,
};

function isPersistedSchedule(value: unknown): value is PersistedSchedule {
	if (!value || typeof value !== "object" || !("kind" in value)) return false;
	if (value.kind === "interval") {
		return (
			"intervalMs" in value &&
			"nextRunAt" in value &&
			"prompt" in value &&
			"ranOnce" in value &&
			typeof value.intervalMs === "number" &&
			Number.isSafeInteger(value.intervalMs) &&
			value.intervalMs > 0 &&
			value.intervalMs <= MAX_TIMER_MS &&
			typeof value.nextRunAt === "number" &&
			Number.isSafeInteger(value.nextRunAt) &&
			typeof value.prompt === "string" &&
			value.prompt.trim().length > 0 &&
			typeof value.ranOnce === "boolean"
		);
	}
	return (
		value.kind === "cron" &&
		"expression" in value &&
		"timezone" in value &&
		"nextRunAt" in value &&
		"prompt" in value &&
		"ranOnce" in value &&
		typeof value.expression === "string" &&
		value.expression.trim().length > 0 &&
		typeof value.timezone === "string" &&
		value.timezone.trim().length > 0 &&
		typeof value.nextRunAt === "number" &&
		Number.isSafeInteger(value.nextRunAt) &&
		typeof value.prompt === "string" &&
		value.prompt.trim().length > 0 &&
		typeof value.ranOnce === "boolean"
	);
}

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
		return { cron, timezone: match[4], prompt, runOnStart: Boolean(match[5]) };
	} catch {
		return USAGE;
	}
}

export default function loopSchedule(pi: ExtensionAPI): void {
	let schedule: Schedule | undefined;
	let timer: Timer | undefined;

	function clearTimer(ctx: ExtensionContext): void {
		if (!timer) return;
		ctx.clearTimer(timer);
		timer = undefined;
	}

	function persistedSchedule(): PersistedSchedule | null {
		if (!schedule) return null;
		if (schedule.kind === "interval") return schedule;
		return {
			kind: "cron",
			expression: schedule.cron.getPattern(),
			timezone: schedule.timezone,
			nextRunAt: schedule.nextRunAt,
			prompt: schedule.prompt,
			ranOnce: schedule.ranOnce,
		};
	}

	function persistSchedule(): void {
		pi.appendEntry<PersistedSchedule | null>("loop-schedule", persistedSchedule());
	}

	function restoreSchedule(ctx: ExtensionContext): void {
		clearTimer(ctx);
		schedule = undefined;
		let saved: PersistedSchedule | null | undefined;
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "custom" || entry.customType !== "loop-schedule") continue;
			if (entry.data === null) {
				saved = null;
			} else if (isPersistedSchedule(entry.data)) {
				saved = entry.data;
			}
		}
		if (!saved) return;

		if (saved.kind === "interval") {
			schedule = saved;
		} else {
			try {
				schedule = {
					kind: "cron",
					cron: new Cron(saved.expression, { paused: true, timezone: saved.timezone }),
					timezone: saved.timezone,
					nextRunAt: saved.nextRunAt,
					prompt: saved.prompt,
					ranOnce: saved.ranOnce,
				};
			} catch {
				ctx.ui.notify("Loop schedule stopped: saved cron is invalid.", "error");
				return;
			}
		}
		arm(ctx);
	}

	async function applyLoopMode(ctx: ExtensionContext, prompt: string): Promise<"send" | "reset" | "stop"> {
		try {
			// `Settings` dropped its string-path `get(id)` accessor; extensions must
			// resolve a typed descriptor via the registry and read through that.
			const mode = lookup("loop.mode")?.get(pi.pi.settings) ?? "prompt";
			if (mode === "prompt") return "send";
			if (mode === "compact") {
				await ctx.compact();
				return "send";
			}
			if (
				ctx.deferSessionReset(prompt, async sessionManager => {
					sessionManager.appendCustomEntry("loop-schedule", persistedSchedule());
				})
			) {
				return "reset";
			}
			schedule = undefined;
			persistSchedule();
			ctx.ui.notify("Loop schedule stopped: loop.mode=reset is unavailable.", "error");
			return "stop";
		} catch (err) {
			ctx.ui.notify(
				`Loop schedule: failed to apply loop.mode: ${err instanceof Error ? err.message : String(err)}`,
				"error",
			);
			return "stop";
		}
	}

	function arm(ctx: ExtensionContext): void {
		if (!schedule) return;
		clearTimer(ctx);
		timer = ctx.setTimeout(
			() => void tick(ctx),
			Math.min(MAX_TIMER_MS, Math.max(0, schedule.nextRunAt - Date.now())),
		);
	}

	async function tick(ctx: ExtensionContext): Promise<void> {
		timer = undefined;
		if (!schedule) return;

		const current = schedule;
		if (current.nextRunAt > Date.now()) {
			arm(ctx);
			return;
		}

		if (ctx.isIdle() && !ctx.hasPendingMessages()) {
			const action = current.ranOnce ? await applyLoopMode(ctx, current.prompt) : "send";
			if (schedule !== current) return;
			if (action === "send") {
				pi.sendUserMessage(current.prompt);
			}
			if (action !== "stop") {
				current.ranOnce = true;
				persistSchedule();
			}
		}

		if (current.kind === "interval") {
			while (current.nextRunAt <= Date.now()) current.nextRunAt += current.intervalMs;
		} else {
			const nextRunAt = nextCronRun(current.cron, new Date());
			if (nextRunAt === undefined) {
				schedule = undefined;
				persistSchedule();
				ctx.ui.notify("Loop schedule stopped: no future cron occurrence.", "error");
				return;
			}
			current.nextRunAt = nextRunAt;
		}
		persistSchedule();

		arm(ctx);
	}

	pi.registerCommand("loop-schedule", {
		description:
			"Run a prompt now, then every interval: /loop-schedule 3h <prompt>; or schedule cron with --cron and --timezone",
		handler: async (args, ctx) => {
			if (args.trim() === "off") {
				schedule = undefined;
				clearTimer(ctx);
				persistSchedule();
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
				persistSchedule();
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
			persistSchedule();
			arm(ctx);
			ctx.ui.notify(`Loop schedule started; repeating every ${args.trim().split(/\s+/, 1)[0]}.`, "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		restoreSchedule(ctx);
	});

	pi.on("session_switch", async (_event, ctx) => {
		restoreSchedule(ctx);
	});
}
