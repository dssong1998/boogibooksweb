import { subDays, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const SEOUL = 'Asia/Seoul';

/**
 * 이벤트 일시(UTC) 기준 서울 타임존에서
 * - 개최 3일 전 정오: 마지막 공지
 * - 개최 2일 전 자정: 신청 마감
 */
export function computeBoogiOutSchedule(eventDate: Date): {
  reminder3dAt: Date;
  registrationClosesAt: Date;
} {
  const eventLocal = toZonedTime(eventDate, SEOUL);

  const rLocal = subDays(eventLocal, 3);
  const reminderLocal = setHours(
    setMinutes(setSeconds(setMilliseconds(rLocal, 0), 0), 0),
    12,
  );
  const reminder3dAt = fromZonedTime(reminderLocal, SEOUL);

  const cLocal = subDays(eventLocal, 2);
  const closeLocal = setHours(
    setMinutes(setSeconds(setMilliseconds(cLocal, 0), 0), 0),
    0,
  );
  const registrationClosesAt = fromZonedTime(closeLocal, SEOUL);

  return { reminder3dAt, registrationClosesAt };
}
