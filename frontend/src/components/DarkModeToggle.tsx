interface Props {
  dark: boolean;
  toggle: () => void;
}

export default function DarkModeToggle({ dark, toggle }: Props) {
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-lg text-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
