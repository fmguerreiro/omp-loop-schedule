// @bun
// node_modules/croner/dist/croner.js
function h(n, t, e, r, s, i, a, l) {
  return h.fromTZ(h.tp(n, t, e, r, s, i, a), l);
}
h.fromTZISO = (n, t, e) => h.fromTZ(k(n, t), e);
h.fromTZ = function(n, t) {
  let e = new Date(Date.UTC(n.y, n.m - 1, n.d, n.h, n.i, n.s)), r = D(n.tz, e), s = new Date(e.getTime() - r), i = D(n.tz, s);
  if (i - r === 0)
    return s;
  {
    let a = new Date(e.getTime() - i), l = D(n.tz, a);
    if (l - i === 0)
      return a;
    if (!t && l - i > 0)
      return a;
    if (t)
      throw new Error("Invalid date passed to fromTZ()");
    return s;
  }
};
h.toTZ = function(n, t) {
  let e = n.toLocaleString("en-US", { timeZone: t }).replace(/[\u202f]/, " "), r = new Date(e);
  return { y: r.getFullYear(), m: r.getMonth() + 1, d: r.getDate(), h: r.getHours(), i: r.getMinutes(), s: r.getSeconds(), tz: t };
};
h.tp = (n, t, e, r, s, i, a) => ({ y: n, m: t, d: e, h: r, i: s, s: i, tz: a });
function D(n, t = new Date) {
  let e = t.toLocaleString("en-US", { timeZone: n, timeZoneName: "shortOffset" }).split(" ").slice(-1)[0], r = t.toLocaleString("en-US").replace(/[\u202f]/, " ");
  return Date.parse(`${r} GMT`) - Date.parse(`${r} ${e}`);
}
function k(n, t) {
  let e = new Date(Date.parse(n));
  if (isNaN(e))
    throw new Error("minitz: Invalid ISO8601 passed to parser.");
  let r = n.substring(9);
  return n.includes("Z") || r.includes("-") || r.includes("+") ? h.tp(e.getUTCFullYear(), e.getUTCMonth() + 1, e.getUTCDate(), e.getUTCHours(), e.getUTCMinutes(), e.getUTCSeconds(), "Etc/UTC") : h.tp(e.getFullYear(), e.getMonth() + 1, e.getDate(), e.getHours(), e.getMinutes(), e.getSeconds(), t);
}
h.minitz = h;
var b = 32;
var p = 31 | b;
var v = [1, 2, 4, 8, 16];
var d = class {
  pattern;
  timezone;
  second;
  minute;
  hour;
  day;
  month;
  dayOfWeek;
  lastDayOfMonth;
  starDOM;
  starDOW;
  constructor(t, e) {
    this.pattern = t, this.timezone = e, this.second = Array(60).fill(0), this.minute = Array(60).fill(0), this.hour = Array(24).fill(0), this.day = Array(31).fill(0), this.month = Array(12).fill(0), this.dayOfWeek = Array(7).fill(0), this.lastDayOfMonth = false, this.starDOM = false, this.starDOW = false, this.parse();
  }
  parse() {
    if (!(typeof this.pattern == "string" || this.pattern instanceof String))
      throw new TypeError("CronPattern: Pattern has to be of type string.");
    this.pattern.indexOf("@") >= 0 && (this.pattern = this.handleNicknames(this.pattern).trim());
    let t = this.pattern.replace(/\s+/g, " ").split(" ");
    if (t.length < 5 || t.length > 6)
      throw new TypeError("CronPattern: invalid configuration format ('" + this.pattern + "'), exactly five or six space separated parts are required.");
    if (t.length === 5 && t.unshift("0"), t[3].indexOf("L") >= 0 && (t[3] = t[3].replace("L", ""), this.lastDayOfMonth = true), t[3] == "*" && (this.starDOM = true), t[4].length >= 3 && (t[4] = this.replaceAlphaMonths(t[4])), t[5].length >= 3 && (t[5] = this.replaceAlphaDays(t[5])), t[5] == "*" && (this.starDOW = true), this.pattern.indexOf("?") >= 0) {
      let e = new f(new Date, this.timezone).getDate(true);
      t[0] = t[0].replace("?", e.getSeconds().toString()), t[1] = t[1].replace("?", e.getMinutes().toString()), t[2] = t[2].replace("?", e.getHours().toString()), this.starDOM || (t[3] = t[3].replace("?", e.getDate().toString())), t[4] = t[4].replace("?", (e.getMonth() + 1).toString()), this.starDOW || (t[5] = t[5].replace("?", e.getDay().toString()));
    }
    this.throwAtIllegalCharacters(t), this.partToArray("second", t[0], 0, 1), this.partToArray("minute", t[1], 0, 1), this.partToArray("hour", t[2], 0, 1), this.partToArray("day", t[3], -1, 1), this.partToArray("month", t[4], -1, 1), this.partToArray("dayOfWeek", t[5], 0, p), this.dayOfWeek[7] && (this.dayOfWeek[0] = this.dayOfWeek[7]);
  }
  partToArray(t, e, r, s) {
    let i = this[t], a = t === "day" && this.lastDayOfMonth;
    if (e === "" && !a)
      throw new TypeError("CronPattern: configuration entry " + t + " (" + e + ") is empty, check for trailing spaces.");
    if (e === "*")
      return i.fill(s);
    let l = e.split(",");
    if (l.length > 1)
      for (let o = 0;o < l.length; o++)
        this.partToArray(t, l[o], r, s);
    else
      e.indexOf("-") !== -1 && e.indexOf("/") !== -1 ? this.handleRangeWithStepping(e, t, r, s) : e.indexOf("-") !== -1 ? this.handleRange(e, t, r, s) : e.indexOf("/") !== -1 ? this.handleStepping(e, t, r, s) : e !== "" && this.handleNumber(e, t, r, s);
  }
  throwAtIllegalCharacters(t) {
    for (let e = 0;e < t.length; e++)
      if ((e === 5 ? /[^/*0-9,\-#L]+/ : /[^/*0-9,-]+/).test(t[e]))
        throw new TypeError("CronPattern: configuration entry " + e + " (" + t[e] + ") contains illegal characters.");
  }
  handleNumber(t, e, r, s) {
    let i = this.extractNth(t, e), a = parseInt(i[0], 10) + r;
    if (isNaN(a))
      throw new TypeError("CronPattern: " + e + " is not a number: '" + t + "'");
    this.setPart(e, a, i[1] || s);
  }
  setPart(t, e, r) {
    if (!Object.prototype.hasOwnProperty.call(this, t))
      throw new TypeError("CronPattern: Invalid part specified: " + t);
    if (t === "dayOfWeek") {
      if (e === 7 && (e = 0), e < 0 || e > 6)
        throw new RangeError("CronPattern: Invalid value for dayOfWeek: " + e);
      this.setNthWeekdayOfMonth(e, r);
      return;
    }
    if (t === "second" || t === "minute") {
      if (e < 0 || e >= 60)
        throw new RangeError("CronPattern: Invalid value for " + t + ": " + e);
    } else if (t === "hour") {
      if (e < 0 || e >= 24)
        throw new RangeError("CronPattern: Invalid value for " + t + ": " + e);
    } else if (t === "day") {
      if (e < 0 || e >= 31)
        throw new RangeError("CronPattern: Invalid value for " + t + ": " + e);
    } else if (t === "month" && (e < 0 || e >= 12))
      throw new RangeError("CronPattern: Invalid value for " + t + ": " + e);
    this[t][e] = r;
  }
  handleRangeWithStepping(t, e, r, s) {
    let i = this.extractNth(t, e), a = i[0].match(/^(\d+)-(\d+)\/(\d+)$/);
    if (a === null)
      throw new TypeError("CronPattern: Syntax error, illegal range with stepping: '" + t + "'");
    let [, l, o, u] = a, c = parseInt(l, 10) + r, w = parseInt(o, 10) + r, C = parseInt(u, 10);
    if (isNaN(c))
      throw new TypeError("CronPattern: Syntax error, illegal lower range (NaN)");
    if (isNaN(w))
      throw new TypeError("CronPattern: Syntax error, illegal upper range (NaN)");
    if (isNaN(C))
      throw new TypeError("CronPattern: Syntax error, illegal stepping: (NaN)");
    if (C === 0)
      throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
    if (C > this[e].length)
      throw new TypeError("CronPattern: Syntax error, steps cannot be greater than maximum value of part (" + this[e].length + ")");
    if (c > w)
      throw new TypeError("CronPattern: From value is larger than to value: '" + t + "'");
    for (let T = c;T <= w; T += C)
      this.setPart(e, T, i[1] || s);
  }
  extractNth(t, e) {
    let r = t, s;
    if (r.includes("#")) {
      if (e !== "dayOfWeek")
        throw new Error("CronPattern: nth (#) only allowed in day-of-week field");
      s = r.split("#")[1], r = r.split("#")[0];
    }
    return [r, s];
  }
  handleRange(t, e, r, s) {
    let i = this.extractNth(t, e), a = i[0].split("-");
    if (a.length !== 2)
      throw new TypeError("CronPattern: Syntax error, illegal range: '" + t + "'");
    let l = parseInt(a[0], 10) + r, o = parseInt(a[1], 10) + r;
    if (isNaN(l))
      throw new TypeError("CronPattern: Syntax error, illegal lower range (NaN)");
    if (isNaN(o))
      throw new TypeError("CronPattern: Syntax error, illegal upper range (NaN)");
    if (l > o)
      throw new TypeError("CronPattern: From value is larger than to value: '" + t + "'");
    for (let u = l;u <= o; u++)
      this.setPart(e, u, i[1] || s);
  }
  handleStepping(t, e, r, s) {
    let i = this.extractNth(t, e), a = i[0].split("/");
    if (a.length !== 2)
      throw new TypeError("CronPattern: Syntax error, illegal stepping: '" + t + "'");
    a[0] === "" && (a[0] = "*");
    let l = 0;
    a[0] !== "*" && (l = parseInt(a[0], 10) + r);
    let o = parseInt(a[1], 10);
    if (isNaN(o))
      throw new TypeError("CronPattern: Syntax error, illegal stepping: (NaN)");
    if (o === 0)
      throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
    if (o > this[e].length)
      throw new TypeError("CronPattern: Syntax error, max steps for part is (" + this[e].length + ")");
    for (let u = l;u < this[e].length; u += o)
      this.setPart(e, u, i[1] || s);
  }
  replaceAlphaDays(t) {
    return t.replace(/-sun/gi, "-7").replace(/sun/gi, "0").replace(/mon/gi, "1").replace(/tue/gi, "2").replace(/wed/gi, "3").replace(/thu/gi, "4").replace(/fri/gi, "5").replace(/sat/gi, "6");
  }
  replaceAlphaMonths(t) {
    return t.replace(/jan/gi, "1").replace(/feb/gi, "2").replace(/mar/gi, "3").replace(/apr/gi, "4").replace(/may/gi, "5").replace(/jun/gi, "6").replace(/jul/gi, "7").replace(/aug/gi, "8").replace(/sep/gi, "9").replace(/oct/gi, "10").replace(/nov/gi, "11").replace(/dec/gi, "12");
  }
  handleNicknames(t) {
    let e = t.trim().toLowerCase();
    return e === "@yearly" || e === "@annually" ? "0 0 1 1 *" : e === "@monthly" ? "0 0 1 * *" : e === "@weekly" ? "0 0 * * 0" : e === "@daily" ? "0 0 * * *" : e === "@hourly" ? "0 * * * *" : t;
  }
  setNthWeekdayOfMonth(t, e) {
    if (typeof e != "number" && e === "L")
      this.dayOfWeek[t] = this.dayOfWeek[t] | b;
    else if (e === p)
      this.dayOfWeek[t] = p;
    else if (e < 6 && e > 0)
      this.dayOfWeek[t] = this.dayOfWeek[t] | v[e - 1];
    else
      throw new TypeError(`CronPattern: nth weekday out of range, should be 1-5 or L. Value: ${e}, Type: ${typeof e}`);
  }
};
var O = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var m = [["month", "year", 0], ["day", "month", -1], ["hour", "day", 0], ["minute", "hour", 0], ["second", "minute", 0]];
var f = class n {
  tz;
  ms;
  second;
  minute;
  hour;
  day;
  month;
  year;
  constructor(t, e) {
    if (this.tz = e, t && t instanceof Date)
      if (!isNaN(t))
        this.fromDate(t);
      else
        throw new TypeError("CronDate: Invalid date passed to CronDate constructor");
    else if (t === undefined)
      this.fromDate(new Date);
    else if (t && typeof t == "string")
      this.fromString(t);
    else if (t instanceof n)
      this.fromCronDate(t);
    else
      throw new TypeError("CronDate: Invalid type (" + typeof t + ") passed to CronDate constructor");
  }
  isNthWeekdayOfMonth(t, e, r, s) {
    let a = new Date(Date.UTC(t, e, r)).getUTCDay(), l = 0;
    for (let o = 1;o <= r; o++)
      new Date(Date.UTC(t, e, o)).getUTCDay() === a && l++;
    if (s & p && v[l - 1] & s)
      return true;
    if (s & b) {
      let o = new Date(Date.UTC(t, e + 1, 0)).getUTCDate();
      for (let u = r + 1;u <= o; u++)
        if (new Date(Date.UTC(t, e, u)).getUTCDay() === a)
          return false;
      return true;
    }
    return false;
  }
  fromDate(t) {
    if (this.tz !== undefined)
      if (typeof this.tz == "number")
        this.ms = t.getUTCMilliseconds(), this.second = t.getUTCSeconds(), this.minute = t.getUTCMinutes() + this.tz, this.hour = t.getUTCHours(), this.day = t.getUTCDate(), this.month = t.getUTCMonth(), this.year = t.getUTCFullYear(), this.apply();
      else {
        let e = h.toTZ(t, this.tz);
        this.ms = t.getMilliseconds(), this.second = e.s, this.minute = e.i, this.hour = e.h, this.day = e.d, this.month = e.m - 1, this.year = e.y;
      }
    else
      this.ms = t.getMilliseconds(), this.second = t.getSeconds(), this.minute = t.getMinutes(), this.hour = t.getHours(), this.day = t.getDate(), this.month = t.getMonth(), this.year = t.getFullYear();
  }
  fromCronDate(t) {
    this.tz = t.tz, this.year = t.year, this.month = t.month, this.day = t.day, this.hour = t.hour, this.minute = t.minute, this.second = t.second, this.ms = t.ms;
  }
  apply() {
    if (this.month > 11 || this.day > O[this.month] || this.hour > 59 || this.minute > 59 || this.second > 59 || this.hour < 0 || this.minute < 0 || this.second < 0) {
      let t = new Date(Date.UTC(this.year, this.month, this.day, this.hour, this.minute, this.second, this.ms));
      return this.ms = t.getUTCMilliseconds(), this.second = t.getUTCSeconds(), this.minute = t.getUTCMinutes(), this.hour = t.getUTCHours(), this.day = t.getUTCDate(), this.month = t.getUTCMonth(), this.year = t.getUTCFullYear(), true;
    } else
      return false;
  }
  fromString(t) {
    if (typeof this.tz == "number") {
      let e = h.fromTZISO(t);
      this.ms = e.getUTCMilliseconds(), this.second = e.getUTCSeconds(), this.minute = e.getUTCMinutes(), this.hour = e.getUTCHours(), this.day = e.getUTCDate(), this.month = e.getUTCMonth(), this.year = e.getUTCFullYear(), this.apply();
    } else
      return this.fromDate(h.fromTZISO(t, this.tz));
  }
  findNext(t, e, r, s) {
    let i = this[e], a;
    r.lastDayOfMonth && (this.month !== 1 ? a = O[this.month] : a = new Date(Date.UTC(this.year, this.month + 1, 0, 0, 0, 0, 0)).getUTCDate());
    let l = !r.starDOW && e == "day" ? new Date(Date.UTC(this.year, this.month, 1, 0, 0, 0, 0)).getUTCDay() : undefined;
    for (let o = this[e] + s;o < r[e].length; o++) {
      let u = r[e][o];
      if (e === "day" && r.lastDayOfMonth && o - s == a && (u = 1), e === "day" && !r.starDOW) {
        let c = r.dayOfWeek[(l + (o - s - 1)) % 7];
        if (c && c & p)
          c = this.isNthWeekdayOfMonth(this.year, this.month, o - s, c) ? 1 : 0;
        else if (c)
          throw new Error(`CronDate: Invalid value for dayOfWeek encountered. ${c}`);
        t.legacyMode && !r.starDOM ? u = u || c : u = u && c;
      }
      if (u)
        return this[e] = o - s, i !== this[e] ? 2 : 1;
    }
    return 3;
  }
  recurse(t, e, r) {
    let s = this.findNext(e, m[r][0], t, m[r][2]);
    if (s > 1) {
      let i = r + 1;
      for (;i < m.length; )
        this[m[i][0]] = -m[i][2], i++;
      if (s === 3)
        return this[m[r][1]]++, this[m[r][0]] = -m[r][2], this.apply(), this.recurse(t, e, 0);
      if (this.apply())
        return this.recurse(t, e, r - 1);
    }
    return r += 1, r >= m.length ? this : this.year >= 3000 ? null : this.recurse(t, e, r);
  }
  increment(t, e, r) {
    return this.second += e.interval !== undefined && e.interval > 1 && r ? e.interval : 1, this.ms = 0, this.apply(), this.recurse(t, e, 0);
  }
  getDate(t) {
    return t || this.tz === undefined ? new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.ms) : typeof this.tz == "number" ? new Date(Date.UTC(this.year, this.month, this.day, this.hour, this.minute - this.tz, this.second, this.ms)) : h.fromTZ(h.tp(this.year, this.month + 1, this.day, this.hour, this.minute, this.second, this.tz), false);
  }
  getTime() {
    return this.getDate(false).getTime();
  }
};
function N(n) {
  if (n === undefined && (n = {}), delete n.name, n.legacyMode = n.legacyMode === undefined ? true : n.legacyMode, n.paused = n.paused === undefined ? false : n.paused, n.maxRuns = n.maxRuns === undefined ? 1 / 0 : n.maxRuns, n.catch = n.catch === undefined ? false : n.catch, n.interval = n.interval === undefined ? 0 : parseInt(n.interval.toString(), 10), n.utcOffset = n.utcOffset === undefined ? undefined : parseInt(n.utcOffset.toString(), 10), n.unref = n.unref === undefined ? false : n.unref, n.startAt && (n.startAt = new f(n.startAt, n.timezone)), n.stopAt && (n.stopAt = new f(n.stopAt, n.timezone)), n.interval !== null) {
    if (isNaN(n.interval))
      throw new Error("CronOptions: Supplied value for interval is not a number");
    if (n.interval < 0)
      throw new Error("CronOptions: Supplied value for interval can not be negative");
  }
  if (n.utcOffset !== undefined) {
    if (isNaN(n.utcOffset))
      throw new Error("CronOptions: Invalid value passed for utcOffset, should be number representing minutes offset from UTC.");
    if (n.utcOffset < -870 || n.utcOffset > 870)
      throw new Error("CronOptions: utcOffset out of bounds.");
    if (n.utcOffset !== undefined && n.timezone)
      throw new Error("CronOptions: Combining 'utcOffset' with 'timezone' is not allowed.");
  }
  if (n.unref !== true && n.unref !== false)
    throw new Error("CronOptions: Unref should be either true, false or undefined(false).");
  return n;
}
function g(n) {
  return Object.prototype.toString.call(n) === "[object Function]" || typeof n == "function" || n instanceof Function;
}
function S(n) {
  return g(n);
}
function P(n) {
  typeof Deno < "u" && typeof Deno.unrefTimer < "u" ? Deno.unrefTimer(n) : n && typeof n.unref < "u" && n.unref();
}
var _ = 30 * 1000;
var y = [];
var R = class {
  name;
  options;
  _states;
  fn;
  constructor(t, e, r) {
    let s, i;
    if (g(e))
      i = e;
    else if (typeof e == "object")
      s = e;
    else if (e !== undefined)
      throw new Error("Cron: Invalid argument passed for optionsIn. Should be one of function, or object (options).");
    if (g(r))
      i = r;
    else if (typeof r == "object")
      s = r;
    else if (r !== undefined)
      throw new Error("Cron: Invalid argument passed for funcIn. Should be one of function, or object (options).");
    if (this.name = s?.name, this.options = N(s), this._states = { kill: false, blocking: false, previousRun: undefined, currentRun: undefined, once: undefined, currentTimeout: undefined, maxRuns: s ? s.maxRuns : undefined, paused: s ? s.paused : false, pattern: new d("* * * * *") }, t && (t instanceof Date || typeof t == "string" && t.indexOf(":") > 0) ? this._states.once = new f(t, this.options.timezone || this.options.utcOffset) : this._states.pattern = new d(t, this.options.timezone), this.name) {
      if (y.find((l) => l.name === this.name))
        throw new Error("Cron: Tried to initialize new named job '" + this.name + "', but name already taken.");
      y.push(this);
    }
    return i !== undefined && S(i) && (this.fn = i, this.schedule()), this;
  }
  nextRun(t) {
    let e = this._next(t);
    return e ? e.getDate(false) : null;
  }
  nextRuns(t, e) {
    this._states.maxRuns !== undefined && t > this._states.maxRuns && (t = this._states.maxRuns);
    let r = [], s = e || this._states.currentRun || undefined;
    for (;t-- && (s = this.nextRun(s)); )
      r.push(s);
    return r;
  }
  getPattern() {
    return this._states.pattern ? this._states.pattern.pattern : undefined;
  }
  isRunning() {
    let t = this.nextRun(this._states.currentRun), e = !this._states.paused, r = this.fn !== undefined, s = !this._states.kill;
    return e && r && s && t !== null;
  }
  isStopped() {
    return this._states.kill;
  }
  isBusy() {
    return this._states.blocking;
  }
  currentRun() {
    return this._states.currentRun ? this._states.currentRun.getDate() : null;
  }
  previousRun() {
    return this._states.previousRun ? this._states.previousRun.getDate() : null;
  }
  msToNext(t) {
    let e = this._next(t);
    return e ? t instanceof f || t instanceof Date ? e.getTime() - t.getTime() : e.getTime() - new f(t).getTime() : null;
  }
  stop() {
    this._states.kill = true, this._states.currentTimeout && clearTimeout(this._states.currentTimeout);
    let t = y.indexOf(this);
    t >= 0 && y.splice(t, 1);
  }
  pause() {
    return this._states.paused = true, !this._states.kill;
  }
  resume() {
    return this._states.paused = false, !this._states.kill;
  }
  schedule(t) {
    if (t && this.fn)
      throw new Error("Cron: It is not allowed to schedule two functions using the same Croner instance.");
    t && (this.fn = t);
    let e = this.msToNext(), r = this.nextRun(this._states.currentRun);
    return e == null || isNaN(e) || r === null ? this : (e > _ && (e = _), this._states.currentTimeout = setTimeout(() => this._checkTrigger(r), e), this._states.currentTimeout && this.options.unref && P(this._states.currentTimeout), this);
  }
  async _trigger(t) {
    if (this._states.blocking = true, this._states.currentRun = new f(undefined, this.options.timezone || this.options.utcOffset), this.options.catch)
      try {
        this.fn !== undefined && await this.fn(this, this.options.context);
      } catch (e) {
        g(this.options.catch) && this.options.catch(e, this);
      }
    else
      this.fn !== undefined && await this.fn(this, this.options.context);
    this._states.previousRun = new f(t, this.options.timezone || this.options.utcOffset), this._states.blocking = false;
  }
  async trigger() {
    await this._trigger();
  }
  runsLeft() {
    return this._states.maxRuns;
  }
  _checkTrigger(t) {
    let e = new Date, r = !this._states.paused && e.getTime() >= t.getTime(), s = this._states.blocking && this.options.protect;
    r && !s ? (this._states.maxRuns !== undefined && this._states.maxRuns--, this._trigger()) : r && s && g(this.options.protect) && setTimeout(() => this.options.protect(this), 0), this.schedule();
  }
  _next(t) {
    let e = !!(t || this._states.currentRun), r = false;
    !t && this.options.startAt && this.options.interval && ([t, e] = this._calculatePreviousRun(t, e), r = !t), t = new f(t, this.options.timezone || this.options.utcOffset), this.options.startAt && t && t.getTime() < this.options.startAt.getTime() && (t = this.options.startAt);
    let s = this._states.once || new f(t, this.options.timezone || this.options.utcOffset);
    return !r && s !== this._states.once && (s = s.increment(this._states.pattern, this.options, e)), this._states.once && this._states.once.getTime() <= t.getTime() || s === null || this._states.maxRuns !== undefined && this._states.maxRuns <= 0 || this._states.kill || this.options.stopAt && s.getTime() >= this.options.stopAt.getTime() ? null : s;
  }
  _calculatePreviousRun(t, e) {
    let r = new f(undefined, this.options.timezone || this.options.utcOffset), s = t;
    if (this.options.startAt.getTime() <= r.getTime()) {
      s = this.options.startAt;
      let i = s.getTime() + this.options.interval * 1000;
      for (;i <= r.getTime(); )
        s = new f(s, this.options.timezone || this.options.utcOffset).increment(this._states.pattern, this.options, true), i = s.getTime() + this.options.interval * 1000;
      e = true;
    }
    return s === null && (s = undefined), [s, e];
  }
};

// loop-schedule.ts
var USAGE = 'Usage: /loop-schedule <number>s|m|h|d <prompt> | /loop-schedule --cron "<minute> <hour> <day-of-month> <month> <day-of-week>" --timezone <IANA timezone> [--run-on-start] <prompt> | /loop-schedule off';
var MAX_TIMER_MS = 2147483647;
var UNITS_MS = {
  s: 1000,
  m: 60000,
  h: 3600000,
  d: 86400000
};
function parseScheduleArgs(args) {
  const match = /^(\d+)\s*([smhd])\s+(.+)$/i.exec(args.trim());
  if (!match)
    return USAGE;
  const intervalMs = Number(match[1]) * UNITS_MS[match[2].toLowerCase()];
  if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0 || intervalMs > MAX_TIMER_MS)
    return USAGE;
  return { intervalMs, prompt: match[3].trim() };
}
function nextCronRun(cron, from) {
  return cron.nextRun(from)?.getTime();
}
function cronMatchesNow(cron, now) {
  const minuteStart = new Date(now);
  minuteStart.setSeconds(0, 0);
  return nextCronRun(cron, new Date(minuteStart.getTime() - 1)) === minuteStart.getTime();
}
function parseCronArgs(args) {
  const match = /^--cron\s+(?:"([^"]*)"|'([^']*)'|(\S+))\s+--timezone\s+(\S+)(\s+--run-on-start)?\s+(.+)$/s.exec(args.trim());
  if (!match)
    return USAGE;
  const expression = match[1] ?? match[2] ?? match[3];
  const prompt = match[6].trim();
  if (expression.trim().split(/\s+/).length !== 5 || prompt.startsWith("--"))
    return USAGE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: match[4] });
    const cron = new R(expression, { paused: true, timezone: match[4] });
    if (nextCronRun(cron, new Date) === undefined)
      return USAGE;
    return { cron, prompt, runOnStart: Boolean(match[5]) };
  } catch {
    return USAGE;
  }
}
function loopSchedule(pi) {
  let schedule;
  let timer;
  function clearTimer(ctx) {
    if (!timer)
      return;
    ctx.clearTimer(timer);
    timer = undefined;
  }
  function arm(ctx) {
    if (!schedule)
      return;
    clearTimer(ctx);
    timer = ctx.setTimeout(() => tick(ctx), Math.min(MAX_TIMER_MS, Math.max(0, schedule.nextRunAt - Date.now())));
  }
  function tick(ctx) {
    timer = undefined;
    if (!schedule)
      return;
    const current = schedule;
    if (current.nextRunAt > Date.now()) {
      arm(ctx);
      return;
    }
    if (ctx.isIdle() && !ctx.hasPendingMessages()) {
      pi.sendUserMessage(current.prompt, { attribution: "agent" });
    }
    if (current.kind === "interval") {
      while (current.nextRunAt <= Date.now())
        current.nextRunAt += current.intervalMs;
    } else {
      const nextRunAt = nextCronRun(current.cron, new Date);
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
    description: "Run a prompt now, then every interval: /loop-schedule 3h <prompt>; or schedule cron with --cron and --timezone",
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
        const now = new Date;
        const nextRunAt = runOnStart && cronMatchesNow(cronSchedule.cron, now) ? now.getTime() : nextCronRun(cronSchedule.cron, now);
        if (nextRunAt === undefined) {
          ctx.ui.notify(USAGE, "error");
          return;
        }
        schedule = { kind: "cron", ...cronSchedule, nextRunAt };
        arm(ctx);
        ctx.ui.notify(`Loop schedule started; cron ${cronSchedule.cron.getPattern()} in ${args.trim().match(/--timezone\s+(\S+)/)?.[1]}.`, "info");
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
        nextRunAt: Date.now()
      };
      arm(ctx);
      ctx.ui.notify(`Loop schedule started; repeating every ${args.trim().split(/\s+/, 1)[0]}.`, "info");
    }
  });
}
export {
  loopSchedule as default,
  parseScheduleArgs
};
