// Thin-line icons from the Reclaim prototype. Stroke follows currentColor.

const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true } as const;

export const HomeIcon = () => (
  <svg {...base} strokeLinejoin="round"><path d="M4 10.5 12 4l8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></svg>
);

export const WasteIcon = () => (
  <svg {...base} strokeLinejoin="round"><path d="M12 3.5c3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-10z" /></svg>
);

export const GaugeIcon = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size} strokeLinecap="round"><path d="M5.5 17.5a8 8 0 1 1 13 0" /><path d="M12 13.5l3.5-4" /></svg>
);

export const BillsIcon = () => (
  <svg {...base}><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10h16M9 3.5v3M15 3.5v3" strokeLinecap="round" /></svg>
);

export const CoachIcon = () => (
  <svg {...base} strokeLinejoin="round"><path d="M12 3.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z" /></svg>
);

export const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);

export const ThemeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" /></svg>
);

export const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M11 3v16M3 11h16" stroke="var(--on-amber)" strokeWidth="2" strokeLinecap="round" /></svg>
);

export const BriefcaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="3.5" y="7" width="17" height="12" rx="2.5" /><path d="M9 7V5h6v2" /></svg>
);

export const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" strokeLinecap="round" /></svg>
);

export const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M5 18h14M5 13h9M5 8h12" /></svg>
);

export const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
);

export const FlagIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M2.5 11V1.5h6.5l-1.5 2.5 1.5 2.5H2.5" /></svg>
);

export const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--on-amber)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /></svg>
);

export const UploadIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v4h14v-4" /></svg>
);

export const BigBillsIcon = () => (
  <span style={{ width: 84, height: 84, borderRadius: 42, border: '1px dashed var(--dash)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10h16M9 3.5v3M15 3.5v3" strokeLinecap="round" /></svg>
  </span>
);
