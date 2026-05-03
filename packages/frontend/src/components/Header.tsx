import { useConfig } from "@/hooks/useConfig";

const SEASONAL_KAOMOJI: Record<string, string[]> = {
  spring: [
    "(✿◠‿◠)", "(◕ᴗ◕✿)", "(* ^ ω ^)", "(◠‿◠✿)", "(◕‿◕✿)",
    "(´｡• ᵕ •｡`)", "♡(｡- ω -)", "(｡･ω･｡)ﾉ♡", "(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)", "(◡‿◡✿)",
  ],
  summer: [
    "(◕‿◕☀)", "(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧", "(o´▽`o)", "(◕‿◕)", "(*≧▽≦)",
    "╰(▔∀▔)╯", "(≧∇≦)/", "ヽ(>∀<☆)ノ", "(๑˃ᴗ˂)ﻭ", "(ノ*°▽°*)",
  ],
  autumn: [
    "(◕‿◕🍂)", "(o´▽`o)", "(◠‿◠)", "(◕ᴗ◕)", "(✿╹◡╹)",
    "(´｡• ᎑ •`)っ🍂", "(｡•́‿•̀｡)", "(◡ ω ◡)", "(´･ᴗ･`)", "(◕‿◕✿)",
  ],
  winter: [
    "(◕‿◕❄)", "(｡◕‿◕｡)", "(* ^ ω ^)", "(◕‿◕)", "(◠‿◠)",
    "(´｡• ᎑ •`)っ❄", "(。-ω-)zzz", "(◡ ‿ ◡ ✿)", "(´｡• ̫ •｡`)", "(｡•́︿•̀｡)",
  ],
};

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getWeatherSuffix(desc?: string): string | undefined {
  if (!desc) return undefined;
  const d = desc.toLowerCase();
  if (d.includes("rain") || d.includes("雨")) return "下雨了，记得带伞哦~";
  if (d.includes("snow") || d.includes("雪")) return "外面下雪了呢，穿厚点~";
  if (d.includes("fog") || d.includes("雾")) return "窗外雾蒙蒙的，出门小心~";
  if (d.includes("thunder") || d.includes("雷")) return "外面打雷了，注意安全~";
  if (d.includes("sun") || d.includes("clear") || d.includes("晴")) return "今天阳光真好呢~";
  if (d.includes("cloud") || d.includes("阴") || d.includes("多云")) return "今天云层有点厚呢~";
  if (d.includes("wind") || d.includes("风")) return "今天风好大呀~";
  if (d.includes("hot") || d.includes("heat") || d.includes("热")) return "今天好热，注意防暑~";
  if (d.includes("cold") || d.includes("冷") || d.includes("freeze")) return "今天好冷，注意保暖~";
  return undefined;
}

const TIME_GREETINGS: Record<string, string[]> = {
  dawn: [
    "天刚亮呢，早起的人儿有虫吃~",
    "清晨的第一缕阳光，早安~",
    "鸟儿还没起床你就起来了呢~",
  ],
  morning: [
    "早上好呀，新的一天开始啦~",
    "早安！今天是元气满满的一天~",
    "早上好，今天也要加油哦~",
  ],
  lateMorning: [
    "上午好呀，在忙什么呢~",
    "上午好，效率最高的时段~",
    "上午好呀，专注模式开启~",
  ],
  noon: [
    "午饭时间到！今天吃什么呢~",
    "正午好呀，该吃饭啦~",
    "午饭时间~ 要好好吃饭哦！",
  ],
  afternoon: [
    "下午好呀，来杯茶吧~",
    "下午好，天气不错呢~",
    "下午好呀，休息一下再继续~",
  ],
  evening: [
    "傍晚好呀，日落时分最美了~",
    "傍晚好，晚霞很美呢~",
    "傍晚好呀，一天快结束啦~",
  ],
  night: [
    "晚上好呀，看看今天都做了什么吧~",
    "晚上好，总结一下今天的经历~",
    "晚上好呀，放松一下心情~",
  ],
  lateNight: [
    "夜深了喵~ 早睡早起身体好",
    "夜深了，别熬太晚哦~",
    "夜深了喵~ 晚安世界",
  ],
};

const WEEKEND_GREETINGS: Record<string, string[]> = {
  morning: [
    "周末早上好呀~ 睡到自然醒真好！",
    "周末早安！今天没有闹钟~",
    "周末早上好，享受悠闲时光~",
  ],
  lateMorning: [
    "周末上午好~ 不用赶时间的日子真棒",
    "周末上午好呀，慵懒模式开启~",
  ],
  afternoon: [
    "周末下午好~ 自由自在的时光",
    "周末下午好呀，做点喜欢的事吧~",
  ],
  night: [
    "周末晚上好~ 明天还是周末呢！",
    "周末晚上好呀，尽情享受吧~",
  ],
};

function pickFromPool(pool: string[], seed: number): string {
  return pool[Math.abs(seed) % pool.length];
}

interface GreetingOptions {
  hour: number;
  month: number;
  weatherDesc?: string;
  allOffline?: boolean;
  dateObj?: Date;
}

function getGreeting(options: GreetingOptions): { kaomoji: string; text: string } {
  const { hour, month, weatherDesc, allOffline, dateObj } = options;
  const now = dateObj ?? new Date();
  const weekend = isWeekend(now);
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );

  if (allOffline && (hour >= 22 || hour < 5)) {
    const sleepKaomoji = ["(-.-)zzZ", "(｡- ω -)zzZ", "(´｡• ᎑ •`)っ💤", "(。-ω-)zzz"];
    return { kaomoji: pickFromPool(sleepKaomoji, dayOfYear), text: "大家都睡着了呢~" };
  }

  let slot: string;
  if (hour >= 5 && hour < 7) slot = "dawn";
  else if (hour >= 7 && hour < 9) slot = "morning";
  else if (hour >= 9 && hour < 12) slot = "lateMorning";
  else if (hour >= 12 && hour < 14) slot = "noon";
  else if (hour >= 14 && hour < 17) slot = "afternoon";
  else if (hour >= 17 && hour < 19) slot = "evening";
  else if (hour >= 19 && hour < 22) slot = "night";
  else slot = "lateNight";

  let text: string;
  if (weekend && WEEKEND_GREETINGS[slot]) {
    text = pickFromPool(WEEKEND_GREETINGS[slot], dayOfYear);
  } else {
    const pool = TIME_GREETINGS[slot] ?? TIME_GREETINGS["lateNight"];
    text = pickFromPool(pool, dayOfYear);
  }

  const weatherSuffix = getWeatherSuffix(weatherDesc);
  if (weatherSuffix) text = `${text} ${weatherSuffix}`;

  const season = getSeason(month);
  const pool = SEASONAL_KAOMOJI[season];
  const kaomoji = pickFromPool(pool, dayOfYear + hour);

  return { kaomoji, text };
}

interface HeaderProps {
  serverTime?: string;
  viewerCount?: number;
  displayName?: string;
  weatherDesc?: string;
  allOffline?: boolean;
  panelSummary?: string;
}

export default function Header({
  serverTime,
  viewerCount = 0,
  displayName: displayNameProp,
  weatherDesc,
  allOffline,
  panelSummary,
}: HeaderProps) {
  const { displayName: configDisplayName, siteTitle } = useConfig();
  const displayName = displayNameProp ?? configDisplayName;
  const timeStr = (() => {
    if (!serverTime) return "--:--";
    const d = new Date(serverTime);
    if (isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  })();

  const greeting = (() => {
    const baseOpts = { weatherDesc, allOffline };
    if (!serverTime) {
      const now = new Date();
      return getGreeting({ ...baseOpts, hour: now.getHours(), month: now.getMonth() + 1, dateObj: now });
    }
    const d = new Date(serverTime);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return getGreeting({ ...baseOpts, hour: now.getHours(), month: now.getMonth() + 1, dateObj: now });
    }
    return getGreeting({ ...baseOpts, hour: d.getHours(), month: d.getMonth() + 1, dateObj: d });
  })();

  return (
    <header className="pb-4 mb-6 separator-dashed">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold font-[var(--font-jp)] text-[var(--color-text)] leading-tight">
            {siteTitle}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            <span className="mr-1">{greeting.kaomoji}</span>
            {greeting.text}
          </p>
          {panelSummary && (
            <p className="text-xs text-[var(--color-secondary)] mt-1 animate-fade-in">
              {panelSummary}
            </p>
          )}
        </div>

        <div className="text-right flex flex-col items-end gap-0.5">
          {viewerCount > 0 && (
            <p className="text-xs text-[var(--color-primary)] font-medium">
              {viewerCount} 人在看喵~
            </p>
          )}
          <p className="text-sm font-mono font-medium text-[var(--color-secondary)]">
            {timeStr}
          </p>
        </div>
      </div>
    </header>
  );
}
