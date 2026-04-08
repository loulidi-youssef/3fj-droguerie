import type { AccountIconName } from "@/components/account/account-config";

type IconProps = {
  className?: string;
};

export const ChevronRightIcon = ({ className }: IconProps) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      className={className ?? "h-4 w-4"}
    >
      <path d="M7 4.5 12.5 10 7 15.5" />
    </svg>
  );
};

export const CheckIcon = ({ className }: IconProps) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      className={className ?? "h-4 w-4"}
    >
      <path d="m4 10.3 3.3 3.3L16 5.8" />
    </svg>
  );
};

export const QuickAddIcon = ({ className }: IconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      className={className ?? "h-4 w-4"}
    >
      <path d="M3.8 5.8h2l2 10.2h9.8l2.2-7.1H7.2" />
      <circle cx="10" cy="19" r="1.2" />
      <circle cx="17" cy="19" r="1.2" />
      <path d="M16.5 6.5v4M14.5 8.5h4" />
    </svg>
  );
};

export const AccountMenuIcon = ({
  name,
  className,
}: {
  name: AccountIconName;
  className?: string;
}) => {
  const normalizedClassName = className ?? "h-[1.15rem] w-[1.15rem]";

  if (name === "orders") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
        className={normalizedClassName}
      >
        <path d="M6.5 4.5h11a1.8 1.8 0 0 1 1.8 1.8v11.4a1.8 1.8 0 0 1-1.8 1.8h-11a1.8 1.8 0 0 1-1.8-1.8V6.3a1.8 1.8 0 0 1 1.8-1.8Z" />
        <path d="M8.5 9.2h7M8.5 12h7M8.5 14.8h4.8" />
      </svg>
    );
  }

  if (name === "favorites") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
        className={normalizedClassName}
      >
        <path d="m12 20-1-.9C6 14.8 3.2 12.2 3.2 9a4.1 4.1 0 0 1 4.2-4.2c1.8 0 3 .8 4.6 2.6 1.6-1.8 2.8-2.6 4.6-2.6A4.1 4.1 0 0 1 20.8 9c0 3.2-2.8 5.8-7.8 10.1l-1 .9Z" />
      </svg>
    );
  }

  if (name === "history") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
        className={normalizedClassName}
      >
        <path d="M4.8 12a7.2 7.2 0 1 0 2.4-5.3" />
        <path d="M4.8 4.8v3.7h3.7" />
        <path d="M12 8.3v4l2.7 1.6" />
      </svg>
    );
  }

  if (name === "addresses") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
        className={normalizedClassName}
      >
        <path d="M12 20s6-5.2 6-10.2a6 6 0 1 0-12 0C6 14.8 12 20 12 20Z" />
        <circle cx="12" cy="9.8" r="2.2" />
      </svg>
    );
  }

  if (name === "security") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
        className={normalizedClassName}
      >
        <path d="M12 4.5 5.5 7.2v5.1c0 4 2.5 6.5 6.5 7.9 4-1.4 6.5-3.9 6.5-7.9V7.2L12 4.5Z" />
        <path d="M9.6 11.8 11 13.2l3.3-3.3" />
      </svg>
    );
  }

  if (name === "notifications") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
        className={normalizedClassName}
      >
        <path d="M12 4.8a4.2 4.2 0 0 0-4.2 4.2v2.2c0 1.2-.4 2.4-1.2 3.3l-1 1.2h12.8l-1-1.2a5 5 0 0 1-1.2-3.3V9A4.2 4.2 0 0 0 12 4.8Z" />
        <path d="M10.2 17.6a1.9 1.9 0 0 0 3.6 0" />
      </svg>
    );
  }

  if (name === "language") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
        className={normalizedClassName}
      >
        <circle cx="12" cy="12" r="8.3" />
        <path d="M3.9 12h16.2M12 3.7c2 2.2 3.2 5.1 3.2 8.3S14 18 12 20.3M12 3.7c-2 2.2-3.2 5.1-3.2 8.3S10 18 12 20.3" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      className={normalizedClassName}
    >
      <path d="M9 4.8h9.2V19H9" />
      <path d="M14.5 12H4.8" />
      <path d="m7.8 9 3 3-3 3" />
    </svg>
  );
};

