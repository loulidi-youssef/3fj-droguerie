type IconProps = {
  className?: string;
};

const baseClassName = "h-4 w-4";

export const AdminIconPlus = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const AdminIconUpload = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="M12 16V5.5" />
    <path d="m7.8 9.8 4.2-4.3 4.2 4.3" />
    <path d="M5 17.7h14" />
    <path d="M5.5 20h13" />
  </svg>
);

export const AdminIconSearch = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const AdminIconFilter = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="M4 6.3h16M7.5 12h9M10 17.7h4" />
  </svg>
);

export const AdminIconProducts = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="M4.8 7.5 12 4l7.2 3.5L12 11 4.8 7.5Z" />
    <path d="M4.8 7.5V16.5L12 20l7.2-3.5V7.5" />
    <path d="M12 11v9" />
  </svg>
);

export const AdminIconCategory = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <rect x="4.5" y="4.5" width="6.8" height="6.8" rx="1.2" />
    <rect x="12.7" y="4.5" width="6.8" height="6.8" rx="1.2" />
    <rect x="4.5" y="12.7" width="6.8" height="6.8" rx="1.2" />
    <rect x="12.7" y="12.7" width="6.8" height="6.8" rx="1.2" />
  </svg>
);

export const AdminIconPrice = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="M7.3 5.2h6.2a4.2 4.2 0 1 1 0 8.4H9.2" />
    <path d="M7.3 9.4H15" />
    <path d="M9.1 13.6 15.8 19" />
  </svg>
);

export const AdminIconStock = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="M4.8 8.5h14.4v10.2H4.8z" />
    <path d="M8 8.5V6.3a4 4 0 1 1 8 0v2.2" />
    <path d="M9.2 13.6h5.6" />
  </svg>
);

export const AdminIconStatus = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <circle cx="12" cy="12" r="8" />
    <path d="m8.8 12.2 2.2 2.1 4.2-4.3" />
  </svg>
);

export const AdminIconVariants = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="M6 7.2h12M6 12h12M6 16.8h12" />
    <circle cx="8" cy="7.2" r="1.2" />
    <circle cx="16" cy="12" r="1.2" />
    <circle cx="10" cy="16.8" r="1.2" />
  </svg>
);

export const AdminIconBulk = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="M4.8 6.8h14.4M4.8 12h14.4M4.8 17.2h9.2" />
    <path d="m16 16.1 2.2 2.2 3-3.2" />
  </svg>
);

export const AdminIconText = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="M5 6.3h14M8.6 6.3V18M15.4 6.3V18" />
  </svg>
);

export const AdminIconChevronDown = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <path d="m5.5 7.5 4.5 5 4.5-5" />
  </svg>
);

export const AdminIconInfo = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    className={className ?? baseClassName}
  >
    <circle cx="12" cy="12" r="8" />
    <path d="M12 10.2v5.3M12 7.8h.01" />
  </svg>
);

