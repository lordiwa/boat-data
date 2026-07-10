// app/src/utils/columns.ts
//
// TASK-009: per-node-type column presets for DataTable.vue, selected by
// EntityListView.vue based on the `:type` route param. Each preset works
// over the EnrichedRow shape produced by composables/useTypeRows.ts (the
// raw node plus precomputed edge-resolved fields), not the raw GraphNode,
// so edge lookups happen once per type rather than once per cell or sort
// comparison.
import type { RouteLocationRaw } from 'vue-router';
import type { ColumnDef } from '@/types/table';
import type { EnrichedRow } from '@/composables/useTypeRows';
import type { NodeType } from '@/types/graph';
import { isPlaceholderName } from '@/utils/placeholder';
import { formatMeters, formatMoney, formatNumber, formatYear, shortHost } from '@/utils/format';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function entityLink(row: EnrichedRow): RouteLocationRaw {
  return { name: 'entity', params: { id: row.node.id } };
}

function nameColumn(opts?: { badge?: boolean }): ColumnDef<EnrichedRow> {
  const col: ColumnDef<EnrichedRow> = {
    key: 'name',
    label: 'Name',
    accessor: (row) => row.node.name,
    type: 'text',
    filterable: true,
    link: entityLink,
  };
  if (opts?.badge) {
    col.badge = (row) => (isPlaceholderName(row.node.name) ? 'unspecified' : null);
  }
  return col;
}

function websiteColumn(): ColumnDef<EnrichedRow> {
  return {
    key: 'website',
    label: 'Website',
    accessor: (row) => shortHost(str(row.node.attrs.website))?.label ?? '—',
    href: (row) => shortHost(str(row.node.attrs.website))?.href ?? null,
    type: 'text',
  };
}

function yachtColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn(),
    {
      key: 'builder',
      label: 'Builder',
      accessor: (row) => (row.builderName as string | null) ?? '—',
      sortAccessor: (row) => (row.builderName as string | null) ?? null,
      type: 'text',
      filterable: true,
    },
    {
      key: 'loa',
      label: 'LOA (m)',
      accessor: (row) => {
        const loa = asRecord(row.node.attrs.loa);
        return formatMeters(num(loa?.meters), str(loa?.raw));
      },
      sortAccessor: (row) => num(asRecord(row.node.attrs.loa)?.meters),
      type: 'number',
      filterable: true,
    },
    {
      key: 'year',
      label: 'Year',
      accessor: (row) => formatYear(num(asRecord(row.node.attrs.year)?.value)),
      sortAccessor: (row) => num(asRecord(row.node.attrs.year)?.value),
      type: 'number',
      filterable: true,
    },
    {
      key: 'owner',
      label: 'Owner',
      accessor: (row) => (row.ownerName as string | null) ?? '—',
      sortAccessor: (row) => (row.ownerName as string | null) ?? null,
      type: 'text',
      filterable: true,
    },
    {
      key: 'weekly_rate',
      label: 'Weekly rate',
      accessor: (row) => {
        const wr = asRecord(row.node.attrs.weekly_rate);
        return formatMoney(num(wr?.amount), str(wr?.currency), str(wr?.raw));
      },
      sortAccessor: (row) => num(asRecord(row.node.attrs.weekly_rate)?.amount),
      type: 'number',
      filterable: true,
    },
    {
      key: 'guests',
      label: 'Guests',
      accessor: (row) => formatNumber(num(row.node.attrs.guests)),
      sortAccessor: (row) => num(row.node.attrs.guests),
      type: 'number',
      filterable: true,
    },
  ];
}

function builderColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn({ badge: true }),
    {
      key: 'region',
      label: 'Country / Region',
      accessor: (row) => (row.region as string | null) ?? '—',
      sortAccessor: (row) => (row.region as string | null) ?? null,
      type: 'text',
      filterable: true,
    },
    {
      key: 'yachtCount',
      label: '# Yachts',
      accessor: (row) => formatNumber(row.yachtCount as number),
      sortAccessor: (row) => row.yachtCount as number,
      type: 'number',
      filterable: true,
    },
  ];
}

function clubColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn(),
    {
      key: 'location',
      label: 'Location',
      accessor: (row) => (row.location as string | null) ?? '—',
      sortAccessor: (row) => (row.location as string | null) ?? null,
      type: 'text',
      filterable: true,
    },
    {
      key: 'founded',
      label: 'Founded',
      accessor: (row) => formatYear(num(asRecord(row.node.attrs.founded)?.value)),
      sortAccessor: (row) => num(asRecord(row.node.attrs.founded)?.value),
      type: 'number',
      filterable: true,
    },
    websiteColumn(),
  ];
}

function marinaColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn(),
    {
      key: 'location',
      label: 'Location',
      accessor: (row) => (row.location as string | null) ?? '—',
      sortAccessor: (row) => (row.location as string | null) ?? null,
      type: 'text',
      filterable: true,
    },
    {
      key: 'max_loa',
      label: 'Max LOA (m)',
      accessor: (row) => {
        const loa = asRecord(row.node.attrs.max_loa);
        return formatMeters(num(loa?.meters), str(loa?.raw));
      },
      sortAccessor: (row) => num(asRecord(row.node.attrs.max_loa)?.meters),
      type: 'number',
      filterable: true,
    },
    {
      key: 'travelift',
      label: 'Travelift (t)',
      accessor: (row) => {
        const t = asRecord(row.node.attrs.travelift_tonnage);
        const tons = num(t?.tons);
        return tons !== null ? `${formatNumber(tons)} t` : (str(t?.raw) ?? '—');
      },
      sortAccessor: (row) => num(asRecord(row.node.attrs.travelift_tonnage)?.tons),
      type: 'number',
      filterable: true,
    },
    {
      key: 'berths',
      label: 'Berths',
      accessor: (row) => formatNumber(num(row.node.attrs.berths)),
      sortAccessor: (row) => num(row.node.attrs.berths),
      type: 'number',
      filterable: true,
    },
    websiteColumn(),
  ];
}

function personColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn(),
    {
      key: 'net_worth',
      label: 'Net worth',
      accessor: (row) => {
        const nw = asRecord(row.node.attrs.net_worth);
        if (nw) return formatMoney(num(nw.amount), str(nw.currency), str(nw.raw));
        return formatMoney(num(row.node.attrs.net_worth));
      },
      sortAccessor: (row) => {
        const nw = asRecord(row.node.attrs.net_worth);
        return nw ? num(nw.amount) : num(row.node.attrs.net_worth);
      },
      type: 'number',
      filterable: true,
    },
    {
      key: 'yachtCount',
      label: '# Yachts owned',
      accessor: (row) => formatNumber(row.yachtCount as number),
      sortAccessor: (row) => row.yachtCount as number,
      type: 'number',
      filterable: true,
    },
  ];
}

function companyColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn(),
    {
      key: 'kind',
      label: 'Kind',
      accessor: (row) => str(row.node.attrs.kind) ?? '—',
      sortAccessor: (row) => str(row.node.attrs.kind),
      type: 'text',
      filterable: true,
    },
    {
      key: 'base',
      label: 'Base',
      accessor: (row) => (row.base as string | null) ?? '—',
      sortAccessor: (row) => (row.base as string | null) ?? null,
      type: 'text',
      filterable: true,
    },
  ];
}

function regionColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn(),
    {
      key: 'linkedCount',
      label: '# Linked entities',
      accessor: (row) => formatNumber(row.linkedCount as number),
      sortAccessor: (row) => row.linkedCount as number,
      type: 'number',
      filterable: true,
    },
  ];
}

function engineColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn(),
    {
      key: 'tier',
      label: 'Tier',
      accessor: (row) => str(row.node.attrs.tier) ?? '—',
      sortAccessor: (row) => str(row.node.attrs.tier),
      type: 'text',
      filterable: true,
    },
    {
      key: 'power_range',
      label: 'Power range',
      accessor: (row) => str(row.node.attrs.power_range) ?? '—',
      type: 'text',
      filterable: true,
    },
  ];
}

function shipyardColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn(),
    {
      key: 'location',
      label: 'Location',
      accessor: (row) => (row.location as string | null) ?? '—',
      sortAccessor: (row) => (row.location as string | null) ?? null,
      type: 'text',
      filterable: true,
    },
    {
      key: 'facility_type',
      label: 'Facility Type',
      accessor: (row) => str(row.node.attrs.facility_type) ?? '—',
      sortAccessor: (row) => str(row.node.attrs.facility_type),
      type: 'text',
      filterable: true,
    },
    {
      key: 'max_loa',
      label: 'Max LOA (m)',
      accessor: (row) => formatMeters(num(row.node.attrs.max_loa), null),
      sortAccessor: (row) => num(row.node.attrs.max_loa),
      type: 'number',
      filterable: true,
    },
    {
      key: 'operator',
      label: 'Operator',
      accessor: (row) => (row.operatorName as string | null) ?? '—',
      sortAccessor: (row) => (row.operatorName as string | null) ?? null,
      type: 'text',
      filterable: true,
    },
    websiteColumn(),
  ];
}

function designerColumns(): ColumnDef<EnrichedRow>[] {
  return [
    nameColumn(),
    {
      key: 'yachtCount',
      label: '# Yachts designed',
      accessor: (row) => formatNumber(row.yachtCount as number),
      sortAccessor: (row) => row.yachtCount as number,
      type: 'number',
      filterable: true,
    },
  ];
}

const COLUMN_BUILDERS: Record<NodeType, () => ColumnDef<EnrichedRow>[]> = {
  yacht: yachtColumns,
  builder: builderColumns,
  club: clubColumns,
  marina: marinaColumns,
  person: personColumns,
  company: companyColumns,
  region: regionColumns,
  engine: engineColumns,
  designer: designerColumns,
  shipyard: shipyardColumns,
};

export function getColumnsForType(type: NodeType): ColumnDef<EnrichedRow>[] {
  const build = COLUMN_BUILDERS[type];
  return build ? build() : [nameColumn()];
}
