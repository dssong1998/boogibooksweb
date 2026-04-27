import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from 'react';
import { useNavigate } from 'react-router';
import {
  applyToRoom,
  getMe,
  getMyRoom,
  getRooms,
  navigateHomeRememberingReturn,
  type RoomKey,
  type RoomSummary,
} from '../lib/api';

type Room = 'dong' | 'aegean' | 'gibraltar';

function toRoomKey(id: Room): RoomKey {
  if (id === 'dong') return 'DONG';
  if (id === 'aegean') return 'AEGEAN';
  return 'GIBRALTAR';
}

/** SSR과 클라이언트 첫 페인트를 일치시켜 hydration 오류를 방지합니다. */
function subscribeToHydrated(_onStoreChange: () => void): () => void {
  return () => {};
}

function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToHydrated,
    () => true,
    () => false,
  );
}

// ── SVG 배경 패턴 ──────────────────────────────────────────────
function DongHaeBg() {
  return (
    <svg
      className='absolute inset-0 w-full h-full'
      viewBox='0 0 600 220'
      preserveAspectRatio='xMidYMid slice'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
    >
      <defs>
        <radialGradient id='dg1' cx='85%' cy='20%' r='50%'>
          <stop offset='0%' stopColor='#f4d03f' stopOpacity='0.18' />
          <stop offset='100%' stopColor='#0f3460' stopOpacity='0' />
        </radialGradient>
        <radialGradient id='dg2' cx='15%' cy='80%' r='60%'>
          <stop offset='0%' stopColor='#1a5276' stopOpacity='0.5' />
          <stop offset='100%' stopColor='#0f3460' stopOpacity='0' />
        </radialGradient>
        <clipPath id='dongClip'>
          <rect width='600' height='220' rx='16' />
        </clipPath>
      </defs>
      <g clipPath='url(#dongClip)'>
        <rect width='600' height='220' fill='#0a1929' />
        <rect width='600' height='220' fill='url(#dg1)' />
        <rect width='600' height='220' fill='url(#dg2)' />
        {/* sun */}
        <circle cx='510' cy='54' r='42' fill='#e8b84b' opacity='0.9' />
        <circle cx='510' cy='54' r='32' fill='#f4d03f' />
        <circle cx='510' cy='54' r='22' fill='#fef9e7' opacity='0.6' />
        <circle
          cx='510'
          cy='54'
          r='55'
          fill='none'
          stroke='#f4d03f'
          strokeWidth='1'
          opacity='0.15'
        />
        <circle
          cx='510'
          cy='54'
          r='68'
          fill='none'
          stroke='#f4d03f'
          strokeWidth='0.5'
          opacity='0.08'
        />
        {/* horizon */}
        <line
          x1='0'
          y1='148'
          x2='600'
          y2='148'
          stroke='#2e86c1'
          strokeWidth='0.5'
          opacity='0.3'
        />
        {/* waves */}
        <path
          d='M-10 155 Q60 145 130 156 Q200 167 270 155 Q340 143 410 155 Q480 167 550 155 Q580 150 610 155'
          fill='none'
          stroke='#5dade2'
          strokeWidth='1.5'
          opacity='0.45'
        />
        <path
          d='M-10 168 Q70 158 140 169 Q210 180 280 168 Q350 156 420 169 Q490 181 560 168 Q585 163 610 168'
          fill='none'
          stroke='#5dade2'
          strokeWidth='1'
          opacity='0.28'
        />
        <path
          d='M-10 181 Q80 172 150 182 Q230 193 300 181 Q370 169 440 182 Q510 194 580 181'
          fill='none'
          stroke='#aed6f1'
          strokeWidth='0.8'
          opacity='0.18'
        />
        {/* sea fill */}
        <path
          d='M0 155 Q75 143 150 155 Q225 167 300 155 Q375 143 450 155 Q525 167 600 155 L600 220 L0 220Z'
          fill='#1a4a7a'
          opacity='0.22'
        />
        {/* reflection */}
        <line
          x1='510'
          y1='90'
          x2='430'
          y2='220'
          stroke='#f4d03f'
          strokeWidth='1'
          opacity='0.07'
        />
        <line
          x1='510'
          y1='90'
          x2='490'
          y2='220'
          stroke='#f4d03f'
          strokeWidth='2'
          opacity='0.05'
        />
      </g>
    </svg>
  );
}

function AegeanBg() {
  const stars: [number, number, number][] = [
    [55, 22, 1.4],
    [110, 14, 1],
    [175, 28, 1.8],
    [240, 10, 1.2],
    [300, 22, 1],
    [355, 16, 1.6],
    [415, 26, 1.1],
    [475, 12, 1.8],
    [530, 20, 1.3],
    [580, 8, 1],
    [80, 44, 0.9],
    [200, 50, 1.4],
    [330, 40, 1],
    [450, 46, 1.5],
    [560, 38, 1.1],
    [135, 68, 0.8],
    [265, 62, 1.2],
    [390, 70, 0.9],
    [500, 58, 1.4],
    [30, 80, 1],
  ];
  return (
    <svg
      className='absolute inset-0 w-full h-full'
      viewBox='0 0 600 220'
      preserveAspectRatio='xMidYMid slice'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
    >
      <defs>
        <radialGradient id='ag1' cx='80%' cy='18%' r='45%'>
          <stop offset='0%' stopColor='#8e44ad' stopOpacity='0.22' />
          <stop offset='100%' stopColor='#1b2631' stopOpacity='0' />
        </radialGradient>
        <radialGradient id='ag2' cx='20%' cy='75%' r='55%'>
          <stop offset='0%' stopColor='#2e4057' stopOpacity='0.55' />
          <stop offset='100%' stopColor='#1b2631' stopOpacity='0' />
        </radialGradient>
        <clipPath id='aegClip'>
          <rect width='600' height='220' rx='16' />
        </clipPath>
      </defs>
      <g clipPath='url(#aegClip)'>
        <rect width='600' height='220' fill='#0d0f14' />
        <rect width='600' height='220' fill='url(#ag1)' />
        <rect width='600' height='220' fill='url(#ag2)' />
        {/* stars */}
        {stars.map(([x, y, r], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill='#e8daef'
            opacity={0.4 + (i % 5) * 0.1}
          />
        ))}
        {/* crescent moon */}
        <circle cx='530' cy='52' r='36' fill='#4a235a' opacity='0.75' />
        <circle cx='518' cy='44' r='28' fill='#0d0f14' />
        <circle
          cx='530'
          cy='52'
          r='48'
          fill='none'
          stroke='#8e44ad'
          strokeWidth='1'
          opacity='0.12'
        />
        <circle
          cx='530'
          cy='52'
          r='60'
          fill='none'
          stroke='#8e44ad'
          strokeWidth='0.5'
          opacity='0.06'
        />
        {/* column silhouettes */}
        <rect
          x='430'
          y='140'
          width='10'
          height='80'
          rx='3'
          fill='#6c3483'
          opacity='0.35'
        />
        <rect
          x='448'
          y='130'
          width='10'
          height='90'
          rx='3'
          fill='#5b2c6f'
          opacity='0.3'
        />
        <rect
          x='466'
          y='145'
          width='10'
          height='75'
          rx='3'
          fill='#6c3483'
          opacity='0.32'
        />
        <rect
          x='484'
          y='136'
          width='9'
          height='84'
          rx='3'
          fill='#5b2c6f'
          opacity='0.28'
        />
        {/* sea */}
        <path
          d='M0 162 Q80 152 160 163 Q240 174 320 162 Q400 150 480 163 Q540 172 600 162 L600 220 L0 220Z'
          fill='#2e4057'
          opacity='0.3'
        />
        <path
          d='M0 170 Q90 160 180 171 Q270 182 360 170 Q450 158 540 171 Q570 175 600 170'
          fill='none'
          stroke='#a569bd'
          strokeWidth='0.8'
          opacity='0.2'
        />
        <path
          d='M0 182 Q100 173 200 183 Q300 194 400 182 Q500 170 600 182'
          fill='none'
          stroke='#8e44ad'
          strokeWidth='0.5'
          opacity='0.15'
        />
      </g>
    </svg>
  );
}

function GibraltarBg() {
  return (
    <svg
      className='absolute inset-0 w-full h-full'
      viewBox='0 0 600 220'
      preserveAspectRatio='xMidYMid slice'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
    >
      <defs>
        <radialGradient id='gg1' cx='90%' cy='25%' r='40%'>
          <stop offset='0%' stopColor='#f4d03f' stopOpacity='0.12' />
          <stop offset='100%' stopColor='#1e3a2f' stopOpacity='0' />
        </radialGradient>
        <radialGradient id='gg2' cx='15%' cy='85%' r='60%'>
          <stop offset='0%' stopColor='#148f77' stopOpacity='0.35' />
          <stop offset='100%' stopColor='#1e3a2f' stopOpacity='0' />
        </radialGradient>
        <clipPath id='gibClip'>
          <rect width='600' height='220' rx='16' />
        </clipPath>
      </defs>
      <g clipPath='url(#gibClip)'>
        <rect width='600' height='220' fill='#0d1a12' />
        <rect width='600' height='220' fill='url(#gg1)' />
        <rect width='600' height='220' fill='url(#gg2)' />
        {/* rock silhouette */}
        <polygon
          points='370,220 480,80 560,120 600,90 600,220'
          fill='#0d3b1e'
          opacity='0.65'
        />
        <polygon
          points='440,220 530,110 590,140 600,125 600,220'
          fill='#145a32'
          opacity='0.4'
        />
        <polygon
          points='490,220 560,140 600,160 600,220'
          fill='#1e8449'
          opacity='0.25'
        />
        {/* lighthouse */}
        <circle cx='481' cy='76' r='7' fill='#f4d03f' opacity='0.95' />
        <circle cx='481' cy='76' r='4' fill='#fef9e7' />
        <circle
          cx='481'
          cy='76'
          r='12'
          fill='none'
          stroke='#f4d03f'
          strokeWidth='1'
          opacity='0.3'
        />
        <circle
          cx='481'
          cy='76'
          r='20'
          fill='none'
          stroke='#f4d03f'
          strokeWidth='0.5'
          opacity='0.15'
        />
        {/* light beams */}
        <line
          x1='481'
          y1='76'
          x2='20'
          y2='200'
          stroke='#f9e79f'
          strokeWidth='1.5'
          opacity='0.1'
        />
        <line
          x1='481'
          y1='76'
          x2='0'
          y2='160'
          stroke='#f9e79f'
          strokeWidth='1'
          opacity='0.07'
        />
        <line
          x1='481'
          y1='76'
          x2='100'
          y2='220'
          stroke='#f9e79f'
          strokeWidth='0.8'
          opacity='0.06'
        />
        {/* sea */}
        <path
          d='M0 158 Q75 148 150 159 Q225 170 300 158 Q375 146 450 158 Q525 170 600 158 L600 220 L0 220Z'
          fill='#148f77'
          opacity='0.2'
        />
        <path
          d='M0 165 Q80 155 160 166 Q240 177 320 165 Q400 153 480 165 Q540 174 600 165'
          fill='none'
          stroke='#27ae60'
          strokeWidth='1.2'
          opacity='0.3'
        />
        <path
          d='M0 178 Q90 169 180 179 Q270 190 360 178 Q450 166 540 179 Q570 183 600 178'
          fill='none'
          stroke='#7dcea0'
          strokeWidth='0.8'
          opacity='0.2'
        />
      </g>
    </svg>
  );
}

// ── 데이터 ─────────────────────────────────────────────────────
interface RoomConfig {
  id: Room;
  tag: string;
  name: string;
  nameEn: string;
  concept: string;
  description: string[];
  capacity: number;
  dot: string;
  dotFade: string;
  tagColor: string;
  nameEnColor: string;
  descColor: string;
  border: string;
  borderSelected: string;
  glow: string;
  badge: string;
  badgeText: string;
  Bg: () => ReactElement;
}

const ROOMS: RoomConfig[] = [
  {
    id: 'dong',
    tag: '읽기의 바다',
    name: '동해',
    nameEn: 'East Sea',
    concept: '들어오다',
    description: [
      '더 다양하게, 더 많이.',
      '같은 것도 여러 번 읽으며 숨은 의미를',
      '찾고 시선을 확장합니다.',
    ],
    capacity: 5,
    dot: '#5dade2',
    dotFade: '#2e86c1',
    tagColor: '#7fb3d3',
    nameEnColor: '#a9cce3',
    descColor: '#cce0f0',
    border: 'border-[#1a4a7a]/40',
    borderSelected: 'border-[#5dade2]/70',
    glow: 'shadow-[0_0_60px_rgba(93,173,226,0.22)]',
    badge: 'bg-[#5dade2]/15 border-[#5dade2]/30',
    badgeText: 'text-white',
    Bg: DongHaeBg,
  },
  {
    id: 'aegean',
    tag: '사유의 바다',
    name: '에게해',
    nameEn: 'Aegean Sea',
    concept: '익어가다',
    description: [
      '문장 뒷켠에 오래 머뭅니다.',
      '읽은 것에서 질문을 길어올려',
      '깊이 사유합니다.',
    ],
    capacity: 5,
    dot: '#8e44ad',
    dotFade: '#6c3483',
    tagColor: '#a569bd',
    nameEnColor: '#c39bd3',
    descColor: '#e0d0eb',
    border: 'border-[#2e3f57]/40',
    borderSelected: 'border-[#8e44ad]/70',
    glow: 'shadow-[0_0_60px_rgba(142,68,173,0.22)]',
    badge: 'bg-[#8e44ad]/15 border-[#8e44ad]/30',
    badgeText: 'text-white',
    Bg: AegeanBg,
  },
  {
    id: 'gibraltar',
    tag: '쓰기의 바다',
    name: '지브롤터',
    nameEn: 'Strait of Gibraltar',
    concept: '흘러나오다',
    description: [
      '읽고 질문하고 생각한 것을',
      '나의 문장으로 정리해',
      '써내려 갑니다.',
    ],
    capacity: 5,
    dot: '#27ae60',
    dotFade: '#1e8449',
    tagColor: '#7dcea0',
    nameEnColor: '#a9dfbf',
    descColor: '#cceedd',
    border: 'border-[#1e4d35]/40',
    borderSelected: 'border-[#27ae60]/70',
    glow: 'shadow-[0_0_60px_rgba(39,174,96,0.22)]',
    badge: 'bg-[#27ae60]/15 border-[#27ae60]/30',
    badgeText: 'text-white',
    Bg: GibraltarBg,
  },
];

// ── 서브 컴포넌트 ───────────────────────────────────────────────
function CapacityDots({
  capacity,
  memberCount,
  dot,
  dotFade,
  loading,
}: {
  capacity: number;
  memberCount: number | null;
  dot: string;
  dotFade: string;
  loading: boolean;
}) {
  const filled =
    memberCount !== null ? Math.min(capacity, Math.max(0, memberCount)) : 0;
  const remaining =
    memberCount !== null ? Math.max(0, capacity - memberCount) : null;

  return (
    <div className='flex items-center gap-2 mt-5'>
      <div className='flex gap-1.5'>
        {Array.from({ length: capacity }).map((_, i) => (
          <span
            key={i}
            className='block w-2 h-2 rounded-full transition-colors duration-300'
            style={{
              backgroundColor: i < filled ? dot : dotFade,
              opacity: loading ? 0.35 : i < filled ? 1 : 0.35,
            }}
          />
        ))}
      </div>
      <span
        className='text-xs tracking-widest'
        style={{ color: dot, opacity: 0.75 }}
      >
        {loading
          ? '현황 불러오는 중...'
          : remaining !== null
            ? `${remaining}명 남았습니다 · 정원 ${6}명`
            : '—'}
      </span>
    </div>
  );
}

function SeaCard({
  room,
  selected,
  onSelect,
  disabled,
  loading,
  isFull,
  memberCount,
  slotCapacity,
}: {
  room: RoomConfig;
  selected: boolean;
  onSelect: (id: Room) => void;
  disabled: boolean;
  loading: boolean;
  isFull: boolean;
  memberCount: number | null;
  slotCapacity: number;
}) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect(room.id);
      }}
      className={`
        group relative w-full rounded-2xl border text-left overflow-hidden
        transition-all duration-500
        ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}
        ${selected ? room.borderSelected : room.border}
        ${disabled ? '' : selected ? room.glow : 'hover:shadow-lg'}
        ${disabled ? '' : selected ? 'scale-[1.015]' : 'hover:scale-[1.008]'}
      `}
      aria-pressed={selected}
      aria-disabled={disabled}
    >
      {/* SVG 배경 */}
      <room.Bg />

      {/* 글래스 오버레이 */}
      <div
        className='absolute inset-0 transition-opacity duration-500'
        style={{
          background: selected ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.4)',
        }}
      />

      {isFull && !loading && (
        <div className='absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[2px]'>
          <span
            className='text-xs tracking-[0.35em] px-4 py-2 rounded-full border border-white/25 text-white/90'
            style={{
              fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            }}
          >
            정원 마감
          </span>
        </div>
      )}

      {/* 선택 링 */}
      {selected && (
        <span
          className='absolute inset-0 rounded-2xl border-2 pointer-events-none animate-pulse'
          style={{ borderColor: room.dot, opacity: 0.25 }}
        />
      )}

      {/* 콘텐츠 */}
      <div className='relative z-10 p-7'>
        {/* 선택 배지 */}
        {selected && (
          <span
            className={`absolute top-0 right-0 flex items-center gap-1.5 text-xs tracking-widest px-3 py-1 rounded-bl-xl rounded-tr-xl border ${room.badge} ${room.badgeText}`}
          >
            <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
              <path
                d='M1.5 5L4 7.5L8.5 2.5'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
            선택됨
          </span>
        )}

        <p
          className='text-xs tracking-[0.28em] mb-3 font-light'
          style={{ color: room.tagColor }}
        >
          {room.tag}
        </p>

        <h2
          className='text-4xl font-light text-white mb-1 tracking-wide transition-all duration-300 group-hover:tracking-wider'
          style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
        >
          {room.name}
        </h2>

        <p
          className='text-xs tracking-[0.22em] mb-5'
          style={{ color: room.nameEnColor }}
        >
          {room.nameEn}
        </p>

        <div
          className='h-px mb-5 transition-all duration-500 group-hover:w-16'
          style={{ width: '2rem', backgroundColor: room.dot, opacity: 0.45 }}
        />

        <div
          className='text-sm leading-relaxed space-y-0.5'
          style={{ color: room.descColor }}
        >
          {room.description.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <CapacityDots
          capacity={slotCapacity}
          memberCount={memberCount}
          dot={room.dot}
          dotFade={room.dotFade}
          loading={loading}
        />

        <span
          className={`absolute bottom-5 right-6 text-xs tracking-widest transition-opacity ${
            disabled ? 'opacity-20' : 'opacity-30 group-hover:opacity-55'
          }`}
          style={{ color: room.dot }}
        >
          {room.concept}
        </span>
      </div>
    </button>
  );
}

// ── 메인 컴포넌트 ───────────────────────────────────────────────
export function meta() {
  return [
    { title: '부기북스 - 방 선택' },
    { name: 'description', content: '방을 선택해 입주 신청합니다.' },
  ];
}

export default function RoomSelector() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const [selected, setSelected] = useState<Room | null>(null);
  const selectedRoom = ROOMS.find((r) => r.id === selected);

  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [myRoom, setMyRoom] = useState<null | {
    roomKey: RoomKey;
    roomName: string;
    role: string;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedServerRoom = useMemo(() => {
    if (!selected || !rooms) return null;
    const key = toRoomKey(selected);
    return rooms.find((r) => r.key === key) ?? null;
  }, [rooms, selected]);

  const selectedRoomFull = useMemo(() => {
    if (!selectedServerRoom) return false;
    return selectedServerRoom.memberCount >= selectedServerRoom.capacity;
  }, [selectedServerRoom]);

  useEffect(() => {
    if (!rooms || !selected) return;
    const key = toRoomKey(selected);
    const s = rooms.find((r) => r.key === key);
    if (s && s.memberCount >= s.capacity) setSelected(null);
  }, [rooms, selected]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigateHomeRememberingReturn(navigate);
      return;
    }

    const load = async () => {
      try {
        await getMe(); // 토큰 유효성/권한 확인(최소)
        const [r, mine] = await Promise.all([getRooms(), getMyRoom()]);
        setRooms(r);
        setMyRoom(mine);
      } catch (e) {
        console.error(e);
        navigateHomeRememberingReturn(navigate);
      }
    };
    void load();
  }, [navigate]);

  const canApply =
    Boolean(selected) &&
    !isApplying &&
    !myRoom &&
    rooms !== null &&
    !selectedRoomFull;

  const handleApply = async () => {
    if (!selected) return;
    if (myRoom) {
      alert(`이미 ${myRoom.roomName} 방에 속해 있습니다.`);
      return;
    }
    if (selectedRoomFull) {
      alert('선택한 방은 정원이 찼습니다. 다른 방을 선택해 주세요.');
      return;
    }
    setIsApplying(true);
    setError(null);
    try {
      const res = await applyToRoom(toRoomKey(selected));
      alert(res.message);
      try {
        setRooms(await getRooms());
      } catch {
        /* ignore */
      }
      const mine = await getMyRoom();
      setMyRoom(mine);
      navigate('/dashboard');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '신청에 실패했습니다.';
      setError(msg);
      alert(msg);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <section className='min-h-screen w-full bg-[#080c10] px-6 py-16 flex flex-col items-center'>
      <div className='mb-12 text-center'>
        <p className='text-xs tracking-[0.4em] text-white/30 mb-4 uppercase'>
          Boogibooks - Sea Project
        </p>
        <h1
          className='text-3xl md:text-4xl font-light text-white tracking-wide mb-3'
          style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
        >
          여러분이 머무를 바다를 선택하세요
        </h1>
      </div>

      <div className='w-full max-w-2xl flex flex-col gap-4'>
        {ROOMS.map((room) => {
          const srv = rooms?.find((r) => r.key === toRoomKey(room.id));
          const loading = !hydrated || rooms === null;
          const memberCount = srv?.memberCount ?? null;
          const slotCap = srv?.capacity ?? room.capacity;
          const isFull = srv != null && srv.memberCount >= srv.capacity;
          const disabled = loading || isFull;
          return (
            <SeaCard
              key={room.id}
              room={room}
              selected={selected === room.id}
              onSelect={setSelected}
              disabled={disabled}
              loading={loading}
              isFull={isFull}
              memberCount={memberCount}
              slotCapacity={slotCap}
            />
          );
        })}
      </div>

      <div className='mt-10 w-full max-w-2xl'>
        {selectedServerRoom?.introMessage?.trim() && (
          <div className='mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-5'>
            <p className='text-[11px] tracking-[0.28em] text-white/35 mb-2'>
              {selectedRoom?.name || '여기'}는 이런 분을 위한 바다입니다.
            </p>
            <p className='text-sm text-white/80 leading-relaxed whitespace-pre-wrap'>
              {selectedServerRoom.introMessage}
            </p>
          </div>
        )}
        {error && (
          <p className='text-center text-xs text-rose-300/80 mb-3 tracking-widest'>
            {error}
          </p>
        )}
        <button
          onClick={() => void handleApply()}
          disabled={!canApply}
          className={`
            w-full py-4 rounded-xl text-sm tracking-[0.25em] font-light
            transition-all duration-500 border
            ${
              canApply
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/15 hover:border-white/30 cursor-pointer'
                : 'bg-white/[0.03] border-white/[0.08] text-white/20 cursor-not-allowed'
            }
          `}
        >
          {myRoom
            ? `${myRoom.roomName} 방에 입주 완료`
            : selected
              ? selectedRoomFull
                ? '선택한 방은 정원이 찼습니다'
                : isApplying
                  ? '신청 처리 중...'
                  : `${selectedRoom?.name} — 신청하기`
              : '방을 선택해주세요'}
        </button>
        {selected && (
          <p className='text-center text-xs text-white/25 mt-3 tracking-widest'>
            신청하면 해당 방에 배정됩니다.
          </p>
        )}
      </div>
    </section>
  );
}
