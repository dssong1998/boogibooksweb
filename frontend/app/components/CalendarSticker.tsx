export type CalendarStickerItem = {
  id: string;
  title: string;
  date: Date;
  type: "event" | "schedule";
  scheduleType?: string;
};

const scheduleTypeStyles: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  MEETING: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-800 dark:text-indigo-300",
    label: "모임",
  },
  SHELLCAST: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-300",
    label: "쉘캐스트",
  },
  DIGGING_CLUB: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-300",
    label: "디깅클럽",
  },
  MOVIE_NIGHT: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-800 dark:text-rose-300",
    label: "무비나잇",
  },
  BOOGITOUT: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-800 dark:text-emerald-300",
    label: "부깃아웃",
  },
};

function getItemStyle(item: CalendarStickerItem) {
  if (item.type === "event") {
    return {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-300",
      label: "이벤트",
    };
  }
  const style = scheduleTypeStyles[item.scheduleType ?? "MEETING"];
  return style ?? scheduleTypeStyles.MEETING;
}

interface CalendarStickerProps {
  date: Date;
  items: CalendarStickerItem[];
  onClose: () => void;
  onEventClick?: (item: CalendarStickerItem) => void;
}

const monthNames = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

export function CalendarSticker({
  date,
  items,
  onClose,
  onEventClick,
}: CalendarStickerProps) {
  const label = `${date.getFullYear()}년 ${monthNames[date.getMonth()]} ${date.getDate()}일`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 touch-none"
        onClick={onClose}
        aria-hidden
      />
      {/* Sticker panel - Apple Calendar style bottom sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom,0)] max-h-[70vh] flex flex-col"
        role="dialog"
        aria-label={`${label} 일정`}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="px-4 pb-4 flex-shrink-0 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -m-2 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 dark:hover:bg-gray-700"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {items.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4">이 날 일정이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const style = getItemStyle(item);
                const timeLabel = item.date
                  ? item.date.toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : null;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onEventClick?.(item)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl ${style.bg} ${style.text} transition active:opacity-80`}
                    >
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {timeLabel ?? style.label}
                      </span>
                      <div className="font-medium truncate">{item.title}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
