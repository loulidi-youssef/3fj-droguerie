import {
  BadgeInfo,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  CopyCheck,
  Filter,
  Grid2x2,
  Layers3,
  PackageCheck,
  PackageSearch,
  Plus,
  Search,
  Type,
  Upload,
} from "lucide-react";

type IconProps = {
  className?: string;
};

const baseClassName = "h-4 w-4";

export const AdminIconPlus = ({ className }: IconProps) => <Plus className={className ?? baseClassName} aria-hidden />;

export const AdminIconUpload = ({ className }: IconProps) => (
  <Upload className={className ?? baseClassName} aria-hidden />
);

export const AdminIconSearch = ({ className }: IconProps) => (
  <Search className={className ?? baseClassName} aria-hidden />
);

export const AdminIconFilter = ({ className }: IconProps) => (
  <Filter className={className ?? baseClassName} aria-hidden />
);

export const AdminIconProducts = ({ className }: IconProps) => (
  <Boxes className={className ?? baseClassName} aria-hidden />
);

export const AdminIconCategory = ({ className }: IconProps) => (
  <Grid2x2 className={className ?? baseClassName} aria-hidden />
);

export const AdminIconPrice = ({ className }: IconProps) => (
  <CircleDollarSign className={className ?? baseClassName} aria-hidden />
);

export const AdminIconStock = ({ className }: IconProps) => (
  <PackageSearch className={className ?? baseClassName} aria-hidden />
);

export const AdminIconStatus = ({ className }: IconProps) => (
  <PackageCheck className={className ?? baseClassName} aria-hidden />
);

export const AdminIconVariants = ({ className }: IconProps) => (
  <Layers3 className={className ?? baseClassName} aria-hidden />
);

export const AdminIconBulk = ({ className }: IconProps) => (
  <CopyCheck className={className ?? baseClassName} aria-hidden />
);

export const AdminIconText = ({ className }: IconProps) => (
  <Type className={className ?? baseClassName} aria-hidden />
);

export const AdminIconChevronDown = ({ className }: IconProps) => (
  <ChevronDown className={className ?? baseClassName} aria-hidden />
);

export const AdminIconInfo = ({ className }: IconProps) => (
  <BadgeInfo className={className ?? baseClassName} aria-hidden />
);
