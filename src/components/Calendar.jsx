import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// The three individual slots — if all three are booked the date is fully booked
const INDIVIDUAL_SLOTS = ["morning", "afternoon", "evening"];

/**
 * bookedSlots — shape: { "2026-06-14": ["morning", "full_day"], ... }
 * A date is "fully booked" when it has full_day OR all three individual slots.
 * A date is "partially booked" when it has some but not all slots.
 */
const Calendar = ({ bookedSlots = {}, selectedDate, onSelect }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const toDateStr = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  };

  const isPast     = (day) => { const d = new Date(viewYear, viewMonth, day); d.setHours(0,0,0,0); return d < today; };
  const isToday    = (day) => viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
  const isSelected = (day) => selectedDate === toDateStr(day);
  const canGoPrev  = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const getSlotStatus = (day) => {
    const booked = bookedSlots[toDateStr(day)] || [];
    if (booked.length === 0) return "available";
    if (booked.includes("full_day") || INDIVIDUAL_SLOTS.every(s => booked.includes(s))) return "full";
    return "partial";
  };

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`e-${i}`} />);

  for (let day = 1; day <= daysInMonth; day++) {
    const past       = isPast(day);
    const slotStatus = getSlotStatus(day);
    const selected   = isSelected(day);
    const todayCell  = isToday(day);
    const fullBooked = slotStatus === "full";
    const partial    = slotStatus === "partial";
    const disabled   = past || fullBooked;

    let cls = "relative w-full aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 ";
    if (selected)    cls += "bg-sky-500 text-white shadow-lg shadow-sky-200/50 dark:shadow-sky-900/50 scale-105 ";
    else if (fullBooked) cls += "bg-red-50 dark:bg-red-900/20 text-red-400 line-through cursor-not-allowed ";
    else if (past)   cls += "text-gray-300 dark:text-gray-600 cursor-not-allowed ";
    else if (partial) cls += "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 ring-1 ring-amber-200 dark:ring-amber-800 ";
    else if (todayCell) cls += "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 ring-2 ring-sky-200 dark:ring-sky-800 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/50 ";
    else cls += "text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ";

    cells.push(
      <button key={day} type="button" disabled={disabled} onClick={() => !disabled && onSelect(toDateStr(day))} className={cls}>
        {day}
        {fullBooked && !selected && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />}
        {partial    && !selected && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />}
        {todayCell  && !selected && !fullBooked && !partial && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-500" />}
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <button type="button" onClick={prevMonth} disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100">{MONTHS[viewMonth]} {viewYear}</h3>
        <button type="button" onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>

      <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-3 h-3 rounded bg-sky-500" /> Selected
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-3 h-3 rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800" /> Fully booked
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700" /> Partially booked
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-700" /> Past
        </div>
      </div>
    </div>
  );
};

export default Calendar;
